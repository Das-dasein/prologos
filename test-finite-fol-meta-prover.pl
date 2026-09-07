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

test(labelled_explanation_returns_subset_minimal_conflict_core, [setup(plunit_finite_fol_meta_prover:setup_conflict_core_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(ready(ada), conflict, explanation(status(conflict), source_axioms([s1, s2, s3]), signature_audit(_, _, _), subset_minimal_conflict_core(core_ids(CoreIds), _), certificate(conflict(no_admissible_model)))),
    assertion(CoreIds == [s1, s2]).

test(labelled_explanation_accepts_documented_reified_formula_surface, [setup(plunit_finite_fol_meta_prover:setup_reified_conflict_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(ready(ada), conflict, explanation(status(conflict), _, signature_audit(_, _, _), subset_minimal_conflict_core(core_ids([s1, s2]), _), _)).

test(labelled_explanation_audits_predicates_only_introduced_by_goal, [setup(plunit_finite_fol_meta_prover:setup_goal_only_predicate_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(and(curiosity(ada), ready(ada)), unknown, explanation(status(unknown), _, signature_audit(goal_predicates(GoalSymbols), world_predicates(WorldSymbols), only_in_goal(OnlyInGoal)), _)),
    assertion(GoalSymbols == [curiosity/1, ready/1]),
    assertion(WorldSymbols == [calm/1, ready/1]),
    assertion(OnlyInGoal == [curiosity/1]).

setup_conflict_core_world :-
    assertz(user:domain(person, [ada])),
    assertz(user:axiom(s1, ready(ada))),
    assertz(user:axiom(s2, not(ready(ada)))),
    assertz(user:axiom(s3, unrelated(ada))).
setup_reified_conflict_world :-
    assertz(user:domain(person, [ada])),
    assertz(user:axiom(s1, atom(ready, [ada]))),
    assertz(user:axiom(s2, not(atom(ready, [ada])))).
setup_goal_only_predicate_world :-
    assertz(user:domain(person, [ada])),
    assertz(user:axiom(s1, calm(ada))),
    assertz(user:axiom(s2, rule([calm(X)], ready(X)))).
clear_labelled_world :-
    retractall(user:domain(_, _)),
    retractall(user:axiom(_, _)).

:- end_tests(finite_fol_meta_prover).
