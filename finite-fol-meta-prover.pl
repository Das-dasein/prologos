% Finite-domain object-FOL evaluator hosted in SWI-Prolog.
% This is deliberately not a general FOL prover: quantifiers range only over
% the explicit domain/2 values supplied by the caller.
:- module(finite_fol_meta_prover, [finite_status/6, finite_sat_status/5, labelled_semantic_status/3, labelled_explanation/3, semantic_status/3, semantic_slice_status/3, audit_trace/2, audit_proof_tree/2, near_signature_audit/3, meta_signatures/1, meta_help/2]).
:- use_module(library(clpb)).

% Read-only self-description for an agent running inside the same Prolog image.
% These facts are the human-facing contract; meta_signatures/1 filters them
% against the module's real exported predicates, so stale docs are visible.
% Example outputs are intentionally fresh variables; do not emit load warnings.
api_documentation(finite_status/6, finite_classical_model_check, example(finite_status([domain(person,[ada])], [atom(ready,[ada])], atom(ready,[ada]), 32, _Status, _Certificate))).
api_documentation(finite_sat_status/5, symbolic_classical_model_check, example(finite_sat_status([domain(person,[ada])], [atom(ready,[ada])], atom(ready,[ada]), _Status, _Certificate))).
api_documentation(labelled_semantic_status/3, labelled_agent_program_symbolic_check, example(labelled_semantic_status(ready(ada), _Status, _Certificate))).
api_documentation(labelled_explanation/3, labelled_status_with_conflict_core_signature_and_domain_audits, example(labelled_explanation(ready(ada), _Status, _Package))).
api_documentation(semantic_status/3, unlabelled_agent_program_model_check, example(semantic_status(ready(ada), _Status, _Certificate))).
api_documentation(semantic_slice_status/3, monadic_relevance_sliced_model_check, example(semantic_slice_status(ready(ada), _Status, _Certificate))).
api_documentation(audit_trace/2, labelled_forward_horn_trace_only, example(audit_trace(ready(ada), _Result))).
api_documentation(audit_proof_tree/2, labelled_forward_horn_dependency_tree_only, example(audit_proof_tree(ready(ada), _Result))).
api_documentation(near_signature_audit/3, advisory_near_object_predicate_names_without_repair, example(near_signature_audit(atom(receives_accolades,[clark]), [s1-atom(receive_accolades,[clark])], _Audit))).
api_documentation(meta_signatures/1, list_live_trusted_api_signatures, example(meta_signatures(_Signatures))).
api_documentation(meta_help/2, show_contract_for_signature_or_all, example(meta_help(all, _Documentation))).
meta_signatures(Signatures) :- findall(Signature, (api_documentation(Signature, _, _), Signature = Name/Arity, current_predicate(Name/Arity)), Signatures).
meta_help(all, Documentation) :- findall(documentation(Signature, Purpose, Example), api_documentation(Signature, Purpose, Example), Documentation).
meta_help(Signature, documentation(Signature, Purpose, Example)) :- api_documentation(Signature, Purpose, Example).

% Symbolic finite-model status. Unlike finite_status/6 it delegates Boolean
% search to SWI's CLP(B) solver, so it does not enumerate every valuation first.
finite_sat_status(Domains, Axioms, Goal, Status, Certificate) :-
    solver_validation(Domains, Axioms, Goal, Validation),
    ( Validation = invalid(Reason) -> Status = invalid_program, Certificate = validation(Reason)
    ; finite_sat_status_valid(Domains, Axioms, Goal, Status, Certificate)
    ).
finite_sat_status_valid(Domains, Axioms, Goal, Status, Certificate) :-
    vocabulary(Domains, Axioms, Goal, Vocabulary),
    ( satisfiable(Domains, Axioms, atom(true, []), Vocabulary, _BaseModel) ->
        truth_witness(Domains, Axioms, Goal, Vocabulary, Positive),
        truth_witness(Domains, Axioms, neg(Goal), Vocabulary, Negative),
        classify_sat_witnesses(Positive, Negative, Status, Certificate)
    ; Status = conflict, Certificate = conflict(no_admissible_model)
    ).
truth_witness(Domains, Axioms, Formula, Vocabulary, witness(Model)) :- satisfiable(Domains, Axioms, Formula, Vocabulary, Model), !.
truth_witness(_, _, _, _, none).
classify_sat_witnesses(witness(_), none, entailed, model_check(no_countermodel)).
classify_sat_witnesses(none, witness(_), contradicted, model_check(no_supporting_model)).
classify_sat_witnesses(witness(True), witness(False), unknown, open_pair(true_model(True), false_model(False))).

% The complete-trace interface preserves source IDs all the way to the result.
% The current certificate names every accepted source axiom; later conflict-core
% minimisation can safely refine it without changing the agent-facing program.
labelled_semantic_status(Goal, Status, Certificate) :-
    findall(domain(Type, Values), user:domain(Type, Values), Domains),
    findall(label(Id, Clause), user:axiom(Id, Clause), Labelled),
    catch((validate_domains(Domains), maplist(compile_labelled_axiom, Labelled, Compiled), validate_labelled_quantifier_domains(Domains, Compiled), pairs_values(Compiled, Axioms), compile_surface(Goal, [], CompiledGoal), validate_quantifier_domains(Domains, CompiledGoal)), error(invalid_surface(Reason), _), Compiled = invalid(Reason)),
    ( Compiled = invalid(Reason) -> Status = invalid_program, Certificate = validation(Reason)
    ; pairs_keys(Compiled, SourceIds), finite_sat_status(Domains, Axioms, CompiledGoal, Status, Inner), Certificate = source_trace(source_axioms(SourceIds), Inner)
    ).
