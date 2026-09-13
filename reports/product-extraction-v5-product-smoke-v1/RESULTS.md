# Product extraction v5 activated-path smoke v1

Status: completed live transport and quarantine smoke; deterministic replay
verified.

One frozen Russian message, `Я знаю Python.`, was sent through the current
`providers/codex.extractMemory` path with pinned model `gpt-5.6-luna`. The model
returned one exact `knows_technology(user,python)` assertion with a verbatim
evidence span, the active ontology identity, and the active predicate-grounding
policy identity.

The candidate was then passed through the current product admission pipeline.
It produced `memory-extraction-admission-receipt-v2` bound to
`product_extraction_admission@2.0.0` and remained
`primary_proposed_unadmitted`. There was one provider call, no repair call, no
admission event, and zero memory writes.

This result verifies that the activated Codex product route uses v5 and policy
v2 and preserves explicit admission for one easy case. It does not estimate
extraction accuracy or safety. The transport did not retain the Codex CLI JSONL
usage envelope, so this smoke also makes no token or retry claim.

Artifacts:

- Fixture SHA-256: `86c3bc1dddc9cc056be75f1a4028980c98599db41322130ec63b75b25e205500`
- Control SHA-256: `ecf9679a130afa541020a92ebd8421f9a4678c32e29026daf25b5e12a7266a8b`
- Report SHA-256: `f5980d454fe567b8273edc86429e4accb1871d15c73ed44d359fb1857f00aa6f`
- Candidate SHA-256: `46972a1348a0a152c9bd4c4c95d20626163311f80c1bf158d0c7d1c615f9afaa`
- Admission receipt SHA-256: `539ba4f15ee31a4f5b3efcf97c692108a71d4e464921c4978b19f2ca160c3e81`

Replay without a provider call:

```bash
node test-product-extraction-v5-product-smoke.js
```
