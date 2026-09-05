# Local receipt intake v2 (issue #35)

V2 is a new, local, append-only preparation format. It does **not** parse,
upgrade, or reinterpret a v1 envelope. It remains non-result intake: it calls
no provider/model, stores no raw output, aggregates nothing, and supports no
effectiveness claim.

In addition to every v1 immutable gate, V2 binds the self-hashing
`actual-assembled-prompt-digest-registry-v1.json`. That registry is rebuilt
from the existing no-live sealed P0/P1 assembler for every pinned case and
contains only case/condition SHA-256 values and template identities; it never
contains prompt bytes, oracle contracts, provider output, or raw responses.

Every record carries `prompt_sha256` and a separate `prompt` local artifact
(`local://` reference plus SHA-256). For a candidate, both prompt and raw
files resolve only below `--raw-root` and are hashed by intake. The prompt
artifact SHA must equal the record SHA, which must equal the registry's exact
`case_id` and `P0`/`P1` digest. Thus a P0/P1 swap, a changed byte outside the
slot, or a substituted artifact fails before any aggregation. Prompt and raw
references are independently unique; `supersedes_record_id` remains forbidden.

The committed v2 fixture is deliberately synthetic and has nonexistent local
paths. It demonstrates only parsing and deterministic gates and cannot be a
candidate or live result. A complete candidate remains `INDETERMINATE` pending
a human-operated run and fresh CDR beta audit.