% Conflict diagnostics for a labelled agent program.  A returned core is
% subset-minimal: deleting any one remaining labelled formula restores a model.
% It is not claimed to be minimum-cardinality and no proof tree is fabricated.
labelled_explanation(Goal, Status, Package) :-
    labelled_compilation(Goal, Domains, Compiled, CompiledGoal, Result),
    ( Result = invalid(Reason) ->
        Status = invalid_program,
        Package = explanation(status(invalid_program), validation(Reason))
    ; Result = valid,
      pairs_keys(Compiled, SourceIds),
      pairs_values(Compiled, Axioms),
      signature_audit(CompiledGoal, Axioms, SignatureAudit),
      near_signature_audit(CompiledGoal, Compiled, NearSignatureAudit),
      domain_audit(Domains, Compiled, CompiledGoal, DomainAudit),
      quantifier_audit(Compiled, CompiledGoal, QuantifierAudit),
      finite_sat_status(Domains, Axioms, CompiledGoal, Status, Inner),
      ( Status = conflict ->
          subset_minimal_conflict_core(Domains, Compiled, Core),
          pairs_keys(Core, CoreIds),
          Package = explanation(status(conflict), source_axioms(SourceIds), SignatureAudit, NearSignatureAudit, DomainAudit, QuantifierAudit, subset_minimal_conflict_core(core_ids(CoreIds), core_formulas(Core)), certificate(Inner))
      ; Package = explanation(status(Status), source_axioms(SourceIds), SignatureAudit, NearSignatureAudit, DomainAudit, QuantifierAudit, certificate(Inner))
      )
    ).
labelled_compilation(Goal, Domains, Compiled, CompiledGoal, Result) :-
    findall(domain(Type, Values), user:domain(Type, Values), Domains),
    findall(label(Id, Clause), user:axiom(Id, Clause), Labelled),
    catch((validate_domains(Domains), maplist(compile_labelled_axiom, Labelled, Compiled), validate_labelled_quantifier_domains(Domains, Compiled), compile_surface(Goal, [], CompiledGoal), validate_quantifier_domains(Domains, CompiledGoal), Result = valid), error(invalid_surface(Reason), _), Result = invalid(Reason)).
subset_minimal_conflict_core(Domains, Labelled, Core) :-
    reduce_conflict(Domains, Labelled, Core).
reduce_conflict(Domains, Current, Core) :-
    select(_, Current, Without),
    labelled_inconsistent(Domains, Without), !,
    reduce_conflict(Domains, Without, Core).
reduce_conflict(_, Core, Core).
labelled_inconsistent(Domains, Labelled) :-
    pairs_values(Labelled, Axioms),
    vocabulary(Domains, Axioms, atom(true, []), Vocabulary),
    \+ satisfiable(Domains, Axioms, atom(true, []), Vocabulary, _).
compile_labelled_axiom(label(Id, Surface), Id-Compiled) :- atom(Id), compile_axiom(Surface, Compiled).
pairs_keys([], []).
pairs_keys([Key-_|Rest], [Key|Keys]) :- pairs_keys(Rest, Keys).
pairs_values([], []).
pairs_values([_-Value|Rest], [Value|Values]) :- pairs_values(Rest, Values).

% This is an audit of the agent's submitted language, not an additional
% logical assumption.  A symbol occurring only in Goal is legal object FOL:
% it simply means the supplied world puts no direct constraint on it.  Keeping
% that fact in the evidence package makes a trivial unknown inspectable.
signature_audit(Goal, Axioms, signature_audit(goal_predicates(GoalSymbols), world_predicates(WorldSymbols), only_in_goal(OnlyInGoal))) :-
    formula_predicates(Goal, RawGoalSymbols),
    formulas_predicates(Axioms, RawWorldSymbols),
    sort(RawGoalSymbols, GoalSymbols),
    sort(RawWorldSymbols, WorldSymbols),
    subtract(GoalSymbols, WorldSymbols, OnlyInGoal).

% This is metaprogramming over the reified object-FOL terms, never a repair
% rule. It reports names and arities for comparison with the source text.
near_signature_audit(Goal, Labelled, near_signature_audit(query_related(QueryPairs), world_internal(WorldPairs))) :-
    formula_predicates(Goal, RawGoalSymbols), sort(RawGoalSymbols, GoalSymbols),
    pairs_values(Labelled, Axioms), formulas_predicates(Axioms, RawWorldSymbols), sort(RawWorldSymbols, WorldSymbols),
    near_signature_pairs(GoalSymbols, WorldSymbols, QueryPairs),
    near_signature_pairs(WorldSymbols, WorldSymbols, RawWorldPairs), sort(RawWorldPairs, WorldPairs).
near_signature_pairs([], _, []).
near_signature_pairs([Left|Rest], RightSymbols, Pairs) :-
    findall(near_pair(Left, Right, edit_distance(Distance)), (member(Right, RightSymbols), near_distinct_signatures(Left, Right, Distance)), First),
    near_signature_pairs(Rest, RightSymbols, Remaining), append(First, Remaining, Pairs).
near_distinct_signatures(LeftName/Arity, RightName/Arity, Distance) :-
    LeftName \== RightName, atom_edit_distance(LeftName, RightName, Distance), Distance =< 1.
atom_edit_distance(Left, Right, Distance) :-
    atom_chars(Left, LeftChars), atom_chars(Right, RightChars), length(RightChars, RightLength), numlist(0, RightLength, InitialRow),
    foldl(edit_distance_row(RightChars), LeftChars, state(1, InitialRow), state(_, FinalRow)), last(FinalRow, Distance).
edit_distance_row(RightChars, LeftChar, state(Index, Previous), state(NextIndex, [Index|Cells])) :-
    edit_distance_cells(LeftChar, RightChars, Previous, Index, Cells), NextIndex is Index + 1.
edit_distance_cells(_, [], [_], _, []).
edit_distance_cells(LeftChar, [RightChar|RightRest], [Diagonal, Above|PreviousRest], Left, [Cell|Cells]) :-
    ( LeftChar = RightChar -> Cost = 0 ; Cost = 1 ),
    Insert is Left + 1, Delete is Above + 1, Replace is Diagonal + Cost,
    min_list([Insert, Delete, Replace], Cell),
    edit_distance_cells(LeftChar, RightRest, [Above|PreviousRest], Cell, Cells).
formulas_predicates([], []).
formulas_predicates([Formula|Rest], Symbols) :-
    formula_predicates(Formula, First),
    formulas_predicates(Rest, Remaining),
    append(First, Remaining, Symbols).
