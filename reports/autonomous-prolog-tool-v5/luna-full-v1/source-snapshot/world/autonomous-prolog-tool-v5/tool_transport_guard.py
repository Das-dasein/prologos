"""Bounded HTTP transport for an agent allowed only world_memory_query.

One no-tool turn may dispatch once. A tool-enabled turn may dispatch twice:
the initial response and one continuation after the local tool result. SDK and
HTTP retries remain disabled. Headers and credentials are never persisted.
"""
import base64
import json
import time
import httpx

ALLOWED_TOOL = "world_memory_query"

class PhysicalAttemptLimit(BaseException):
    pass

class AttemptBudget:
    def __init__(self, evidence, save, *, max_dispatches, tools_enabled, max_response_bytes=2 * 1024 * 1024):
        self.evidence, self.save = evidence, save
        self.max_dispatches, self.tools_enabled = max_dispatches, tools_enabled
        self.max_response_bytes = max_response_bytes
        evidence.update(physical_attempts=[], denied_physical_attempts=0, physical_dispatches=0)

    def begin(self, request):
        if self.evidence["physical_dispatches"] >= self.max_dispatches:
            self.evidence["denied_physical_attempts"] += 1; self.save()
            raise PhysicalAttemptLimit("physical dispatch budget exhausted")
        raw = request.read(); body = json.loads(raw); tools = body.get("tools") or []
        names = [(entry.get("function", {}).get("name") or entry.get("name")) for entry in tools if isinstance(entry, dict)]
        expected = [ALLOWED_TOOL] if self.tools_enabled else []
        if names != expected or len(tools) != len(expected):
            raise PhysicalAttemptLimit(f"wire tool surface differs from frozen allowance: {names}")
        model = self.evidence.get("requested_config", {}).get("model")
        if model and body.get("model") != model:
            raise PhysicalAttemptLimit("physical request model mismatch")
        attempt = {"number": self.evidence["physical_dispatches"] + 1, "status": "dispatching", "started_at": time.time(), "method": request.method, "endpoint": str(request.url.copy_with(query=None)), "request_body_utf8": raw.decode("utf-8"), "request_body": body, "response_chunks_base64": [], "response_bytes": 0}
        self.evidence["physical_attempts"].append(attempt); self.evidence["physical_dispatches"] += 1; self.save()
        return attempt

    def error(self, attempt, exc, status):
        attempt.update(status=status, error_type=type(exc).__name__, ended_at=time.time()); self.save()

class RecordedStream(httpx.SyncByteStream):
    def __init__(self, inner, budget, attempt): self.inner, self.budget, self.attempt = inner, budget, attempt
    def __iter__(self):
        try:
            for chunk in self.inner:
                if self.attempt["response_bytes"] + len(chunk) > self.budget.max_response_bytes:
                    self.attempt["discarded_over_limit_chunk_bytes"] = len(chunk)
                    raise PhysicalAttemptLimit("physical response exceeded recorded byte bound")
                self.attempt["response_chunks_base64"].append(base64.b64encode(chunk).decode("ascii")); self.attempt["response_bytes"] += len(chunk); self.budget.save(); yield chunk
            self.attempt.update(status="completed", ended_at=time.time()); self.budget.save()
        except GeneratorExit:
            self.attempt.update(status="closed", ended_at=time.time()); self.budget.save(); raise
        except BaseException as exc:
            self.budget.error(self.attempt, exc, "stream_error"); raise
    def close(self):
        self.inner.close()
        if self.attempt["status"] == "streaming": self.attempt.update(status="closed", ended_at=time.time()); self.budget.save()

class GuardedTransport(httpx.BaseTransport):
    def __init__(self, budget): self.budget, self.inner = budget, httpx.HTTPTransport(retries=0)
    def handle_request(self, request):
        attempt = self.budget.begin(request)
        try:
            response = self.inner.handle_request(request); attempt.update(status="streaming", http_status=response.status_code); self.budget.save(); response.stream = RecordedStream(response.stream, self.budget, attempt); return response
        except BaseException as exc: self.budget.error(attempt, exc, "connection_error"); raise
    def close(self): self.inner.close()
