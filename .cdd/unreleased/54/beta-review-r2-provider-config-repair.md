# Beta review R2 — issue #54 provider/config repair

## Decision: GO

Reviewed alpha repair commit
`792ad0800981e256f135b88bfac956eac815c081` independently against the Gamma
scaffold, Gamma R1 repair request, and Beta R1 finding.  The repair implements
the required narrow rule: after immutable-config shape/binding validation, but
before fresh raw-directory validation/creation and provider construction, an
*own* `config.provider` must equal the explicitly selected provider.  A
historical v7 OpenAI config with no own `provider` remains accepted.

## Verification

| Boundary | Result | Evidence |
| --- | --- | --- |
| Own-property mismatch, OpenAI selection | PASS | Independent fake-only probe supplied own `provider: "codex-exec"` to selected `openai-api`, with deliberately invalid sampling after the intended gate.  It threw `config.provider must match selected provider`; the raw directory was absent and the injected client factory count was zero. |
| Own-property mismatch, Codex selection | PASS | Independent fake-only probe supplied own `provider: "openai-api"` to selected `codex-exec`.  It threw at the same gate; the raw directory was absent and injected fake-spawn count was zero.  No Codex executable was invoked. |
| Historical v7 config | PASS | The same independent probe used the provider-absent v7-shaped config with explicit `openai-api`; preparation succeeded and created its fresh local raw directory.  The fake client was not called. |
| Order of boundary | PASS | `requireWireConfig` performs `Object.hasOwn(config, "provider")` comparison before `requireFreshRawDirectory`; both preparation paths call it before `mkdirSync` and adapter construction. |
| Existing focused coverage | PASS | `node test-trusted-proof-answering.js` passed.  Added symmetric mismatch cases assert no raw directory; the OpenAI case also places invalid sampling after the provider check, and the Codex case asserts zero fake spawns. |
| Codex command/schema/usage/raw boundaries | PASS | Diff from pre-repair alpha commit `4387351bbef7cb71edc80d1460ec21d76e8c244d` to the repair changes only the one bridge guard and focused tests.  `providers/codex-exec-answering.js` is untouched: command, final schema, native JSONL usage validation, and raw-evidence handling remain unchanged. |
| OpenAI path | PASS | `providers/openai-answering.js` is byte-unchanged from the repair parent; full regression suite passed. |
| Full suite | PASS | `npm test` passed all seven registered suites. |

## Commands run

- `git diff --check 792ad08^ 792ad08` — PASS.
- `node test-trusted-proof-answering.js` — PASS; injected fake OpenAI/Codex transports only.
- Independent inline Node fake-only config-binding probe — PASS; verified both mismatch directions, no raw/client/spawn side effects, and provider-absent v7 OpenAI preparation.
- `npm test` — PASS (seven registered suites).

This review did not run `codex exec`, inspect authentication, make a model/API
call, create a CDR receipt/effectiveness claim, alter the registry/dataset, or
open a PR.