formula_predicates(atom(true, []), []) :- !.
formula_predicates(atom(Name, Arguments), [Name/Arity]) :- !, length(Arguments, Arity).
formula_predicates(neg(Formula), Symbols) :- !, formula_predicates(Formula, Symbols).
formula_predicates(forall(_, Formula), Symbols) :- !, formula_predicates(Formula, Symbols).
formula_predicates(exists(_, Formula), Symbols) :- !, formula_predicates(Formula, Symbols).
formula_predicates(and(Left, Right), Symbols) :- !, formula_predicates(Left, LeftSymbols), formula_predicates(Right, RightSymbols), append(LeftSymbols, RightSymbols, Symbols).
formula_predicates(or(Left, Right), Symbols) :- !, formula_predicates(Left, LeftSymbols), formula_predicates(Right, RightSymbols), append(LeftSymbols, RightSymbols, Symbols).
formula_predicates(xor(Left, Right), Symbols) :- !, formula_predicates(Left, LeftSymbols), formula_predicates(Right, RightSymbols), append(LeftSymbols, RightSymbols, Symbols).
formula_predicates(implies(Left, Right), Symbols) :- !, formula_predicates(Left, LeftSymbols), formula_predicates(Right, RightSymbols), append(LeftSymbols, RightSymbols, Symbols).

% Domain completeness is observable structural evidence.  It deliberately
% reports rather than repairs: an agent must decide whether a name belongs to
% a declared quantified sort.  The report names the affected source clauses.
domain_audit(Domains, Labelled, Goal, domain_audit(declared_domains(Domains), outside_declared_domains(Outside), quantified_rules(QuantifiedIds))) :-
    domain_values(Domains, DomainValues),
    labelled_constants(Labelled, ConstantSources),
    formula_constants_list(Goal, GoalConstants),
    append(GoalConstants, ConstantSources, AllConstants), sort(AllConstants, Constants),
    outside_constants(Constants, DomainValues, Labelled, GoalConstants, Outside),
    quantified_source_ids(Labelled, QuantifiedIds).
domain_values([], []).
domain_values([domain(_, Values)|Rest], AllValues) :- domain_values(Rest, Remaining), append(Values, Remaining, AllValues).
labelled_constants([], []).
labelled_constants([_-Formula|Rest], Constants) :- formula_constants_list(Formula, First), labelled_constants(Rest, Remaining), append(First, Remaining, Constants).
formula_constants_list(Formula, Constants) :- findall(Constant, formula_constants(Formula, Constant), Constants).
outside_constants([], _, _, _, []).
outside_constants([Constant|Rest], DomainValues, Labelled, GoalConstants, Outside) :-
    outside_constants(Rest, DomainValues, Labelled, GoalConstants, Remaining),
    ( memberchk(Constant, DomainValues) -> Outside = Remaining
    ; source_ids_for_constant(Constant, Labelled, Ids), ( memberchk(Constant, GoalConstants) -> InGoal = true ; InGoal = false ), Outside = [constant(Constant, source_axioms(Ids), goal(InGoal))|Remaining]
    ).
source_ids_for_constant(Constant, Labelled, Ids) :- findall(Id, (member(Id-Formula, Labelled), formula_constants(Formula, Constant)), RawIds), sort(RawIds, Ids).
quantified_source_ids(Labelled, Ids) :- findall(Id, (member(Id-Formula, Labelled), contains_quantifier(Formula)), RawIds), sort(RawIds, Ids).
validate_labelled_quantifier_domains(Domains, Labelled) :-
    forall(member(Id-Formula, Labelled), validate_quantifier_domains(Domains, Formula, Id)).
validate_quantifier_domains(Domains, Formula) :- validate_quantifier_domains(Domains, Formula, goal).
validate_quantifier_domains(Domains, Formula, Source) :-
    ( ground(Formula) -> validate_closed_formula(Formula, Domains, [], Source)
    ; throw(error(invalid_surface(nonground_formula(source_axioms([Source]))), _)) ).

% Every public finite solver accepts closed object formulas. Failure to build
% a Boolean expression is a contract error, never evidence of inconsistency.
solver_validation(Domains, Axioms, Goal, Result) :-
    catch((validate_domains(Domains),
           ( is_list(Axioms) -> true ; throw(error(invalid_surface(axioms_must_be_list), _)) ),
           forall(nth1(Index, Axioms, Formula), validate_quantifier_domains(Domains, Formula, axiom(Index))),
           validate_quantifier_domains(Domains, Goal), Result = valid),
          error(invalid_surface(Reason), _), Result = invalid(Reason)).
validate_closed_formula(atom(Name, Args), _, Bound, Source) :- !,
    ( atom(Name), is_list(Args) -> maplist(validate_closed_argument(Bound, Source), Args)
    ; throw(error(invalid_surface(bad_reified_atom(Name, Args)), _)) ).
validate_closed_formula(Formula, Domains, Bound, Source) :-
    Formula =.. [Kind, var(Name, Type), Body], memberchk(Kind, [forall, exists]), !,
    ( atom(Name), atom(Type) -> true ; throw(error(invalid_surface(bad_quantifier(Name, Type)), _)) ),
    findall(Declared, member(domain(Declared, _), Domains), Types),
    ( memberchk(domain(Type, _), Domains) -> validate_closed_formula(Body, Domains, [Name|Bound], Source)
    ; throw(error(invalid_surface(undeclared_quantifier_domain(Type, source_axioms([Source]), declared_types(Types))), _)) ).
validate_closed_formula(neg(Body), Domains, Bound, Source) :- !, validate_closed_formula(Body, Domains, Bound, Source).
validate_closed_formula(Formula, Domains, Bound, Source) :-
    Formula =.. [Kind, Left, Right], memberchk(Kind, [and, or, xor, implies]), !,
    validate_closed_formula(Left, Domains, Bound, Source), validate_closed_formula(Right, Domains, Bound, Source).
validate_closed_formula(Formula, _, _, _) :- throw(error(invalid_surface(bad_formula(Formula)), _)).
validate_closed_argument(Bound, Source, var(Name)) :- atom(Name), !,
    ( memberchk(Name, Bound) -> true ; throw(error(invalid_surface(free_variable(Name, source_axioms([Source]))), _)) ).
validate_closed_argument(_, _, const(Value)) :- atom(Value), !.
validate_closed_argument(_, _, Value) :- atom(Value), !.
validate_closed_argument(_, _, Argument) :- throw(error(invalid_surface(non_atomic_argument(Argument)), _)).

