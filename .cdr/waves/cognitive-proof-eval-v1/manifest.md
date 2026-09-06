# CDR wave manifest: cognitive-proof-eval-v1

Status: prospective offline preparation; no provider call, candidate receipt,
CDR receipt, result, or effectiveness claim.

Historical offline-fixture source snapshot:
`82bcc82fca8d8ebb2734e1006b754a6d4e31b4ac`. It is provenance for the
offline fixture only, not evidence of, or authority for, the current live
transport.
Dataset: `dataset.json`.
Dataset.json SHA-256: 63d68d4decad2dcdadbfc1204c58cec2650a46a90442cb63889e3d7989e07e51
Slot registration SHA-256: 4d05d2176f4e629370771925543d4670259e15b633c5ef3be47803c6c9bf9a46
Trusted proof digest registry SHA-256: a68d6a010b7225f42bedb447a209e50617cd26bf2a9a6ab40aa0d40b61ae42e4
Actual assembled prompt digest registry SHA-256: 198bcd6ab78bcee84c3b3333ba88c6f38e0362dd398ba7e083370a2db8da5e05
Historical wire assembled prompt digest registry v3 SHA-256:
b77606570d7ea951767a328d1676a312521f78bbc6231aa8e03614b9fa463ac5
Current wire-authority assembled prompt digest registry v7 SHA-256:
8c5e02858762443052cf1e04e49a8189c3812bf10484cc76e3725ed1314aa7af

Current registry/receipt-intake authority is the forward-only pair
`wire-authority-assembled-prompt-digest-registry-v7.json` and
`validate-receipt-intake-v7.js`, at authority commit
`7f0a58cddd0966c8b1834f66ece726d2b60d184e`. Its only wire-authority sources
are `providers/openai-answering.js` and `trusted-proof-answering.js`; it seals
their hashes, byte-for-byte prompt identities, and sampling. The current
operator collector is `trusted-proof-live-candidate.js` and its immutable
operator configuration is `trusted-proof-live-candidate-config-v7.json`.
They consume and must match the v7 authority, but are not extra
wire-authority sources. All v1 through v6 registries, schemas, fixtures,
validators, and source snapshots are historical artifacts; they are invalid
v7 receipt inputs and must not be read as current authority.

`slot-registration-v1.json` is the immutable canonical
`trusted-proof-evidence-slots-v1` object. Its self-hash, this manifest binding,
the method binding, and the canonical map derived from `dataset.json` must
match exactly; missing or extra case mappings fail closed.

`trusted-proof-digest-registry-v1.json` is the immutable canonical
case-to-digest registry for P1. Each digest is SHA-256 of the canonical trusted
`runTrustedQuery` result for that case's pinned accepted snapshot and query.
It self-hashes and binds the source snapshot and dataset hash; it contains no
raw model output or hidden answer contract.

`actual-assembled-prompt-digest-registry-v1.json` is an immutable self-hashing
case-to-`P0`/`P1` SHA-256 registry rebuilt from the no-live sealed assembler.
It pins source, dataset, slot and proof registries, and exact no-live template
identities; it contains no prompt bytes or raw artifacts.

`wire-assembled-prompt-digest-registry-v3.json` is a historical forward-only
adapter artifact. It rebuilt sealed P0/P1 digests against PR #37's transport
commit, source hashes, real exported wire identities and exact byte-for-byte
input mode; it is not the current v7 authority and never was a live receipt.

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

`validate-equal-budget-slots-v1.js` is a second deterministic offline method.
The dataset pre-registers one 1024-byte evidence slot for each of the 12 cases.
Its `offline-utf8-byte-v1` rule counts UTF-8 bytes only as a reproducible
accounting abstraction, not as a provider/model token claim. It assembles P0's
inert `~` control slot and P1's trusted proof/missing result plus `~` padding,
verifies equal request units and equality outside the slot, and rejects an
overlong result, unequal slot, outside-slot mutation, or oracle/control leak.
An overlong result is `unavailable`, never truncated or scored. The future live
digest additionally pins snapshot/query/model/base-and-wrapper prompts/
sampling/slot-size/measured `E`; this offline validator cannot establish that
provider-side measurement.

Intended future consumer: a human-operated CDS live run followed by fresh CDR
beta. This manifest neither changes the v0 `REVISE` status nor supplies a
provider call, candidate receipt, CDR receipt, claim, threshold result, or
effectiveness conclusion.
