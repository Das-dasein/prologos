:- begin_tests(finite_fol_meta_prover).
:- use_module('./finite-fol-meta-prover.pl').

domains([domain(person, [ada, bob])]).

test(forall_implies_derives_ground_consequence) :-
    Axioms = [atom(calm, [ada]), forall(var(x, person), implies(atom(calm, [var(x)]), atom(ready, [var(x)])))],
    finite_status([domain(person, [ada, bob])], Axioms, atom(ready, [ada]), 32, entailed, _).

test(exists_and_negation_are_object_logic) :-
    Axioms = [exists(var(x, person), and(atom(calm, [var(x)]), neg(atom(noisy, [var(x)]))))],
    finite_status([domain(person, [ada, bob])], Axioms, atom(calm, [ada]), 64, unknown, open_pair(_, _)).

test(xor_is_not_horn_projection) :-
    Axioms = [xor(atom(creative, [ada]), atom(methodical, [ada]))],
    finite_status([domain(person, [ada])], Axioms, atom(creative, [ada]), 8, unknown, open_pair(_, _)).

test(explicit_negation_contradicts_goal) :-
    Axioms = [neg(atom(ready, [ada]))],
    finite_status([domain(person, [ada])], Axioms, atom(ready, [ada]), 8, contradicted, _).

test(inconsistent_axioms_report_conflict) :-
    Axioms = [atom(ready, [ada]), neg(atom(ready, [ada]))],
    finite_status([domain(person, [ada])], Axioms, atom(ready, [ada]), 8, conflict, conflict(no_admissible_model)).

test(candidate_budget_is_explicit) :-
    Axioms = [or(atom(a, [ada]), atom(b, [ada]))],
    finite_status([domain(person, [ada])], Axioms, atom(a, [ada]), 2, budget_exhausted, budget(candidate_models(4), maximum(2))).

test(symbolic_solver_finds_xor_countermodel_without_enumeration_budget) :-
    Axioms = [atom(inspires, [michelle]), atom(joy, [michelle]), implies(atom(creative, [michelle]), xor(atom(inspires, [michelle]), atom(joy, [michelle])))],
    finite_sat_status([domain(person, [michelle])], Axioms, atom(creative, [michelle]), contradicted, _).

:- end_tests(finite_fol_meta_prover).
