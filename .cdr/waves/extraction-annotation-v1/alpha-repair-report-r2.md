# Alpha repair report R2: scorer and dataset gates

This repair responds to beta's remaining CDR findings.

- Gold dataset integrity is enforced regardless of relative or absolute path.
- Both gold and candidate inputs pass structural and private-marker gates
  before scoring; candidates deliberately have no expected content hash.
- Seeded errors now cover every currently declared taxonomy category:
  atomicity, polarity, predicate, argument, time, modality, provenance,
  decision, hallucination, and coreference.
- Clean archive runs no longer print a Git error merely because `.git` is
  absent. A policy-grade CDR receipt must still pass an explicit source commit
  to the harness; `null` is not promoted to provenance.

This remains an exact synthetic-fixture scorer and not live extraction evidence.
