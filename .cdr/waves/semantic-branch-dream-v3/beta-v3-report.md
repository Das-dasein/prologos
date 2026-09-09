# Beta report — semantic branch dream v3

Verdict: `REVISE` for claim calibration; no Luna rerun is required. Technical
reproducibility passed.

- Preregistration commit `f42eabb` predates raw start (10:44:47 UTC vs
  10:44:55 UTC). Fixture SHA-256 is
  `f5416ab92088dd0578f5e8075d1edd660628f4b58bb53a20b058f25d8a01120d`.
- 24 receipts and 120 JSONL events were inspected: one completed turn each,
  matching prompt/stdout/stderr hashes, no forbidden tool action. The hidden
  `expected_class` never appears in a prompt.
- The schema permits only zero or one connector branch. All six branches cite
  s2, preserve query and all other program bytes, and change exactly one
  OR/XOR token.
- Beta independently ran 18 isolated candidates to reproduce all 12 traces,
  with zero model calls. Results match alpha and its saved fail-closed replay;
  no load error was accepted.
- The dashboard matches byte-for-byte regeneration from the reviewed files.

Calibration corrections:

1. v3's prompt explicitly lists the new variants `exactly one`, `never both`,
   `one and only one`, `may do both`, and `not mutually exclusive`. Thus this
   is evidence of compliance with an **expanded instruction**, not
   generalization of the unchanged v2.1 prompt.
2. v3-orxor-06's stable trace is technically correct but depends on a lexical
   split: `codes(fara)` in s1 differs from `code(fara)` in s2. Neither branch
   constrains `design(fara)`. It must not be described as a source-level
   connector choice that does not matter, and it must not be auto-normalized.

After these corrections, Gamma may record the narrow observed result.
