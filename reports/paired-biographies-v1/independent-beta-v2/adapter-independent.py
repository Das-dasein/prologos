"""Independent offline test of exact ControlledAgent class extracted from adapter AST."""
import ast,contextlib,io,json,os,pathlib,sys,tempfile,subprocess
from unittest.mock import patch
p=pathlib.Path(__file__).resolve().parent;root=pathlib.Path(json.loads((p/'clean-copy.json').read_text())['root']);pb=root/'world/paired-biographies'
sys.path.insert(0,str(pb));sys.path.insert(0,'/Users/artem/.hermes/hermes-agent')
from transport_guard import AttemptBudget,GuardedTransport,PhysicalAttemptLimit
import httpx
out={}
with tempfile.TemporaryDirectory(prefix='beta-adapter-v2-') as temporary:
 os.environ['HERMES_HOME']=temporary;os.environ['TERMINAL_CWD']=temporary
 with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
  from run_agent import AIAgent
  tree=ast.parse((pb/'adapter.py').read_text());cls=next(n for n in ast.walk(tree) if isinstance(n,ast.ClassDef) and n.name=='ControlledAgent')
  ev={'requested_config':{'model':'gpt-5.6-luna'}};budget=AttemptBudget(ev,lambda:None);physical=[]
  def endpoint(request):
   physical.append(request)
   return httpx.Response(200,headers={'content-type':'application/json'},stream=httpx.ByteStream(json.dumps({'id':'beta-offline','object':'response','status':'completed','model':'gpt-5.6-luna','output':[]}).encode()))
  ns={'AIAgent':AIAgent,'httpx':httpx,'GuardedTransport':lambda b:GuardedTransport(b,httpx.MockTransport(endpoint)),'budget':budget,'req':{'config':{'timeout_ms':1000}}}
  exec(compile(ast.fix_missing_locations(ast.Module(body=[cls],type_ignores=[])),str(pb/'adapter.py'),'exec'),ns)
  a=ns['ControlledAgent'].__new__(ns['ControlledAgent']);a.provider='openai-codex';a._client_log_context=lambda:'offline independent beta'
  for i in range(2):
   client=a._create_openai_client({'api_key':'fake-local-key','base_url':'https://offline.invalid/v1','max_retries':2},reason='beta-recreation',shared=True)
   assert client.max_retries==0
   try:
    client.responses.create(model='gpt-5.6-luna',input='offline input')
    assert i==0
   except PhysicalAttemptLimit:
    assert i==1
   finally:client.close()
  assert len(physical)==1 and ev['denied_physical_attempts']==1
  out['exact_adapter_client_override']={'network_used':False,'physical_endpoint_calls':len(physical),'evidence':ev,'sdk_retries_enforced':0}
  ev2={};b=AttemptBudget(ev2,lambda:None,max_response_bytes=3)
  with httpx.Client(transport=GuardedTransport(b,httpx.MockTransport(lambda req:httpx.Response(200,stream=httpx.ByteStream(b'1234'))))) as client:
   try:client.post('https://offline.invalid',json={'model':'fixture'});raise AssertionError('byte bound not enforced')
   except PhysicalAttemptLimit:pass
  assert ev2['physical_attempts'][0]['status']=='stream_error'
  out['response_byte_limit']={'network_used':False,'evidence':ev2}
 env=dict(os.environ);env['HERMES_PYTHON']='/Users/artem/.hermes/hermes-agent/venv/bin/python'
 request={'system':'offline system','user':'offline user','config':{'runtime_fingerprint':'wrong','model':'gpt-5.6-luna'},'evidence_path':str(p/'drift-evidence.json')}
 r=subprocess.run(['/Users/artem/.hermes/hermes-agent/venv/bin/python',str(pb/'adapter.py')],input=json.dumps(request),text=True,capture_output=True,env=env)
 evidence=json.loads((p/'drift-evidence.json').read_text());assert evidence['error']['type']=='RuntimeDrift';assert evidence['inference_calls']==0
 out['runtime_drift']={'status':evidence['status'],'error':evidence['error'],'inference_calls':0,'exit_code':r.returncode}
(p/'adapter-independent.json').write_text(json.dumps(out,indent=2));print('Exact adapter class, recreated clients, byte limit, and runtime drift probes passed; no network')
