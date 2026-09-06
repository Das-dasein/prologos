# Beta review r1 — issue #54 Codex exec provider

## Decision: REVISE

The alpha transport is structurally close to the scaffold: the inspected
commit is `4387351bbef7cb71edc80d1460ec21d76e8c244d`, `codex exec` was not
run, and the fake-only positive and negative paths retain local evidence and
fail closed for malformed prompt/model/final-output/usage inputs.  However,
the selected provider is not bound to the supplied immutable config.  A
configuration that explicitly says `provider: "openai-api"` is accepted by
`prepareCodexExecAnsweringRun({ provider: "codex-exec", ... })`; it creates a
Codex adapter rather than rejecting the mismatch.  `requireWireConfig` copies
but never checks that extra field.  This violates the requested explicit
provider selection/fail-closed configuration boundary and leaves an ambiguous
record if a future CDR config pins a provider.

## Finding

### F-1 — config/provider mismatch is accepted (REVISE)

`trusted-proof-answering.js:38-46` chooses the Codex transport solely from the
caller's `provider` argument.  `trusted-proof-preflight.js:44-52` permits and
copies unknown config keys, so a conflicting `config.provider` is silently
ignored.  The independent fake-only probe constructed a complete immutable
config with `provider: "openai-api"` and called
`prepareCodexExecAnsweringRun` with `provider: "codex-exec"`; preparation
succeeded and returned `{ provider: "codex-exec" }` without spawning.

Repair: define the configuration/provider rule explicitly.  If `provider` is
present in this bridge config, require it to equal the selected provider before
making the raw directory or constructing either adapter (and add symmetric
negative tests for both `openai-api` and `codex-exec`).  If the intended
contract is a config that contains no provider field until CDR v8, reject a
present provider field rather than silently accepting it.  Preserve the CLI
flag as the explicit selection; do not infer a provider from a model or other
field.

## Verified evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| No real execution | PASS | All exercised paths used injected `spawnImpl`; no `codex exec`, credential, auth inspection, or model call was made. |
| Explicit live gate / model / sealed prompt | PASS | Codex preparation rejects missing opt-in before construction; fake negative probe rejects blank model at construction and blank prompt before spawn. |
| Command shape | PASS | Fake transport observed `exec --ephemeral --sandbox read-only --json --model MODEL --output-schema FILE --output-last-message FILE PROMPT`; the sealed prompt is the final and sole task argument. |
| Final output / raw evidence | PASS | Schema requires exactly nonempty `answer`; fake output with an extra property was rejected.  Schema, final output, JSONL stdout, and stderr are local exclusive files. |
| Native usage | PASS | Only exactly one `turn.completed` event is accepted; native integral input/output counters are required and an optional total must reconcile.  Missing counters and irreconcilable total were rejected. |
| OpenAI v7 transport | PASS | `git show`/`cmp` confirmed `providers/openai-answering.js` is byte-identical to the parent commit; existing OpenAI focused tests remain green. |
| CDR boundary | PASS | Diff touches no v7 receipt intake, collector, dataset, Prolog/query/scorer, slot registry, or CDR result.  Local metadata remains `not-a-cdr-receipt-v2`. |
| Provider/config binding | FAIL | F-1: a conflicting `config.provider` is accepted, with no pre-spawn failure. |

## Commands run

- `node test-trusted-proof-answering.js` — PASS; fake OpenAI and fake Codex
  transport only.
- Independent inline Node fake-spawn negative probe — PASS: invalid JSONL,
  missing/reconciled usage, blank model/prompt, and extra final-output property
  fail closed; no spawn for invalid prompt/model.
- Independent inline Node mismatch probe — reproduced F-1: explicit
  `config.provider: "openai-api"` is accepted for `codex-exec` preparation.
- `npm test` — PASS (all seven registered suites).
- `git diff --check 4387351^ 4387351` — PASS.

This review creates no CDR receipt, effectiveness claim, provider result, raw
live output, registry mutation, merge, PR, or authorization to run Codex.
