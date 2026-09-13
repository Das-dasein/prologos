# Engineering alpha repair receipt v2 — R1–R3

Scope: beta-review.md and gamma-clarification-r1.md/gamma-repair-dispatch.md.
No gold modification, model calls, subagents, commits or global configuration
changes. Previous Sol/Luna artifacts remain unchanged. This is prospective
measurement correction before the full pilot, not model-output tuning.

## R1: question policy

BEHAVIOR_SYSTEM now admits an unknown root literal with no active definition as
its own missing plan. Rule plans require every remaining gap to match an
eligible question (or explicit opposite). Known/conflicted literals, unavailable
questions and question cost/count limits remain excluded. Behavior prompt
version is paired-behavior-v2. Actual-checker tests cover p06_b/p07_b/p08_b root
plans, p01_a rule plan, p12_a unaskable unknown, p02_b contradiction and p03_b raw
conflict. Gold unchanged.

## R2: extraction grammar and canonicalization

canonicalize.pl is loaded alongside real world/checker.pl and reuses its
one_term/clause_term predicates. It never consults candidate text. The original
string is validated before parsed head/body serialization and variable numbering.
Grammar/vocabulary/arity/safety/one-clause errors receive explicit per-predicted
validation failures and remain in denominators. Token boundaries, quoted atom
identity, shared bindings and anonymous variables are preserved. Harmless
spacing/alpha-renaming matches. Beta's three exact malformed whitespace probes,
unsafe rules, anonymous head variables, unsupported operators, undeclared
predicates and extra clauses cannot get exact credit. Extraction score version
is paired-extraction-score-v2; no prior score is overwritten.

## R3: physical dispatch and provenance

transport_guard.py intercepts httpx.BaseTransport.handle_request before the
underlying transport, with a shared AttemptBudget for every OpenAI client built
by AIAgent._create_openai_client. SDK max_retries=0; HTTPTransport(retries=0).
A second attempted dispatch raises a BaseException guard before network, even
if installed Hermes or a misconfigured SDK retries. Exact request bytes/body,
HTTP status, streamed response chunks (base64), terminal/close/error phase,
physical count and denied retries are retained without headers/credentials.
Normal SSE terminal consumption may close before HTTP EOF: this is recorded as
closed, and the adapter additionally requires an actual completed provider
response. A midstream error is never converted to success.

Offline probes use the real installed Hermes retry loop and actual OpenAI SDK
with MockTransport. Connection and midstream failures show exactly one fake
endpoint dispatch, explicit first-attempt failure/partial bytes, then blocked
second attempt. SDK max_retries=2 fault regression is blocked too. Ordinary
completion and shared budget across recreated clients pass. Probe responses are
synthetic test data, not model evidence. Historical smoke inference_calls only
counted method entry; physical attempts cannot be certified retroactively.

runtime_info.py pins 16 relevant installed Hermes/SDK/httpx/httpcore source
hashes, package versions, Node v24.7.0, Python3.11.13 and SWI10.0.2. Report runtime
fingerprint is checked again in each adapter before inference. Actual wire
sampling fields and unavailable context/output caps are explicit. Requested4096
output tokens are still not a Codex-enforced cap. Outer timeout120s, physical
response2MiB and total evidence8MiB remain bounded; atomic evidence saves retain
last complete receipt on process termination.

## Verification and reproduction

`reports/paired-biographies-v1/alpha-repair-v2/tests.txt`: 17/17 Node tests and
5/5 offline transport tests pass. `offline/report.json`: 24/24 actual gold
journal/status/proof/policy checks pass, behavior/extraction not_run.
`transport-probes.json`: per-attempt offline fault evidence and runtime pins.
No live/model work was run for this repair.

```sh
npm run test:paired-biographies
node world/paired-biographies/run.cjs offline --model gpt-5.6-luna --out reports/paired-biographies-v1/offline-review-v2
/Users/artem/.hermes/hermes-agent/venv/bin/python world/paired-biographies/test_transport.py --report reports/paired-biographies-v1/transport-review-v2.json
```

After fresh beta recheck only:

```sh
node world/paired-biographies/run.cjs live --pairs all --extraction all --model gpt-5.6-luna --out reports/paired-biographies-v1/luna-full-review-v2
```

Limits: repaired live integration is not yet established; tests use an explicitly
mocked endpoint/parser sink to exercise installed retry behavior. Human semantic
approval pending. P09 behavioral distractor intervention is absent after gold
projection; only extraction receives it. CDR memory benefit remains indeterminate.
