# Gamma scaffold — issue #54: explicit Codex exec provider

## Objective

Add a provider selected as `codex-exec` that invokes the documented Codex CLI
non-interactive mode (`codex exec`) rather than OpenAI SDK/API authentication.
The existing `openai-api` v7 transport remains byte-for-byte and semantically
unchanged.

## Alpha target

Create a provider module and focused fake-spawn tests.  Adapt the answering
bridge only enough to dispatch an explicit `codex-exec` selection.  The
provider must:

- be inert unless the existing explicit live gate is reached;
- reject absent/non-text prompt and missing explicit model before spawning;
- invoke `codex exec` with read-only sandbox, an ephemeral session, the exact
  sealed assembled prompt as its sole task text, and machine-readable JSONL;
- request a constrained final JSON object with a nonempty `answer` string;
- retain JSONL/stdout/stderr/final output locally as raw evidence;
- parse only a completed turn's native integral token counters, fail closed if
  required input/output counters are absent or irreconcilable, and never
  synthesize E;
- make no default choice of model, provider, credential, or retry.

## CDR boundary

This is CDD transport preparation.  It must not be wired into v7 receipt
intake, config or collector, and must not create a CDR/effectiveness receipt.
A later CDR v8 registration must pin Codex CLI version, exact command shape,
response schema and the provider source before any human-operated run.

## Out of scope

No actual `codex exec`, no user-auth inspection, no model call, no OpenAI SDK
change, no changes to dataset/Prolog/query/scorer/slot registry or current
OpenAI v7 authority.
