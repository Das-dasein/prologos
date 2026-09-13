"""One physical HTTP dispatch shared by every inference client in a call.

The underlying transport is HTTPTransport(retries=0). The SDK is also configured
with max_retries=0. Even if an outer transport/SDK loop retries, handle_request
blocks before a second underlying dispatch. No request/response headers recorded.
"""
import base64
import json
import time
import httpx

class PhysicalAttemptLimit(BaseException):
    """Bypasses ordinary SDK/Hermes retry handlers without another dispatch."""

class AttemptBudget:
    def __init__(self, evidence, save, max_response_bytes=2 * 1024 * 1024):
        self.evidence, self.save = evidence, save
        self.max_response_bytes = max_response_bytes
        evidence['physical_attempts'] = []
        evidence['denied_physical_attempts'] = 0
        evidence['physical_dispatches'] = 0

    def begin(self, request):
        if self.evidence['physical_dispatches'] >= 1:
            self.evidence['denied_physical_attempts'] += 1
            self.save()
            raise PhysicalAttemptLimit('second physical HTTP dispatch blocked before transport')
        raw = request.read()
        body = json.loads(raw)
        if body.get('tools'):
            raise PhysicalAttemptLimit('physical request exposes tools')
        expected_model = self.evidence.get('requested_config', {}).get('model')
        if expected_model and body.get('model') != expected_model:
            raise PhysicalAttemptLimit('physical request model mismatch')
        attempt = {'number':1, 'status':'dispatching', 'started_at':time.time(),
                   'method':request.method, 'endpoint':str(request.url.copy_with(query=None)),
                   'request_body_utf8':raw.decode('utf-8'), 'request_body':body,
                   'response_chunks_base64':[], 'response_bytes':0}
        self.evidence['physical_attempts'].append(attempt)
        self.evidence['physical_dispatches'] += 1
        self.save()
        return attempt

    def error(self, attempt, exc, status):
        # Error type and lifecycle phase are sufficient; arbitrary exception text
        # may contain headers/credentials and is never copied from the transport.
        attempt.update(status=status,error_type=type(exc).__name__,ended_at=time.time())
        self.save()

class RecordedStream(httpx.SyncByteStream):
    def __init__(self, inner, budget, attempt):
        self.inner, self.budget, self.attempt = inner, budget, attempt

    def __iter__(self):
        try:
            for chunk in self.inner:
                if self.attempt['response_bytes'] + len(chunk) > self.budget.max_response_bytes:
                    self.attempt['discarded_over_limit_chunk_bytes'] = len(chunk)
                    raise PhysicalAttemptLimit('physical response exceeded recorded byte bound')
                self.attempt['response_chunks_base64'].append(base64.b64encode(chunk).decode('ascii'))
                self.attempt['response_bytes'] += len(chunk)
                self.budget.save()
                yield chunk
            self.attempt.update(status='completed',ended_at=time.time())
            self.budget.save()
        except GeneratorExit:
            # SSE clients may stop at a terminal event before requesting EOF.
            # This is a close, not a transport failure; the adapter separately
            # requires an actual completed provider response.
            self.attempt.update(status='closed',ended_at=time.time())
            self.budget.save()
            raise
        except BaseException as exc:
            self.budget.error(self.attempt, exc, 'stream_error')
            raise

    def close(self):
        self.inner.close()
        if self.attempt['status']=='streaming':
            self.attempt.update(status='closed',ended_at=time.time())
            self.budget.save()

class GuardedTransport(httpx.BaseTransport):
    def __init__(self, budget, inner=None):
        self.budget = budget
        self.inner = inner if inner is not None else httpx.HTTPTransport(retries=0)

    def handle_request(self, request):
        attempt = self.budget.begin(request)
        try:
            response = self.inner.handle_request(request)
            attempt.update(status='streaming',http_status=response.status_code)
            self.budget.save()
            response.stream = RecordedStream(response.stream,self.budget,attempt)
            return response
        except BaseException as exc:
            self.budget.error(attempt,exc,'connection_error')
            raise

    def close(self):
        self.inner.close()
