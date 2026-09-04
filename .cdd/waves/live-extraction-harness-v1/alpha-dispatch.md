# Alpha dispatch: live-extraction-harness-v1

Project: `prolog-agent-memory`.
Branch: `cycle/17`.
Issue: GitHub #17.
Contract: `gamma-spec.md` and `manifest.md` in this directory.

Implement only the bounded CDS harness described by the contract. Read the
current extraction path, active ontology profile, CDR policy and pilot method
before editing. Preserve the CDD/CDR boundary: deterministic fake-provider
tests are required; a real provider call is opt-in, local-only and must not be
performed merely to make tests pass.

Return an immutable commit, a self-coherence report mapping AC1--AC6 to tests,
and named remaining debt. Do not author beta/gamma artifacts, alter the CDR
dataset/oracle/thresholds, or claim extraction quality.
