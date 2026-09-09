# Near-signature reflection v3 — Alpha preregistration

Status: `ALPHA PREREGISTERED — NO v3 MODEL OUTPUT INSPECTED`.

V1 and V2 are retained as failed runs. V1 discarded M0 due to a runner trace
classification error. V2 completed its calls but its M0 formalization contract
permitted incompatible query syntaxes, and no candidate produced an advisory.
Neither run contributes scored observations.

V3 uses the same frozen 12-case source split and evaluator-only gold, but a
new M0 contract. Every atom is `atom(predicate,[constant])`; every query is
exactly `atom(predicate,[constant])` or `not(atom(predicate,[constant]))`.
The JSON schema, JavaScript validator, prompt, and Prolog certificate now use
that same syntax.

For each case, Alpha makes one fresh M0 call and immediately executes its
candidate in fresh local Prolog processes. M1/M2 are made only if that exact
unchanged candidate produces a nonempty read-only `near_signature_audit`.
Otherwise the record is `not_eligible_no_near_signature_audit` and no review
calls occur. This prevents spending review calls on a prompt with no actual
treatment. It is a qualification rule, not an alias repair or selection of a
candidate after generation.

For every eligible case, the two fresh review prompts have the identical
source, candidate and standard certificate. M2 adds only the advisory. The
frozen six/six order map remains in the protocol. All output, including
ineligible M0 candidates, is retained. Any effect claim is limited to eligible
cases and still concerns diagnostic reflection only.