% Vacuous binders and same-named constants are legal. Report their structure
% without guessing intent or rewriting constants. Paths distinguish binders
% even when nested quantifiers shadow the same object-variable name.
quantifier_audit(Labelled, Goal, quantifier_audit(Findings)) :-
    findall(Finding, (member(Source-Formula, Labelled), quantifier_finding(Formula, source_axiom(Source), [], Finding)), WorldFindings),
    findall(Finding, quantifier_finding(Goal, goal, [], Finding), GoalFindings),
    append(WorldFindings, GoalFindings, Findings).
quantifier_finding(Formula, Source, Path, Finding) :-
    Formula =.. [Kind, var(Name, Type), Body], memberchk(Kind, [forall, exists]), !,
    ( \+ bound_occurrence(Body, Name), Finding = vacuous_quantifier(Source, path(Path), Kind, variable(Name), sort(Type))
    ; formula_constants_list(Body, Constants), memberchk(Name, Constants), Finding = constant_matches_binder_name(Source, binder_path(Path), constant(Name))
    ; append(Path, [body], Next), quantifier_finding(Body, Source, Next, Finding)
    ).
quantifier_finding(neg(Body), Source, Path, Finding) :- !,
    append(Path, [body], Next), quantifier_finding(Body, Source, Next, Finding).
quantifier_finding(Formula, Source, Path, Finding) :-
    Formula =.. [Kind, Left, Right], memberchk(Kind, [and, or, xor, implies]),
    ( append(Path, [left], Next), quantifier_finding(Left, Source, Next, Finding)
    ; append(Path, [right], Next), quantifier_finding(Right, Source, Next, Finding) ).
bound_occurrence(atom(_, Args), Name) :- memberchk(var(Name), Args).
bound_occurrence(neg(Body), Name) :- bound_occurrence(Body, Name).
bound_occurrence(Formula, Name) :-
    Formula =.. [Kind, var(InnerName, _), Body], memberchk(Kind, [forall, exists]),
    InnerName \== Name, bound_occurrence(Body, Name).
bound_occurrence(Formula, Name) :-
    Formula =.. [Kind, Left, Right], memberchk(Kind, [and, or, xor, implies]),
    ( bound_occurrence(Left, Name) ; bound_occurrence(Right, Name) ).
contains_quantifier(forall(_, _)) :- !.
contains_quantifier(exists(_, _)) :- !.
contains_quantifier(neg(Formula)) :- !, contains_quantifier(Formula).
contains_quantifier(and(Left, Right)) :- !, (contains_quantifier(Left); contains_quantifier(Right)).
contains_quantifier(or(Left, Right)) :- !, (contains_quantifier(Left); contains_quantifier(Right)).
contains_quantifier(xor(Left, Right)) :- !, (contains_quantifier(Left); contains_quantifier(Right)).
contains_quantifier(implies(Left, Right)) :- !, (contains_quantifier(Left); contains_quantifier(Right)).

satisfiable(Domains, Axioms, Assumption, Vocabulary, Model) :-
    pairs_for_vocabulary(Vocabulary, Pairs),
    axiom_expressions(Axioms, Domains, Pairs, AxiomExpressions),
    formula_expression(Assumption, Domains, [], Pairs, AssumptionExpression),
    conjoin([AssumptionExpression|AxiomExpressions], Constraint),
    sat(Constraint), term_variables(Pairs, Variables), labeling(Variables),
    findall(Atom, member(Atom-1, Pairs), Model).
pairs_for_vocabulary([], []).
pairs_for_vocabulary([Atom|Rest], [Atom-_Value|Pairs]) :- pairs_for_vocabulary(Rest, Pairs).
axiom_expressions([], _, _, []).
axiom_expressions([Formula|Rest], Domains, Pairs, [Expression|Expressions]) :- formula_expression(Formula, Domains, [], Pairs, Expression), axiom_expressions(Rest, Domains, Pairs, Expressions).
formula_expression(atom(true, []), _, _, _, 1) :- !.
formula_expression(atom(Name, Args), _, Environment, Pairs, Value) :- instantiate_args(Args, Environment, GroundArgs), memberchk(holds(Name, GroundArgs)-Value, Pairs).
formula_expression(neg(F), D, E, P, Expression) :- formula_expression(F, D, E, P, Inner), Expression =.. ['~', Inner].
formula_expression(and(L, R), D, E, P, Expression) :- formula_expression(L, D, E, P, Left), formula_expression(R, D, E, P, Right), Expression =.. ['*', Left, Right].
formula_expression(or(L, R), D, E, P, Expression) :- formula_expression(L, D, E, P, Left), formula_expression(R, D, E, P, Right), Expression =.. ['+', Left, Right].
formula_expression(xor(L, R), D, E, P, Expression) :- formula_expression(L, D, E, P, Left), formula_expression(R, D, E, P, Right), Expression =.. ['#', Left, Right].
formula_expression(implies(L, R), D, E, P, Expression) :- formula_expression(L, D, E, P, Left), formula_expression(R, D, E, P, Right), NotLeft =.. ['~', Left], Expression =.. ['+', NotLeft, Right].
formula_expression(forall(var(Name, Type), F), D, E, P, Expression) :- domain_values(Type, D, Constants), quantified_expressions(Constants, Name, F, D, E, P, Expressions), conjoin(Expressions, Expression).
formula_expression(exists(var(Name, Type), F), D, E, P, Expression) :- domain_values(Type, D, Constants), quantified_expressions(Constants, Name, F, D, E, P, Expressions), disjoin(Expressions, Expression).
quantified_expressions([], _, _, _, _, _, []).
quantified_expressions([Constant|Rest], Name, Formula, Domains, Environment, Pairs, [Expression|Expressions]) :- formula_expression(Formula, Domains, [binding(Name, Constant)|Environment], Pairs, Expression), quantified_expressions(Rest, Name, Formula, Domains, Environment, Pairs, Expressions).
conjoin([], 1).
conjoin([One|Rest], Expression) :- fold_conjunction(Rest, One, Expression).
fold_conjunction([], Current, Current).
fold_conjunction([Next|Rest], Current, Expression) :- Combined =.. ['*', Current, Next], fold_conjunction(Rest, Combined, Expression).
disjoin([], 0).
disjoin([One|Rest], Expression) :- fold_disjunction(Rest, One, Expression).
fold_disjunction([], Current, Current).
fold_disjunction([Next|Rest], Current, Expression) :- Combined =.. ['+', Current, Next], fold_disjunction(Rest, Combined, Expression).

