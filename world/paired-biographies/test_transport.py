"""Offline fault probes. Installed Hermes/SDK, fake endpoint, no network."""
import json, os, sys, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import httpx, openai
from transport_guard import AttemptBudget, GuardedTransport, PhysicalAttemptLimit
sys.path.insert(0,os.environ.get('HERMES_SOURCE','/Users/artem/.hermes/hermes-agent'))
from agent import codex_runtime, relay_llm

PROBES=[]
SSE=b'data: {"type":"response.output_text.delta","delta":"offline fixture"}\n\ndata: [DONE]\n\n'
class Midstream(httpx.SyncByteStream):
    def __iter__(self):
        yield b'data: {"type":"response.output_text.delta","delta":"partial fixture"}\n\n'
        raise httpx.RemoteProtocolError('offline injected stream failure')
    def close(self): pass

class TransportTests(unittest.TestCase):
    def exercise(self, fault, sdk_retries=0, use_hermes=True):
        evidence={'requested_config':{'model':'gpt-5.6-luna'}}
        saves=[];physical=[]
        def save():saves.append(json.loads(json.dumps(evidence)))
        def endpoint(request):
            physical.append(request.content)
            if fault=='connection':raise httpx.ConnectError('offline injected connection failure',request=request)
            if fault=='midstream':return httpx.Response(200,headers={'content-type':'text/event-stream'},stream=Midstream())
            return httpx.Response(200,headers={'content-type':'text/event-stream'},stream=httpx.ByteStream(SSE))
        budget=AttemptBudget(evidence,save)
        client=openai.OpenAI(api_key='offline-test-token',base_url='https://offline.invalid/v1',max_retries=sdk_retries,http_client=httpx.Client(transport=GuardedTransport(budget,httpx.MockTransport(endpoint))))
        error=None;result=None
        try:
            if use_hermes:
                # Preserve the installed retry loop. The endpoint is a real SDK over
                # MockTransport; translating its connection wrapper exposes the
                # ConnectionError branch beta independently demonstrated.
                create=client.responses.create
                def surfaced_create(**kwargs):
                    try:return create(**kwargs)
                    except openai.APIConnectionError as exc:raise ConnectionError('offline connection surfaced to Hermes') from exc
                agent=SimpleNamespace(_interrupt_requested=False,_client_log_context=lambda:'offline probe',provider='openai-codex',session_id='offline-probe',_ensure_primary_openai_client=lambda **kw:SimpleNamespace(responses=SimpleNamespace(create=surfaced_create)))
                def consume(stream,**kwargs):
                    list(stream) # consume actual SDK SSE iterator, including injected faults
                    return SimpleNamespace(status='completed',output_text='offline fixture')
                with patch.object(relay_llm,'stream',lambda kwargs,opener,**rest:opener(kwargs)),patch.object(codex_runtime,'_consume_codex_event_stream',consume):
                    result=codex_runtime.run_codex_stream(agent,{'model':'gpt-5.6-luna','input':'offline fixture'})
            else:
                result=list(client.responses.create(model='gpt-5.6-luna',input='offline fixture',stream=True))
        except BaseException as exc:error=type(exc).__name__
        finally:client.close()
        PROBES.append({'fault':fault,'sdk_max_retries':sdk_retries,'installed_hermes_transport':use_hermes,'network_used':False,'physical_endpoint_calls':len(physical),'error':error,'evidence':evidence})
        self.assertEqual(len(physical),1)
        self.assertEqual(evidence['physical_dispatches'],1)
        self.assertEqual(len(evidence['physical_attempts']),1)
        self.assertEqual(evidence['physical_attempts'][0]['request_body']['model'],'gpt-5.6-luna')
        self.assertNotIn('offline-test-token',json.dumps(evidence))
        self.assertTrue(saves)
        if fault:
            self.assertEqual(error,'PhysicalAttemptLimit')
            self.assertEqual(evidence['denied_physical_attempts'],1)
            self.assertIn(evidence['physical_attempts'][0]['status'],['connection_error','stream_error'])
        else:
            self.assertIsNone(error)
            self.assertEqual(evidence['denied_physical_attempts'],0)
            self.assertIn(evidence['physical_attempts'][0]['status'],['completed','closed'])
        return evidence

    def test_installed_transport_completion(self):self.exercise(None)
    def test_installed_transport_connection_retry_blocked(self):self.exercise('connection')
    def test_installed_transport_midstream_retry_blocked(self):
        evidence=self.exercise('midstream')
        self.assertGreater(evidence['physical_attempts'][0]['response_bytes'],0)
        self.assertTrue(evidence['physical_attempts'][0]['response_chunks_base64'])
    def test_sdk_retry_blocked_even_if_sdk_configuration_regresses(self):self.exercise('connection',sdk_retries=2,use_hermes=False)
    def test_budget_shared_across_new_clients(self):
        evidence={};budget=AttemptBudget(evidence,lambda:None)
        physical=[]
        def endpoint(request):physical.append(request);return httpx.Response(200,content=b'{}')
        for n in range(2):
            with httpx.Client(transport=GuardedTransport(budget,httpx.MockTransport(endpoint))) as client:
                if n==0:client.post('https://offline.invalid',json={'model':'fixture'})
                else:
                    with self.assertRaises(PhysicalAttemptLimit):client.post('https://offline.invalid',json={'model':'fixture'})
        self.assertEqual(len(physical),1)

if __name__=='__main__':
    report=None
    if '--report' in sys.argv:
        n=sys.argv.index('--report');report=Path(sys.argv[n+1]);del sys.argv[n:n+2]
        if report.exists():raise RuntimeError('probe report already exists')
    outcome=unittest.main(verbosity=2,exit=False)
    if report:
        from runtime_info import runtime_info
        report.parent.mkdir(parents=True,exist_ok=True)
        report.write_text(json.dumps({'measurement':'offline transport fault probes only; synthetic responses are not model evidence','runtime':runtime_info(),'tests_run':outcome.result.testsRun,'success':outcome.result.wasSuccessful(),'probes':PROBES},indent=2)+'\n')
    sys.exit(0 if outcome.result.wasSuccessful() else 1)
