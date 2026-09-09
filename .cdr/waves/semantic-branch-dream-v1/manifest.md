# Semantic branch dream v1 — controlled OR/XOR cycle

Status: `PREREGISTERED — NOT RUN`.

This is a controlled language diagnostic, not a ProverQA score or a claim about
memory. v0 showed that ProverQA's supplied phrases usually resolve the OR/XOR
choice explicitly. v1 instead tests whether Luna can name a bounded semantic
branch when ordinary English leaves “either A or B” open.

The frozen visible-only fixture has eight hand-authored cases: four ambiguous
bare-`either-or` cases and four controls whose wording explicitly requires XOR
or inclusive OR. The model sees only numbered sentences and the question.
There is no gold label, hidden FOL, answer scoring, memory write, or automatic
answer override.

For an ambiguity case, baseline construction is instructed to use `or`; a
permitted hypothesis may change exactly one cited `or` to `xor`, preserve every
other byte of the complete candidate, and preserve the query. Controls must
produce no accepted connector branch. A valid branch has to execute cleanly in
a fresh process under the fail-closed load-error gate.

The primary observations are: valid proposed-branch count, clean execution,
and whether the branch changes the semantic status. A result only says that
the model exposed a named alternative in this small controlled language. It
does not establish general natural-language understanding or accuracy.

The fixture SHA-256 is
`d20c3adf3958433c5fe258b4a2b3f164c9feddf775cd3313d0d3f5c76cc8540e`;
prompts and runner revision are recorded in raw provenance before the first
model call. Any malformed, out-of-contract, or failed branch is `unresolved`.