% A deliberately small, human-auditable forward trace over labelled ordinary
% facts and rules. It does not pretend that XOR/disjunction/negation are Horn
% proof steps: those remain visible in the program but yield no fabricated path.
% Candidate forms: axiom(s1, fact(calm(ada))).
%                  axiom(s1, calm(ada)).
%                 axiom(s2, rule([calm(X)], ready(X))).
audit_trace(Goal, Result) :-
    findall(item(Id, Clause), user:axiom(Id, Clause), Items),
    ( Items = [] -> Result = invalid_program(requires_labelled_axiom_2)
    ; ground(Goal) -> initial_trace_items(Items, Known),
      ( Known = [] -> self_supporting_rule_ids(Items, SelfSupporting),
        Result = invalid_program(no_traceable_base_facts(self_supporting_rules(SelfSupporting)))
      ; trace_until(Goal, Items, Known, 64, Result)
      )
    ; Result = invalid_goal(requires_ground_goal(Goal))
    ).

initial_trace_items([], []).
initial_trace_items([item(Id, fact(Literal))|Rest], [known(Literal, fact(Id))|KnownRest]) :- trace_literal(Literal), !, initial_trace_items(Rest, KnownRest).
initial_trace_items([item(Id, Literal)|Rest], [known(Literal, fact(Id))|KnownRest]) :- trace_literal(Literal), !, initial_trace_items(Rest, KnownRest).
initial_trace_items([_|Rest], Known) :- initial_trace_items(Rest, Known).
self_supporting_rule_ids(Items, Ids) :-
    findall(Id, (member(item(Id, rule([Only], Head)), Items), Only =@= Head), Ids).
trace_literal(Literal) :- compound(Literal), Literal =.. [Name|_], \+ memberchk(Name, [fact, rule, not, and, or, xor, implies, forall, exists]).
trace_until(Goal, _, Known, _, proof(Goal, Known)) :- member(known(Fact, _), Known), Fact = Goal, !.
trace_until(_, _, _, 0, no_forward_trace(depth_limit)).
trace_until(Goal, Items, Known, Remaining, Result) :-
    trace_extensions(Items, Known, Extensions),
    exclude(already_known(Known), Extensions, Fresh),
    ( Fresh = [] -> Result = no_forward_trace(no_supported_rule_path)
    ; NextRemaining is Remaining - 1, append(Known, Fresh, Next), trace_until(Goal, Items, Next, NextRemaining, Result)
    ).
already_known(Known, known(Fact, _)) :- member(known(Existing, _), Known), Existing =@= Fact.
trace_extensions(Items, Known, Extensions) :-
    findall(known(Head, step(Id, BodyTraces)), (member(item(Id, rule(Body, Head)), Items), is_list(Body), trace_literal(Head), trace_body(Body, Known, BodyTraces)), Extensions).
trace_body([], _, []).
trace_body([Need|Rest], Known, [known(Have, Provenance)|Traces]) :- trace_literal(Need), member(known(Have, Provenance), Known), Need = Have, trace_body(Rest, Known, Traces).

% A nested, inspectable view of the same successful forward derivation used by
% audit_trace/2.  This is intentionally only a Horn dependency tree, not a
% natural-deduction proof of arbitrary FOL: disjunction, XOR, negation and
% quantifier steps have no invented proof rules here.
audit_proof_tree(Goal, Result) :-
    audit_trace(Goal, TraceResult),
    ( TraceResult = proof(Goal, Known) ->
        trace_proof_tree(Goal, Known, [], Tree),
        Result = proof_tree(Goal, Tree)
    ; Result = TraceResult
    ).

trace_proof_tree(Fact, _Known, Seen, cycle_reference(Fact)) :-
    memberchk(Fact, Seen), !.
trace_proof_tree(Fact, Known, _Seen, fact(Fact, axiom(Id))) :-
    member(known(Have, fact(Id)), Known),
    Have = Fact, !.
trace_proof_tree(Fact, Known, Seen, derived(Fact, rule(Id), Children)) :-
    member(known(Have, step(Id, BodyTraces)), Known),
    Have = Fact, !,
    trace_children(BodyTraces, Known, [Fact|Seen], Children).

trace_children([], _, _, []).
trace_children([known(Fact, _)|Rest], Known, Seen, [Tree|Trees]) :-
    trace_proof_tree(Fact, Known, Seen, Tree),
    trace_children(Rest, Known, Seen, Trees).

% Agent-facing convenience layer.  The candidate remains normal Prolog:
%   domain(person, [ada]).
%   axiom(fact(calm(ada))).
%   axiom(rule([calm(X)], ready(X))).
%   semantic_status(ready(ada), Status, Certificate).
% It is intentionally a small observed surface, compiled internally to the
% object formulas below.  Bad surface programs become data, not runtime errors.
semantic_status(Goal, Status, Certificate) :-
    semantic_status_with_budget(Goal, 256, Status, Certificate).

% Like semantic_status/3, but first removes disconnected predicates and, for
% monadic rule worlds only, irrelevant individuals.  The certificate records
% the slice; if its safety preconditions do not hold it reports that fact rather
% than silently changing the model.
semantic_slice_status(Goal, Status, Certificate) :-
    semantic_program(Goal, Compiled, Domains),
    ( Compiled = invalid(Reason) -> Status = invalid_program, Certificate = validation(Reason)
    ; Compiled = compiled(Axioms, CompiledGoal),
      ( monadic_program(Axioms, CompiledGoal) ->
          relevant_axioms(Axioms, CompiledGoal, RelevantAxioms),
          relevant_domains(Domains, RelevantAxioms, CompiledGoal, RelevantDomains),
          finite_status(RelevantDomains, RelevantAxioms, CompiledGoal, 65536, Status, Inner),
          length(Axioms, Total), length(RelevantAxioms, Kept),
          Certificate = sliced(total_axioms(Total), kept_axioms(Kept), Inner)
      ; Status = slice_not_applicable,
        Certificate = validation(requires_monadic_predicates)
      )
    ).

