# Independent beta dispatch — v1.0.1

Changelog: v1.0.1 requires semantic review of all pairs and an actual isolation
check in addition to passing the producer's tests.

Role: independent fresh beta. Workspace:
`/Users/artem/Documents/code/prolog-agent-memory`.
Artifact channel: `.cdd/waves/paired-biographies-v1/`.

Load the canonical CDD beta and CDR beta overlay from the installed local cnos
checkout. Read `gamma-scaffold.md`, `.cdr/waves/paired-biographies-v1/protocol.md`,
the complete dataset and its WIRE/schema, and the new harness source. Producer
receipts are inspectable artifacts, not independent proof of their claims.
Read `.cdr/waves/paired-biographies-v1/model-selection.md`: the operator chose a
cheaper model, and the next pilot uses Luna separately from the completed Sol
smoke. Verify requested versus actual wire model, output limit enforcement, and
whether Hermes-added date/path/host metadata introduces uncontrolled differences
between otherwise paired inputs. Unavailable effective settings must be reported
as unavailable, not assumed equal.

Review both sub-artifacts distinctly:

1. Dataset: all twelve causal pairs, source-to-program fidelity, claim versus
   reported/hypothetical status, time/supersession semantics, action/query meaning,
   equivalent current inputs, contrast versus invariance labels, proof relevance.
   The label `human_review: pending` must remain true. Return a per-pair verdict.
2. Harness: same measured task in all modes; no gold/label/pair leakage into model
   inputs; natural-language baseline retains the same usable source knowledge;
   temporal projection uses actual world machinery; candidates stay unaccepted;
   no private profile, unrelated context, tools or cross-session information;
   fourth mode enforces and binds a real checker invocation to this snapshot and
   query; no fabricated extraction results or simulated responses called Hermes.
3. Scores: correct kind AND semantic target AND evidence, question alternatives,
   negation/conflict distinction, unsupported proof item IDs, missing required
   proofs/calls, malformed/extra output fields, process errors/timeouts, zero
   denominator and failed/missing runs. Test attacks against likely false positives
   rather than merely mirroring the implementation.
4. Evidence: exact actual model input/output, configured and effective model,
   sampling and usage, filesystem/runtime hashes, fresh sessions and declared
   retries. Source/data/prompt versions frozen before live comparison. Gold-only
   verification stays separate from extraction and model behavior. Full comparison
   remains a development pilot with human review pending.

Reproduce deterministic checks in a clean temporary copy containing exactly the
required declared sources and dataset. Run independent negative probes. Record
commands, paths and findings in `beta-review.md`, and a dataset-specific review
artifact if useful. Do not modify the implementation/gold, commit or publish.
Return APPROVE or REQUEST CHANGES for the local artifact; this is not a remote
release verdict or a positive memory-benefit claim. Report concrete blockers and
precise repair oracles. Do not run full model suite during review; a bounded
additional real smoke is allowed only if necessary to settle integration.
