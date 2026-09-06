# CDR α live dispatch: representation-formalization-v1

You are a fresh CDR α session. This is a data-collection run, not a code
change. Read the wave manifest, policy, generator/evaluator gamma close-outs,
and the selected immutable local config before action.

## Preconditions

- `OPENAI_API_KEY` is present only in the process environment; never print,
  commit, or copy it into an artifact.
- The selected model identifier is explicit and replaces the example placeholder
  in a new local config file outside the repository.
- The config's fixture SHA equals the committed fixture SHA.
- The raw root is a new absolute directory outside the repository and does not
  yet exist.

## Command shape

Run the sealed evaluator with explicit `--allow-live-provider`, provider
`openai-api`, the exact config/model, and fresh raw root. Do not use Codex CLI,
tools, shell access, a solver, P2, retries, or modified prompts.

## Return artifacts

Return only local evidence references/hashes, model/config identity, command
shape with secret omitted, and the collector's `not-a-cdr-receipt` aggregate.
Do not state that P1 is better/worse. A fresh CDR β must reproduce and audit
the local raw artifacts before γ may emit any research receipt.
