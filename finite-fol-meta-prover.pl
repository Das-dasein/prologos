% Finite-domain object-FOL evaluator hosted in SWI-Prolog.
% This is deliberately not a general FOL prover: quantifiers range only over
% the explicit domain/2 values supplied by the caller.
:- module(finite_fol_meta_prover, [finite_status/6, semantic_status/3, semantic_slice_status/3]).

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
    compile_surface(Goal, [], CompiledGoal).

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
compile_axiom(Axiom, _) :- throw(error(invalid_surface(expected_fact_or_rule(Axiom)), _)).

compile_body([], _, atom(true, [])).
compile_body([Formula], Variables, Compiled) :- !, compile_surface(Formula, Variables, Compiled).
compile_body([Formula|Rest], Variables, and(Compiled, More)) :- compile_surface(Formula, Variables, Compiled), compile_body(Rest, Variables, More).
close_rule(_, [], Formula, Formula).
close_rule(AllVariables, [Variable|Rest], Formula, forall(var(Name, person), Closed)) :- variable_name(Variable, AllVariables, Name), close_rule(AllVariables, Rest, Formula, Closed).

compile_surface(not(Formula), Variables, neg(Compiled)) :- !, compile_surface(Formula, Variables, Compiled).
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
