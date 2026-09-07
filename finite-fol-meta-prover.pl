% Finite-domain object-FOL evaluator hosted in SWI-Prolog.
% This is deliberately not a general FOL prover: quantifiers range only over
% the explicit domain/2 values supplied by the caller.
:- module(finite_fol_meta_prover, [finite_status/6]).

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
model_for([Atom|Rest], Model) :- model_for(Rest, Model).
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
