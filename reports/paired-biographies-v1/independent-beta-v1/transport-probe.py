"""Offline fault injection into installed Hermes transport; no provider/network call."""
import sys,json
from pathlib import Path
from types import SimpleNamespace
sys.path.insert(0,'/Users/artem/.hermes/hermes-agent')
from agent import codex_runtime,relay_llm
attempts=[]
class Stream:
 def __iter__(self):return iter([])
 def close(self):pass
 final_response=None
def create(**kwargs):
 attempts.append(kwargs)
 if len(attempts)==1:raise ConnectionError('independent beta injected connection failure')
 return Stream()
def relay(kwargs,opener,**rest):return opener(kwargs)
relay_llm.stream=relay
codex_runtime._consume_codex_event_stream=lambda *args,**kwargs:SimpleNamespace(status='completed',output_text='synthetic fixture response')
a=SimpleNamespace(_interrupt_requested=False,_client_log_context=lambda:'offline beta stub',provider='openai-codex',session_id='beta-offline',_ensure_primary_openai_client=lambda **kw:SimpleNamespace(responses=SimpleNamespace(create=create)))
count=0
def adapter_counted_entry(kwargs):
 global count
 count+=1
 return codex_runtime.run_codex_stream(a,kwargs)
r=adapter_counted_entry({'model':'gpt-5.6-luna'})
print(json.dumps({'test':'real installed Hermes internal retry with mocked network endpoint','network_used':False,'adapter_inference_calls':count,'physical_create_attempts':len(attempts),'final_status':r.status,'requests':attempts},indent=2))
