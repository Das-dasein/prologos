# Extraction admission policy v1

Product extraction admission now has its own content-addressed policy identity:
`product_extraction_admission@1.0.0`, SHA-256
`7c3e423429661bb562b5085af5f9c4574a028bd68540ec8d676409a1cbab706a`.
It is bound to predicate-grounding policy `conversation_grounding@1.0.0` and
declares the exact active validator pipeline:

1. schema, evidence, and interval checks;
2. conservative third-person pronoun validation v2;
3. non-ASCII identity binding v1.

New admission receipts use `memory-extraction-admission-receipt-v2` and include
this exact policy identity. Admission recomputes the receipt hash, checks the
policy identity, and replays the active pipeline before a user-approved write.
Historical receipt v1 remains readable and replays only its historical
validator-v2 behavior; it cannot silently acquire the new gate.

The identity gate became active only after the fresh 16-case Russian control
blocked all five generated unadmitted identity writes and passed all ten
correct writes. Product extraction itself remains v4, and explicit user
approval is still required for every admitted write. A blocked identity is
routed to a concrete clarification question instead of repair or rejection.

Evidence boundary: the fresh control is small and hand-authored. Activation is
a bounded product safety decision, not evidence of general multilingual entity
resolution or CDR.

Historical status: this policy remains the immutable replay policy for
`memory-extraction-v4` receipts. It was superseded as the active product policy
by admission policy v2 when the default extraction and repair paths moved to
`memory-extraction-v5`.

Artifacts:

- Policy file SHA-256: `2a1b1a8930f1142f9c5cdaa125944bd7b7cb5eca99333250bafaf54c3b6f6595`
- Policy identity SHA-256: `7c3e423429661bb562b5085af5f9c4574a028bd68540ec8d676409a1cbab706a`
- Grounding policy SHA-256: `c012e2b9ca0f571d226076656324f62dc6919059dd2b342c94cb09b5782d402f`
- Fresh activation control: `reports/product-extraction-v5-identity-control-v1/RESULTS.md`

Checks:

```bash
node test-extraction-admission-policy.js
node test-extraction-policy-identity-validator.js
node test-extraction-admission.js
```
