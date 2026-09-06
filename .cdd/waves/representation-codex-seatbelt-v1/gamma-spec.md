# CDD γ specification: representation-codex-seatbelt-v1

## Problem

The approved P0/P1 live collector currently permits only an OpenAI API
transport, but this project operates through Codex CLI authentication. Ordinary
`codex exec` is not an acceptable replacement: its coding-agent environment
could expose shell/filesystem capabilities and thereby let P1 invoke or inspect
the local Prolog implementation.

The repository already contains a macOS Seatbelt preflight. This cycle may
reuse that boundary only by composing a new representation evaluator transport
that makes the outer default-deny profile authoritative for every P0/P1 call.

## Scope

Add a `codex-seatbelt` P0/P1 transport to the representation live evaluator.
It must be a second explicitly selected transport, not a fallback from the
existing `openai-api` mode.

### Implementation contract

| Axis | Pinned value |
| --- | --- |
| Language | Node.js/CommonJS |
| CLI integration target | Extend `representation-live-evaluator.js` with explicit `--provider codex-seatbelt` only |
| Package scoping | Evaluator/test files plus narrow reuse of `trusted-proof-codex-seatbelt-v10.js`; no chat runtime changes |
| Existing-binary disposition | Reuse the existing Seatbelt profile; do not weaken or replace it |
| Runtime dependencies | macOS `/usr/bin/sandbox-exec`, literal Codex binary, and one exact existing `auth.json`; no OpenAI API key |
| JSON/wire contract | Sealed prompt/schema files in a fresh per-call root; JSONL trace, final answer, and stderr are local raw evidence only |
| Backward compatibility | Preserve `openai-api` mode and all historical trusted-proof paths byte-for-byte |

## Acceptance criteria

1. `codex-seatbelt` requires explicit `--allow-live-provider`, exact absolute
   `--codex-path`, exact existing `--auth-file` named `auth.json`, explicit
   model, and a fresh absolute raw root. It has no default and never falls back
   to ordinary Codex exec or OpenAI API.
2. Before the first answering child, it runs the existing actual Seatbelt
   preflight and an additional executable-denial probe for the resolved local
   `swipl` binary. The run fails closed unless checkout/evidence reads and
   outside writes are denied, sealed input/output/state operations succeed,
   Codex runtime starts, and `swipl --version` is denied.
3. Each of the 48 model calls receives one sealed fixture prompt plus a tiny
   JSON answer schema in a new per-call root. Codex starts with `-C` set to that
   root, `--ephemeral`, `--ignore-user-config`, and outer Seatbelt. No host
   checkout, evaluator, fixture, memory directory, or Prolog binary is readable
   by the child.
4. The child sees only the copied exact auth file in private state. Credentials
   are not printed, committed, included in prompts, or recorded in aggregates.
5. The collector parses Codex JSONL native usage and final schema output. It
   rejects any JSONL tool/command event, any protected host-path exposure, any
   malformed output, or any missing raw artifact. A rejected call remains raw
   local evidence and makes the aggregate non-result.
6. It preserves every existing fixture/config bytes seal, 48-call
   counterbalance, strict `RESULT:` parser, write-once raw evidence, and
   `not-a-cdr-receipt` aggregate invariants.
7. Fake-spawn tests inspect the literal outer Seatbelt invocation and simulate
   valid/invalid JSONL; macOS focused tests run the real preflight and a real
   SWI executable-denial probe. No provider/auth/model call occurs in tests.
8. `npm test` remains green. No P2, proof injection, solver tool, or live call
   is performed by this implementation cycle.

## Non-goals

- Do not use the weaker trace-audited fallback.
- Do not make a real 48-call collection while implementing.
- Do not assert P0/P1 accuracy, utility, or an RFR-C1 result.