semantic_status_with_budget(Goal, MaxModels, Status, Certificate) :-
    semantic_program(Goal, Compiled, Domains),
    ( Compiled = invalid(Reason) ->
        Status = invalid_program,
        Certificate = validation(Reason)
    ; Compiled = compiled(ProgramAxioms, ProgramGoal),
      finite_status(Domains, ProgramAxioms, ProgramGoal, MaxModels, Status, Certificate)
    ).

semantic_program(Goal, Compiled, Domains) :-
    findall(domain(Type, Values), user:domain(Type, Values), Domains),
    findall(Axiom, user:axiom(Axiom), SurfaceAxioms),
    catch((compile_agent_program(Domains, SurfaceAxioms, Goal, CompiledAxioms, CompiledGoal), Compiled = compiled(CompiledAxioms, CompiledGoal)), error(invalid_surface(Reason), _), Compiled = invalid(Reason)).

formula_signatures(atom(Name, Args), [Name/Arity]) :- length(Args, Arity).
formula_signatures(neg(F), S) :- formula_signatures(F, S).
formula_signatures(forall(_, F), S) :- formula_signatures(F, S).
formula_signatures(exists(_, F), S) :- formula_signatures(F, S).
formula_signatures(and(L, R), S) :- formula_signatures(L, LS), formula_signatures(R, RS), append(LS, RS, All), sort(All, S).
formula_signatures(or(L, R), S) :- formula_signatures(L, LS), formula_signatures(R, RS), append(LS, RS, All), sort(All, S).
formula_signatures(xor(L, R), S) :- formula_signatures(L, LS), formula_signatures(R, RS), append(LS, RS, All), sort(All, S).
formula_signatures(implies(L, R), S) :- formula_signatures(L, LS), formula_signatures(R, RS), append(LS, RS, All), sort(All, S).
monadic_program(Axioms, Goal) :- append(Axioms, [Goal], Formulas), forall(member(F, Formulas), (formula_signatures(F, S), forall(member(_/Arity, S), Arity =< 1))).
relevant_axioms(Axioms, Goal, Relevant) :- formula_signatures(Goal, Start), expand_relevance(Axioms, Start, Signatures), include(relevant_to(Signatures), Axioms, Relevant).
expand_relevance(Axioms, Current, Final) :- findall(S, (member(A, Axioms), formula_signatures(A, S), intersects(S, Current)), Nested), append([Current|Nested], All), sort(All, Next), ( Next == Current -> Final = Current ; expand_relevance(Axioms, Next, Final) ).
intersects(Left, Right) :- member(X, Left), memberchk(X, Right), !.
relevant_to(Signatures, Formula) :- formula_signatures(Formula, Here), intersects(Signatures, Here).
relevant_domains(Domains, Axioms, Goal, [domain(person, Constants)]) :-
    append(Axioms, [Goal], Formulas), findall(Constant, (member(F, Formulas), formula_constants(F, Constant)), Found), sort(Found, Constants), Constants \= [], !,
    memberchk(domain(person, _), Domains).
relevant_domains(Domains, _, _, Domains).
formula_constants(atom(_, Args), Constant) :- member(Constant, Args), atom(Constant).
formula_constants(neg(F), C) :- formula_constants(F, C).
formula_constants(forall(_, F), C) :- formula_constants(F, C).
formula_constants(exists(_, F), C) :- formula_constants(F, C).
formula_constants(and(L, R), C) :- (formula_constants(L, C); formula_constants(R, C)).
formula_constants(or(L, R), C) :- (formula_constants(L, C); formula_constants(R, C)).
formula_constants(xor(L, R), C) :- (formula_constants(L, C); formula_constants(R, C)).
formula_constants(implies(L, R), C) :- (formula_constants(L, C); formula_constants(R, C)).

compile_agent_program(Domains, SurfaceAxioms, Goal, CompiledAxioms, CompiledGoal) :-
    validate_domains(Domains),
    maplist(compile_axiom, SurfaceAxioms, CompiledAxioms),
    compile_surface(Goal, [], CompiledGoal),
    forall(nth1(Index, CompiledAxioms, Formula), validate_quantifier_domains(Domains, Formula, axiom(Index))),
    validate_quantifier_domains(Domains, CompiledGoal).

validate_domains([]) :- throw(error(invalid_surface(no_domain_declarations), _)).
validate_domains([domain(Type, Values)|Rest]) :-
    ( atom(Type), is_list(Values), Values \= [], maplist(atom, Values) -> true ; throw(error(invalid_surface(bad_domain(Type, Values)), _)) ),
    validate_domains_tail(Rest).
validate_domains_tail([]).
validate_domains_tail([domain(Type, Values)|Rest]) :-
    ( atom(Type), is_list(Values), Values \= [], maplist(atom, Values) -> true ; throw(error(invalid_surface(bad_domain(Type, Values)), _)) ),
    validate_domains_tail(Rest).

compile_axiom(fact(Formula), Compiled) :- !, compile_surface(Formula, [], Compiled).
compile_axiom(rule(Body, Head), Compiled) :- !,
    ( is_list(Body) -> true ; throw(error(invalid_surface(rule_body_must_be_list(Body)), _)) ),
    term_variables(rule(Body, Head), Variables),
    compile_body(Body, Variables, CompiledBody),
    compile_surface(Head, Variables, CompiledHead),
    close_rule(Variables, Variables, implies(CompiledBody, CompiledHead), Compiled).
compile_axiom(Axiom, Compiled) :- compile_surface(Axiom, [], Compiled).

compile_body([], _, atom(true, [])).
compile_body([Formula], Variables, Compiled) :- !, compile_surface(Formula, Variables, Compiled).
compile_body([Formula|Rest], Variables, and(Compiled, More)) :- compile_surface(Formula, Variables, Compiled), compile_body(Rest, Variables, More).
close_rule(_, [], Formula, Formula).
close_rule(AllVariables, [Variable|Rest], Formula, forall(var(Name, person), Closed)) :- variable_name(Variable, AllVariables, Name), close_rule(AllVariables, Rest, Formula, Closed).

