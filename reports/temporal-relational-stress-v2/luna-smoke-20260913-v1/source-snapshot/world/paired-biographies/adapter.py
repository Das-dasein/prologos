"""Fresh installed Hermes AIAgent, one inference and zero tool capabilities.
Credentials are resolved in memory before switching to a temporary HERMES_HOME.
Only synthetic request/response bodies are persisted; never headers or API keys.
"""
import contextlib, copy, io, json, os, sys, tempfile, uuid, signal, time
from pathlib import Path
from transport_guard import AttemptBudget, GuardedTransport
import httpx
from runtime_info import runtime_info

HERMES = Path(os.environ.get('HERMES_SOURCE', '/Users/artem/.hermes/hermes-agent'))
sys.path.insert(0, str(HERMES))

def jsonable(value):
    if hasattr(value, 'model_dump'):
        return jsonable(value.model_dump())
    if isinstance(value, dict):
        return {str(k): jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, '__dict__'):
        return jsonable(vars(value))
    raise TypeError('unsupported evidence type: ' + type(value).__name__)

class OneInferenceLimit(BaseException):
    pass

def main():
    req = json.load(sys.stdin)
    evidence_path = Path(req['evidence_path']).resolve()
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence = {'status': 'starting', 'inference_calls': 0, 'tools': [], 'api_requests': [], 'api_responses': [], 'session_id': str(uuid.uuid4()), 'started_at': time.time(), 'requested_config': req['config'], 'prompt': {'system': req['system'], 'user': req['user']}}
    def save():
        encoded = json.dumps(evidence, ensure_ascii=False, indent=2) + '\n'
        if len(encoded.encode('utf-8')) > 8 * 1024 * 1024:
            raise RuntimeError('artifact output exceeds 8 MiB')
        temporary = evidence_path.with_suffix('.json.tmp')
        temporary.write_text(encoded)
        temporary.replace(evidence_path)
    evidence['runtime_identity'] = runtime_info()
    if evidence['runtime_identity']['fingerprint'] != req['config'].get('runtime_fingerprint'):
        evidence['status'] = 'failed'
        evidence['error'] = {'type':'RuntimeDrift','message':'installed runtime differs from run-start pin'}
        save()
        print(json.dumps({'status':'failed','evidence_path':str(evidence_path)}))
        return
    save()
    captured = io.StringIO()
    try:
        with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
            # Bootstrap only provider/auth resolution from the installed environment.
            from hermes_cli.config import load_config
            from hermes_cli.runtime_provider import resolve_runtime_provider
            load_config()
            runtime = resolve_runtime_provider(requested=req['config']['provider'], target_model=req['config']['model'])
            with tempfile.TemporaryDirectory(prefix='paired-hermes-') as directory:
                home = Path(directory) / 'home'; work = Path(directory) / 'work'
                home.mkdir(); work.mkdir()
                os.environ['HERMES_HOME'] = str(home)
                os.environ['TERMINAL_CWD'] = str(work)
                os.environ['HERMES_SESSION_ID'] = evidence['session_id']
                os.chdir(work)
                # Minimal local configuration, never copies user profile or memories.
                (home / 'config.yaml').write_text('memory:\n  memory_enabled: false\n  user_profile_enabled: false\ncompression:\n  enabled: false\nagent:\n  max_iterations: 1\n  max_retries: 0\n')
                from run_agent import AIAgent
                budget = AttemptBudget(evidence, save)
                class ControlledAgent(AIAgent):
                    def _create_openai_client(self, client_kwargs, *, reason, shared):
                        kwargs = dict(client_kwargs)
                        kwargs['max_retries'] = 0
                        kwargs['http_client'] = httpx.Client(transport=GuardedTransport(budget), follow_redirects=False, trust_env=False, timeout=req['config']['timeout_ms']/1000)
                        client = super()._create_openai_client(kwargs, reason=reason, shared=shared)
                        if client.max_retries != 0:
                            raise RuntimeError('SDK retries must be zero')
                        return client
                evidence['dispatch_policy'] = {'sdk_max_retries':0,'http_transport_retries':0,'physical_attempt_limit':1,'response_byte_limit':budget.max_response_bytes,'headers_recorded':False}
                agent = ControlledAgent(api_key=runtime.get('api_key'), base_url=runtime.get('base_url'), provider=runtime.get('provider'), api_mode=runtime.get('api_mode'), model=req['config']['model'], enabled_toolsets=[], skip_memory=True, skip_context_files=True, load_soul_identity=False, session_db=None, session_id=evidence['session_id'], max_iterations=1, max_tokens=req['config']['max_tokens'], reasoning_config={'effort':req['config']['reasoning_effort']}, fallback_model=None, quiet_mode=True, save_trajectories=False, checkpoints_enabled=False)
                evidence['tools'] = jsonable(agent.tools)
                if agent.tools:
                    raise RuntimeError('isolation: AIAgent tools must be empty')
                if getattr(agent,'memory_store',None) is not None:
                    raise RuntimeError('isolation: unexpected built-in memory store')
                evidence['effective_config'] = {k:jsonable(getattr(agent,k,None)) for k in ['model','provider','api_mode','max_tokens','max_iterations','reasoning_config','skip_context_files','skip_memory','context_length']}
                evidence['isolation'] = {'hermes_home':str(home),'cwd':str(work),'tools_empty':True,'skip_memory':True,'skip_context_files':True,'load_soul_identity':False,'session_db':None,'fresh_process_pid':os.getpid(),'config_text':(home/'config.yaml').read_text()}
                # Measurement repair v1.0.1: suppress dynamic host/date/profile metadata.
                # The policy text itself is unchanged from prompt v1.
                agent._build_system_prompt = lambda system_message=None: req['system']
                evidence['system_prompt_assembly'] = 'exact frozen harness system, AIAgent assembly hook overridden; no host metadata'
                original_build = agent._build_api_kwargs
                def build(messages, *args, **kwargs):
                    expected = [{'role':'system','content':req['system']},{'role':'user','content':req['user']}]
                    if messages != expected:
                        raise RuntimeError('isolation: actual messages differ from exact frozen system/user inputs')
                    evidence['model_messages'] = jsonable(copy.deepcopy(messages))
                    value = original_build(messages, *args, **kwargs)
                    evidence['built_api_body'] = jsonable(copy.deepcopy(value))
                    save()
                    return value
                agent._build_api_kwargs = build
                # Actual Codex wire body and response before AIAgent normalization.
                if agent.api_mode != 'codex_responses':
                    raise RuntimeError('This pinned adapter supports codex_responses only')
                original_stream = agent._run_codex_stream
                def stream(api_kwargs, *args, **kwargs):
                    if evidence['inference_calls'] >= 1:
                        raise OneInferenceLimit('more than one inference requested')
                    if api_kwargs.get('tools'):
                        raise RuntimeError('isolation: wire tools must be absent/empty')
                    evidence['inference_calls'] += 1
                    evidence['api_requests'].append(jsonable(copy.deepcopy(api_kwargs)))
                    evidence['effective_output_token_cap'] = api_kwargs.get('max_output_tokens')
                    evidence['settings_availability'] = {'temperature':api_kwargs.get('temperature'),'top_p':api_kwargs.get('top_p'),'context_ceiling':None,'output_token_cap':api_kwargs.get('max_output_tokens'),'sampling_defaults':'unavailable when absent on wire','reasoning':api_kwargs.get('reasoning')}
                    evidence['wire_model'] = api_kwargs.get('model')
                    if evidence['wire_model'] != req['config']['model']:
                        raise RuntimeError('model route mismatch')
                    save()
                    result = original_stream(api_kwargs, *args, **kwargs)
                    evidence['api_responses'].append(jsonable(result))
                    evidence['reported_response_model'] = jsonable(result).get('model')
                    evidence['provider_terminal_status'] = jsonable(result).get('status')
                    save()
                    return result
                agent._run_codex_stream = stream
                # Prevent fallback network dispatch bypassing the counted path.
                def deny_fallback(*args, **kwargs):
                    raise OneInferenceLimit('stream fallback disabled by one-call contract')
                agent._run_codex_create_stream_fallback = deny_fallback
                result = agent.run_conversation(req['user'], system_message=req['system'], conversation_history=[])
                evidence['result'] = jsonable(result)
                evidence['final_response'] = result.get('final_response','')
                evidence['usage'] = {k:v for k,v in evidence['result'].items() if 'token' in k or 'usage' in k or 'cost' in k}
                physical_ok = evidence.get('physical_dispatches') == 1 and evidence['physical_attempts'][0]['status'] in ['completed','closed'] and evidence.get('provider_terminal_status') == 'completed' and evidence['denied_physical_attempts'] == 0
                evidence['status'] = 'failed' if result.get('failed') or not physical_ok else 'ok'
    except BaseException as exc:
        evidence['status'] = 'failed'
        # Error message can include provider diagnostics. Redact known credential strings.
        message = str(exc)
        if 'runtime' in locals():
            secret = runtime.get('api_key')
            if secret:
                message = message.replace(secret,'[REDACTED]')
        evidence['error'] = {'type':type(exc).__name__, 'message':message}
    finally:
        # Generic Hermes stdout can include private bootstrap metadata; do not persist it.
        evidence['bootstrap_log_retained'] = False
        evidence['ended_at'] = time.time()
        save()
    print(json.dumps({'status':evidence['status'], 'evidence_path':str(evidence_path)}))

if __name__ == '__main__':
    if sys.argv[1:] == ['--config']:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            from hermes_cli.config import load_config
            cfg = load_config()
        model = cfg.get('model') or {}
        print(json.dumps({'model':model if isinstance(model,str) else model.get('default') or model.get('model'), 'provider':'openai-codex'}))
    else:
        main()
