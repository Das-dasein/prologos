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
    labelled_explanation(ready(ada), conflict, explanation(status(conflict), source_axioms([s1, s2, s3]), signature_audit(_, _, _), near_signature_audit(_, _), domain_audit(_, outside_declared_domains([]), quantified_rules([])), quantifier_audit([]), subset_minimal_conflict_core(core_ids(CoreIds), _), certificate(conflict(no_admissible_model)))),
    assertion(CoreIds == [s1, s2]).

test(labelled_explanation_accepts_documented_reified_formula_surface, [setup(plunit_finite_fol_meta_prover:setup_reified_conflict_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(ready(ada), conflict, explanation(status(conflict), _, signature_audit(_, _, _), near_signature_audit(_, _), domain_audit(_, outside_declared_domains([]), quantified_rules([])), quantifier_audit([]), subset_minimal_conflict_core(core_ids([s1, s2]), _), _)).

test(labelled_explanation_audits_predicates_only_introduced_by_goal, [setup(plunit_finite_fol_meta_prover:setup_goal_only_predicate_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(and(curiosity(ada), ready(ada)), unknown, explanation(status(unknown), _, signature_audit(goal_predicates(GoalSymbols), world_predicates(WorldSymbols), only_in_goal(OnlyInGoal)), near_signature_audit(_, _), domain_audit(_, outside_declared_domains([]), _), quantifier_audit([]), _)),
    assertion(GoalSymbols == [curiosity/1, ready/1]),
    assertion(WorldSymbols == [calm/1, ready/1]),
    assertion(OnlyInGoal == [curiosity/1]).

test(labelled_explanation_reports_constants_outside_domain_with_sources, [setup(plunit_finite_fol_meta_prover:setup_outside_domain_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    labelled_explanation(ready(dash), unknown, explanation(status(unknown), _, _, near_signature_audit(_, _), domain_audit(declared_domains([domain(person, [ada])]), outside_declared_domains([constant(dash, source_axioms([s1]), goal(true))]), quantified_rules([s2])), quantifier_audit([]), _)).

test(near_signature_audit_reports_query_spelling_without_repair) :-
    near_signature_audit(atom(receives_accolades, [clark]), [s1-atom(receive_accolades, [clark])],
        near_signature_audit(query_related([near_pair(receives_accolades/1, receive_accolades/1, edit_distance(1))]), world_internal([]))).
test(near_signature_audit_keeps_internal_chain_names_visible) :-
    near_signature_audit(atom(target, [clark]), [s1-atom(develop, [clark]), s2-atom(develops, [clark])],
        near_signature_audit(query_related([]), world_internal([near_pair(develop/1, develops/1, edit_distance(1)), near_pair(develops/1, develop/1, edit_distance(1))]))).

test(audit_proof_tree_nests_rule_premises, [setup(plunit_finite_fol_meta_prover:setup_branching_trace_world), cleanup(plunit_finite_fol_meta_prover:clear_labelled_world)]) :-
    audit_proof_tree(ready(ada), proof_tree(ready(ada), derived(ready(ada), rule(s3), [
        fact(calm(ada), axiom(s1)),
        derived(alert(ada), rule(s2), [fact(calm(ada), axiom(s1))])
    ]))).

test(direct_solvers_reject_free_variables_in_axioms, [forall(member(Solver, [symbolic, enumerating]))]) :-
    solve_with(Solver, [domain(person,[ada])], [atom(p,[var(x)])], atom(p,[ada]), invalid_program,
               validation(free_variable(x, source_axioms([axiom(1)])))).
test(direct_solvers_reject_free_variables_in_goal, [forall(member(Solver, [symbolic, enumerating]))]) :-
    solve_with(Solver, [domain(person,[ada])], [], atom(p,[var(x)]), invalid_program,
               validation(free_variable(x, source_axioms([goal])))).
test(direct_solvers_reject_undeclared_quantifier_sort, [forall(member(Solver, [symbolic, enumerating]))]) :-
    solve_with(Solver, [domain(person,[ada])], [forall(var(x,dinosaur),atom(p,[var(x)]))], atom(p,[ada]), invalid_program,
               validation(undeclared_quantifier_domain(dinosaur, source_axioms([axiom(1)]), declared_types([person])))).
test(direct_solvers_reject_malformed_formula, [forall(member(Solver, [symbolic, enumerating]))]) :-
    solve_with(Solver, [domain(person,[ada])], [bogus(atom(p,[ada]))], atom(p,[ada]), invalid_program, validation(bad_formula(_))).
test(labelled_free_variable_is_validation_not_conflict, [setup(assertz(user:domain(person,[ada]))), cleanup(clear_labelled_world)]) :-
    assertz(user:axiom(s13,p(var(x)))),
    labelled_explanation(p(ada), invalid_program, explanation(status(invalid_program), validation(free_variable(x,source_axioms([s13]))))),
    labelled_semantic_status(p(ada), invalid_program, validation(free_variable(x,source_axioms([s13])))).
test(labelled_undeclared_sort_retains_source, [setup(assertz(user:domain(dinosaur,[dash]))), cleanup(clear_labelled_world)]) :-
    assertz(user:axiom(s13,rule([p(X)],q(X)))),
    labelled_explanation(q(dash), invalid_program, explanation(status(invalid_program),
        validation(undeclared_quantifier_domain(person,source_axioms([s13]),declared_types([dinosaur]))))).
test(vacuous_binder_and_same_named_constant_are_legal, [setup(assertz(user:domain(dinosaur,[dash]))), cleanup(clear_labelled_world)]) :-
    assertz(user:axiom(s13,forall(var('X',dinosaur),p('X')))),
    labelled_explanation(p(dash), unknown, explanation(status(unknown), _, _, _,
        domain_audit(_, outside_declared_domains([constant('X',source_axioms([s13]),goal(false))]), _),
        quantifier_audit([vacuous_quantifier(source_axiom(s13),path([]),forall,variable('X'),sort(dinosaur)),
                          constant_matches_binder_name(source_axiom(s13),binder_path([]),constant('X'))]), _)).
test(explicit_bound_reference_applies_to_domain_member, [setup(assertz(user:domain(dinosaur,[dash]))), cleanup(clear_labelled_world)]) :-
    assertz(user:axiom(s13,forall(var('X',dinosaur),p(var('X'))))),
    labelled_explanation(p(dash), entailed, explanation(status(entailed), _, _, _, _, quantifier_audit([]), _)).
test(vacuous_audit_respects_nested_shadowing, [setup(assertz(user:domain(person,[ada]))), cleanup(clear_labelled_world)]) :-
    assertz(user:axiom(s13,forall(var(x,person),exists(var(x,person),p(var(x)))))),
    labelled_explanation(p(ada), entailed, explanation(status(entailed), _, _, _, _,
        quantifier_audit([vacuous_quantifier(source_axiom(s13),path([]),forall,variable(x),sort(person))]), _)).
test(bound_variable_in_sibling_scope_is_free, [forall(member(Solver, [symbolic, enumerating]))]) :-
    solve_with(Solver, [domain(person,[ada])],
        [and(forall(var(x,person),atom(p,[var(x)])),atom(q,[var(x)]))], atom(p,[ada]),
        invalid_program, validation(free_variable(x,source_axioms([axiom(1)])))).

solve_with(symbolic, Domains, Axioms, Goal, Status, Certificate) :- finite_sat_status(Domains, Axioms, Goal, Status, Certificate).
solve_with(enumerating, Domains, Axioms, Goal, Status, Certificate) :- finite_status(Domains, Axioms, Goal, 64, Status, Certificate).

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
setup_outside_domain_world :-
    assertz(user:domain(person, [ada])),
    assertz(user:axiom(s1, calm(dash))),
    assertz(user:axiom(s2, rule([calm(X)], ready(X)))).
setup_branching_trace_world :-
    assertz(user:axiom(s1, calm(ada))),
    assertz(user:axiom(s2, rule([calm(X)], alert(X)))),
    assertz(user:axiom(s3, rule([calm(X), alert(X)], ready(X)))).
clear_labelled_world :-
    retractall(user:domain(_, _)),
    retractall(user:axiom(_, _)).

:- end_tests(finite_fol_meta_prover).