compile_surface(not(Formula), Variables, neg(Compiled)) :- !, compile_surface(Formula, Variables, Compiled).
% The symbolic API publishes this canonical reified formula surface itself.
% Accept it in labelled programs as well, so source IDs and explanations are
% preserved when an agent uses the documented atom(Name, [Args]) notation.
compile_surface(atom(Name, RawArguments), Variables, atom(Name, Arguments)) :- !,
    ( atom(Name), is_list(RawArguments) -> compile_arguments(RawArguments, Variables, Arguments) ; throw(error(invalid_surface(bad_reified_atom(Name, RawArguments)), _)) ).
compile_surface(forall(var(Name, Type), Formula), Variables, forall(var(Name, Type), Compiled)) :- !,
    ( atom(Name), atom(Type) -> compile_surface(Formula, Variables, Compiled) ; throw(error(invalid_surface(bad_quantifier(Name, Type)), _)) ).
compile_surface(exists(var(Name, Type), Formula), Variables, exists(var(Name, Type), Compiled)) :- !,
    ( atom(Name), atom(Type) -> compile_surface(Formula, Variables, Compiled) ; throw(error(invalid_surface(bad_quantifier(Name, Type)), _)) ).
compile_surface((Left, Right), Variables, and(CompiledLeft, CompiledRight)) :- !, compile_surface(Left, Variables, CompiledLeft), compile_surface(Right, Variables, CompiledRight).
compile_surface(and(Left, Right), Variables, and(CompiledLeft, CompiledRight)) :- !, compile_surface(Left, Variables, CompiledLeft), compile_surface(Right, Variables, CompiledRight).
compile_surface(or(Left, Right), Variables, or(CompiledLeft, CompiledRight)) :- !, compile_surface(Left, Variables, CompiledLeft), compile_surface(Right, Variables, CompiledRight).
compile_surface(xor(Left, Right), Variables, xor(CompiledLeft, CompiledRight)) :- !, compile_surface(Left, Variables, CompiledLeft), compile_surface(Right, Variables, CompiledRight).
compile_surface(implies(Left, Right), Variables, implies(CompiledLeft, CompiledRight)) :- !, compile_surface(Left, Variables, CompiledLeft), compile_surface(Right, Variables, CompiledRight).
compile_surface(Formula, Variables, atom(Name, Arguments)) :-
    compound(Formula), Formula =.. [Name|RawArguments], atom(Name),
    compile_arguments(RawArguments, Variables, Arguments), !.
compile_surface(Formula, _, _) :- throw(error(invalid_surface(bad_formula(Formula)), _)).

compile_arguments([], _, []).
compile_arguments([Argument|Rest], Variables, [Compiled|CompiledRest]) :- compile_argument(Argument, Variables, Compiled), compile_arguments(Rest, Variables, CompiledRest).
compile_argument(Argument, Variables, var(Name)) :- var(Argument), !, variable_name(Argument, Variables, Name).
compile_argument(var(Name), _, var(Name)) :- atom(Name), !.
compile_argument(Argument, _, Argument) :- atom(Argument), !.
compile_argument(Argument, _, _) :- throw(error(invalid_surface(non_atomic_argument(Argument)), _)).
variable_name(Variable, Variables, Name) :- nth1(Index, Variables, Existing), Variable == Existing, atom_concat(v, Index, Name).

% finite_status(+Domains, +Axioms, +Goal, +MaxCandidateModels,
%               -Status, -Certificate).
% Domains are domain(Type, [Constant,...]).  Formulas use atom(Name, Args),
% neg/1, and/2, or/2, xor/2, implies/2, forall(var(Name, Type), Formula),
% exists(var(Name, Type), Formula). Arguments are constants or var(Name).
finite_status(Domains, Axioms, Goal, MaxModels, Status, Certificate) :-
    must_be(nonneg, MaxModels),
    solver_validation(Domains, Axioms, Goal, Validation),
    ( Validation = invalid(Reason) -> Status = invalid_program, Certificate = validation(Reason)
    ; finite_status_valid(Domains, Axioms, Goal, MaxModels, Status, Certificate)
    ).
finite_status_valid(Domains, Axioms, Goal, MaxModels, Status, Certificate) :-
    vocabulary(Domains, Axioms, Goal, Vocabulary),
    length(Vocabulary, AtomCount),
    power_of_two(AtomCount, CandidateCount),
    ( CandidateCount > MaxModels ->
        Status = budget_exhausted,
        Certificate = budget(candidate_models(CandidateCount), maximum(MaxModels))
    ; findall(Model, admissible_model(Domains, Axioms, Vocabulary, Model), Models),
      classify_models(Domains, Goal, Models, Status, Certificate)
    ).

power_of_two(0, 1).
power_of_two(Exponent, Value) :-
    Exponent > 0,
    Previous is Exponent - 1,
    power_of_two(Previous, Partial),
    Value is Partial * 2.

admissible_model(Domains, Axioms, Vocabulary, Model) :-
    model_for(Vocabulary, Model),
    maplist(formula_true(Domains, Model), Axioms).

formula_true(Domains, Model, Formula) :-
    eval_formula(Formula, Domains, [], Model, true).

model_for([], []).
model_for([_Atom|Rest], Model) :- model_for(Rest, Model).
model_for([Atom|Rest], [Atom|Model]) :- model_for(Rest, Model).

classify_models(_, _, [], conflict, conflict(no_admissible_model)).
classify_models(Domains, Goal, Models, Status, Certificate) :-
    partition_models(Domains, Goal, Models, TrueModels, FalseModels),
    length(Models, Count),
    ( FalseModels == [] ->
        Status = entailed,
        Certificate = model_check(admissible_models(Count), no_countermodel)
    ; TrueModels == [] ->
        Status = contradicted,
        Certificate = model_check(admissible_models(Count), no_supporting_model)
    ; TrueModels = [TrueWitness|_], FalseModels = [FalseWitness|_],
      Status = unknown,
      Certificate = open_pair(true_model(TrueWitness), false_model(FalseWitness))
    ).

partition_models(_, _, [], [], []).
partition_models(Domains, Goal, [Model|Rest], [Model|True], False) :-
    eval_formula(Goal, Domains, [], Model, true), !,
    partition_models(Domains, Goal, Rest, True, False).
