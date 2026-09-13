# Product extraction v5 product smoke v1

This wave freezes one easy Russian extraction case after admission policy v2
became active. It permits exactly one pinned Codex provider call and requires
zero admission writes. The product candidate must use `memory-extraction-v5`,
carry the frozen ontology and grounding-policy identities, and produce a
policy-v2 receipt that remains `primary_proposed_unadmitted`.

The source snapshots were copied before the live call. The report is created
with exclusive-write semantics and mode `0600`; reruns must use a new output
path. This is a transport and quarantine smoke, not a quality experiment.

- Fixture SHA-256: `86c3bc1dddc9cc056be75f1a4028980c98599db41322130ec63b75b25e205500`
- Control SHA-256: `ecf9679a130afa541020a92ebd8421f9a4678c32e29026daf25b5e12a7266a8b`
