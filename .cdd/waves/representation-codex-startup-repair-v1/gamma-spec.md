# CDD γ specification: representation-codex-startup-repair-v1

## Trigger

The sealed 72-call run at
`/tmp/representation-solver-increment-alpha-uRglI6/raw-run` recorded a uniform
Codex startup failure: `Operation not permitted (os error 1)`. The raw evidence
is retained and is not a result.

## Scope

Repair only the outer macOS Seatbelt/runtime grants needed for `codex exec` to
start inside its already sealed per-call root. Do not weaken the P0/P1 host-read
or SWI denial boundary, add arbitrary host access, permit a fallback transport,
or run an answering provider in CDD.

## Acceptance criteria

1. A non-provider `codex exec` startup probe runs under the exact outer
   Seatbelt profile and gets beyond the observed `Operation not permitted`
   failure, while preserving `-C` fresh root, `--ephemeral`, and
   `--ignore-user-config`.
2. The profile still denies repository, evaluator, memory, credential-host-path,
   and undeclared host writes; private sealed input/output/state access works.
3. P0/P1 retains resolved-SWI denial. P2 admits SWI only as the sealed
   per-call broker dependency, not by granting a host Prolog surface.
4. Existing JSONL/tool rules and P2 single no-argument broker rules remain
   unchanged. Focused negative controls and `npm test` pass.
5. No provider/model answering request, credential inspection, or new CDR run
   happens in this implementation/review cycle.
