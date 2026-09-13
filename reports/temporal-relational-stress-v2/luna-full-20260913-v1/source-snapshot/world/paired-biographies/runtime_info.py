"""Read-only pinned code/runtime identity; never reads credentials or profiles."""
import hashlib, importlib.metadata, json, os, platform, subprocess, sys
from pathlib import Path

def runtime_info():
    root=Path(os.environ.get('HERMES_SOURCE','/Users/artem/.hermes/hermes-agent'))
    import openai, httpx, httpcore
    files=[root/p for p in [
        'run_agent.py','agent/agent_init.py','agent/system_prompt.py',
        'agent/codex_runtime.py','agent/codex_responses_adapter.py',
        'agent/chat_completion_helpers.py','agent/relay_llm.py',
        'agent/transports/codex.py','hermes_cli/runtime_provider.py','hermes_cli/config.py']]
    files += [Path(openai.__file__).parent/p for p in ['_base_client.py','_client.py']]
    files += [Path(httpx.__file__).parent/p for p in ['_client.py','_transports/default.py']]
    files += [Path(httpcore.__file__).parent/p for p in ['_sync/connection.py','_sync/connection_pool.py']]
    hashes=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
    command=lambda args:subprocess.check_output(args,text=True,timeout=10).strip()
    result={'hermes_sources':hashes,'node':command(['node','--version']),
            'swipl':command([os.environ.get('SWIPL_BIN','swipl'),'--version']),
            'python':platform.python_version(),'python_executable':sys.executable,
            'packages':{p:importlib.metadata.version(p) for p in ['openai','httpx','httpcore','jsonschema']}}
    result['fingerprint']=hashlib.sha256(json.dumps(result,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    return result

if __name__=='__main__':
    print(json.dumps(runtime_info()))
