# Live-run record: 2026-09-09

The local ignored raw directory completed all 36 planned calls. This is a
failure record, not an M1/M2 result.

The repaired trace gate accepted all calls: no receipt error, 36 raw hashes
matched, and each stream had one pinned skills-context notice, one agent
message, and one completed turn. No review prompt contained `M0 unavailable`.

However, every M0 output used the finite-FOL query form `atom(...)` or
`not(atom(...))`. The runner's `groundGoal` admitted only its older surface
form (`predicate(name)` / `not(predicate(name))`). It therefore marked every
candidate treatment-unavailable before executing the Prolog certificate.
Consequently no M2 prompt contained `near_signature_audit`; there is no
baseline-versus-treatment comparison to score. V2 output must not be used to
claim a diagnostic effect.

Any subsequent run must first make the M0 prompt, schema validator, query
parser, and certificate call agree on the one reified object-FOL query syntax.
That correction needs a new preregistered wave and Beta review; it must not
retroactively alter this raw run.
