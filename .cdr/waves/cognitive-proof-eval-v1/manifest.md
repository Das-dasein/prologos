# CDR wave manifest: cognitive-proof-eval-v1

Status: prospective offline preparation; no live run and no CDR receipt.

Source implementation snapshot: `82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`.
Dataset: `dataset.json`.
Dataset.json SHA-256: dd0ed11f7547940f7ce33e3b1118b27aa41bfcd786040706b2b9fc37f9729a75

The fixture contains 12 synthetic, sanitized cases: two each for multi-hop,
unknown, revision, direct temporal conflict, provenance disambiguation, and
plausible but untrusted thought transcript. `hidden_answer_contract` is oracle
material: it is forbidden in all future model prompts.

The deterministic oracle is `validate-trusted-proof-eval-v1.js`. It hashes the
raw dataset, verifies every stored trusted result through `runTrustedQuery`,
hashes every expected result, checks revision/conflict metadata, and reruns
each thought case after an isolated forged full-Prolog candidate emits a
transcript labelled untrusted. It does not invoke a provider, model, or live
evaluation harness.

Intended future consumer: a human-operated CDS live run followed by fresh CDR
beta. This manifest neither changes the v0 `REVISE` status nor supplies a
claim, threshold result, receipt, or effectiveness conclusion.
