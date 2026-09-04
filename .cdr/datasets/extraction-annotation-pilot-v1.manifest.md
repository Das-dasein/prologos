# Extraction annotation pilot v1 manifest

- Origin: authored synthetic English dialogue turns for CDR protocol work.
- Intended use: structural annotation review and future extraction-oracle
  design only.
- Redistribution: repository fixture; contains no personal, employer, API, or
  `data/memory.pl` content.
- Record count: 9.
- Category binding: `extraction-annotation-contract-v1.json`; every case is
  assigned exactly once to one of six registered categories. The correction /
  supersession row is intentionally `N/A` for this nine-turn fixture.
- v2/profile binding: the contract pins profile
  `prologos_agent_memory@1.0.0` and its SHA-256, checks predicate arity, and
  maps asserted v1 writes to v2 `relation`, ordered `arguments`, `polarity`,
  `valid_from`/`valid_to`, and provenance. Scope defaults to `self` and
  qualifier to `N/A` (interval assertions use qualifier `interval`).
- Coverage: independent conjunction, direct negation, canonical positive/
  negative polarity pair, interval qualifier, hypothetical, question, reported
  speech, and ambiguous coreference.
- Integrity: SHA-256 is checked by `npm run test:cdr-annotation`:
  `7cf87a0f2a7b7f101872364c16d505e8c948825ac060fa2fe2bd5a8a004edf66`.
