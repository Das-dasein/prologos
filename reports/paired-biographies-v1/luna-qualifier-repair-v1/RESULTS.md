# Luna qualifier repair v1

Status: completed bounded development follow-up; raw and source evidence
verified.

Report SHA-256:
`af2fad2d40beca52b20ce768ed5bce9143b5fce63d6f654146344e52acaca8de`.

The deterministic provenance validator inspected all syntax-repaired candidate
sets without gold. It selected only `p05_b/itema1`: `validTo:19` was absent
from its cited source, which described the old rule as indefinite. Retirement
was already represented by `itema3.replaces:itema1`.

One Luna call received the candidate set, original dialogue and that diagnostic.
It changed only `itema1.validTo` from `19` to `null`. Programs, IDs, sources,
times, replacement link, modality, status and natural-language fields remained
unchanged. Existing SWI-backed scoring then matched all three candidates.

| Stage | Exact extraction |
| --- | ---: |
| Original first pass | 16/24 |
| After one syntax-repair call on eight cases | 23/24 |
| After one qualifier-repair call on the remaining case | 24/24 |

This is assisted bounded repair with nine additional model calls: eight grammar
calls and one qualifier call. It does not revise the first-pass 16/24 score or
certify the truth of extracted claims. It shows that this synthetic corpus's
observed failures are recoverable under deterministic feedback; semantic review
and admission remain separate boundaries.

Verification:

```sh
node world/paired-biographies/verify-qualifier-repair.cjs reports/paired-biographies-v1/luna-qualifier-repair-v1
```