partition_models(Domains, Goal, [Model|Rest], True, [Model|False]) :-
    eval_formula(Goal, Domains, [], Model, false),
    partition_models(Domains, Goal, Rest, True, False).

eval_formula(atom(Name, Args), _, Environment, Model, Value) :-
    instantiate_args(Args, Environment, GroundArgs),
    ( memberchk(holds(Name, GroundArgs), Model) -> Value = true ; Value = false ).
eval_formula(neg(Formula), Domains, Environment, Model, Value) :-
    eval_formula(Formula, Domains, Environment, Model, Input), flip(Input, Value).
eval_formula(and(Left, Right), Domains, Environment, Model, Value) :-
    eval_formula(Left, Domains, Environment, Model, LeftValue),
    eval_formula(Right, Domains, Environment, Model, RightValue),
    boolean_and(LeftValue, RightValue, Value).
eval_formula(or(Left, Right), Domains, Environment, Model, Value) :-
    eval_formula(Left, Domains, Environment, Model, LeftValue),
    eval_formula(Right, Domains, Environment, Model, RightValue),
    boolean_or(LeftValue, RightValue, Value).
eval_formula(xor(Left, Right), Domains, Environment, Model, Value) :-
    eval_formula(Left, Domains, Environment, Model, LeftValue),
    eval_formula(Right, Domains, Environment, Model, RightValue),
    boolean_xor(LeftValue, RightValue, Value).
eval_formula(implies(Left, Right), Domains, Environment, Model, Value) :-
    eval_formula(Left, Domains, Environment, Model, LeftValue),
    eval_formula(Right, Domains, Environment, Model, RightValue),
    boolean_implies(LeftValue, RightValue, Value).
eval_formula(forall(Binding, Formula), Domains, Environment, Model, Value) :-
    quantified_values(Binding, Formula, Domains, Environment, Model, Values),
    all_true(Values, Value).
eval_formula(exists(Binding, Formula), Domains, Environment, Model, Value) :-
    quantified_values(Binding, Formula, Domains, Environment, Model, Values),
    any_true(Values, Value).

quantified_values(var(Name, Type), Formula, Domains, Environment, Model, Values) :-
    domain_values(Type, Domains, Constants),
    eval_for_constants(Constants, Name, Formula, Domains, Environment, Model, Values).

eval_for_constants([], _, _, _, _, _, []).
eval_for_constants([Constant|Rest], Name, Formula, Domains, Environment, Model, [Value|Values]) :-
    eval_formula(Formula, Domains, [binding(Name, Constant)|Environment], Model, Value),
    eval_for_constants(Rest, Name, Formula, Domains, Environment, Model, Values).

domain_values(Type, Domains, Constants) :- memberchk(domain(Type, Constants), Domains).

instantiate_args([], _, []).
instantiate_args([Argument|Rest], Environment, [Ground|GroundRest]) :-
    instantiate_arg(Argument, Environment, Ground),
    instantiate_args(Rest, Environment, GroundRest).
instantiate_arg(var(Name), Environment, Ground) :- memberchk(binding(Name, Ground), Environment).
instantiate_arg(const(Value), _, Value).
instantiate_arg(Value, _, Value) :- atom(Value).

flip(true, false).
flip(false, true).
boolean_and(true, true, true).
boolean_and(true, false, false).
boolean_and(false, true, false).
boolean_and(false, false, false).
boolean_or(false, false, false).
boolean_or(true, false, true).
boolean_or(false, true, true).
boolean_or(true, true, true).
boolean_xor(true, false, true).
boolean_xor(false, true, true).
boolean_xor(true, true, false).
boolean_xor(false, false, false).
boolean_implies(true, false, false).
boolean_implies(true, true, true).
boolean_implies(false, true, true).
boolean_implies(false, false, true).
all_true([], true).
all_true([true|Rest], Value) :- all_true(Rest, Value).
all_true([false|_], false).
any_true([], false).
any_true([true|_], true).
any_true([false|Rest], Value) :- any_true(Rest, Value).

vocabulary(Domains, Axioms, Goal, Vocabulary) :-
    findall(Atoms, (member(Formula, Axioms), formula_atoms(Formula, Domains, [], Atoms)), Nested),
    formula_atoms(Goal, Domains, [], GoalAtoms),
    append(Nested, AxiomAtoms), append(AxiomAtoms, GoalAtoms, AllAtoms), sort(AllAtoms, Vocabulary).

formula_atoms(atom(Name, Args), _, Environment, [holds(Name, GroundArgs)]) :- instantiate_args(Args, Environment, GroundArgs).
formula_atoms(neg(Formula), Domains, Environment, Atoms) :- formula_atoms(Formula, Domains, Environment, Atoms).
formula_atoms(and(Left, Right), Domains, Environment, Atoms) :- binary_atoms(Left, Right, Domains, Environment, Atoms).
formula_atoms(or(Left, Right), Domains, Environment, Atoms) :- binary_atoms(Left, Right, Domains, Environment, Atoms).
formula_atoms(xor(Left, Right), Domains, Environment, Atoms) :- binary_atoms(Left, Right, Domains, Environment, Atoms).
formula_atoms(implies(Left, Right), Domains, Environment, Atoms) :- binary_atoms(Left, Right, Domains, Environment, Atoms).
formula_atoms(forall(Binding, Formula), Domains, Environment, Atoms) :- quantified_atoms(Binding, Formula, Domains, Environment, Atoms).
formula_atoms(exists(Binding, Formula), Domains, Environment, Atoms) :- quantified_atoms(Binding, Formula, Domains, Environment, Atoms).

binary_atoms(Left, Right, Domains, Environment, Atoms) :-
    formula_atoms(Left, Domains, Environment, LeftAtoms), formula_atoms(Right, Domains, Environment, RightAtoms), append(LeftAtoms, RightAtoms, Atoms).
quantified_atoms(var(Name, Type), Formula, Domains, Environment, Atoms) :-
    domain_values(Type, Domains, Constants),
    findall(Inner, (member(Constant, Constants), formula_atoms(Formula, Domains, [binding(Name, Constant)|Environment], Inner)), Nested), append(Nested, Atoms).
