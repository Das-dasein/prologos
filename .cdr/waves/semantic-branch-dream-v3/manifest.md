# Semantic branch dream v3 — varied-language abstention test

Status: `PREREGISTERED — NOT RUN`.

v2.1 established only that a clear abstention instruction separates eight
near-identical templates. v3 asks a narrower generalization question: on new,
varied controlled phrasings, does the same single plain prompt propose one
complete OR/XOR alternative for bare alternatives and abstain for explicit
exclusive/inclusive language?

The 12 frozen cases contain six bare alternatives, three explicit-XOR controls
(`exactly one`, `never both`, `one and only one`), and three inclusive-OR
controls (`may do both`, `at least one ... both possible`, `not mutually
exclusive`). The independent `expected_class` is stored in the fixture but is
never sent to Luna. Every case has one baseline formalization and one bounded
hypothesis call; there is no declared-label condition because v2.1 found no
observed decision difference from adding it.

The output schema permits zero or one full immutable connector branch only.
The candidate must preserve the query and every program byte except one
`or`/`xor` token. Alias, type assumptions, AST operations and repair loops are
not representable. Fail-closed execution is mandatory.

Primary measures: branch proposal rate on bare alternatives and false proposal
rate on explicit controls. Prolog status change is secondary. A positive result
would still apply only to these authored controlled phrasings, not to general
natural language, accuracy, Prolog benefit, or memory.

Frozen fixture SHA-256:
`f5416ab92088dd0578f5e8075d1edd660628f4b58bb53a20b058f25d8a01120d`.
