% Candidate source is consulted only in this fresh OS-sandboxed SWI process.
:- use_module(library(http/json)).
:- use_module(library(time)).
:- initialization(main, main).
main :-
    current_prolog_flag(argv, [Snapshot, Candidate, GoalText, SecondsAtom]), atom_number(SecondsAtom, Seconds),
    consult(Snapshot), load_snapshot_items, consult(Candidate), read_term_from_atom(GoalText, Goal, [variable_names(Names)]),
    catch((call_with_time_limit(Seconds, once(call(Goal))) -> Outcome = success ; Outcome = failure), E, Outcome = error(E)),
    result_for(Outcome, Goal, Names, Result),
    json_write_dict(current_output, Result), nl, halt.
result_for(error(error(existence_error(procedure, _), _)), Goal, _, _{status:unknown, missing:Missing}) :- term_string(Goal, Missing).
result_for(error(E), _, _, _{status:error, error:Text}) :- term_string(E, Text).
result_for(success, Goal, Names, Result) :-
    term_string(Names, Bindings),
    ( proof_for(Goal, Proof) -> Result = _{status:proved, bindings:Bindings, proof:Proof}
    ; term_string(Goal, GoalText), Result = _{status:proved, bindings:Bindings, proof:_{kind:trace_unavailable, goal:GoalText}} ).
result_for(failure, Goal, _, _{status:unknown, missing:MissingText}) :- missing_goals(Goal, 8, Missing), maplist(term_string, Missing, MissingText).
proof_for(Goal, Proof) :- prove(Goal, [], Proof).
prove(Goal, Seen, _) :- memberchk(Goal, Seen), !, fail.
item_clause(Id, Source, Clause) :- pam_item(Id, Source, Text), read_term_from_atom(Text, Clause, []).
load_snapshot_items :- forall(item_clause(_, _, Clause), assertz(Clause)).
prove(Goal, _, _{kind:fact, goal:GoalText, item_id:Id, source:Source}) :- item_clause(Id, Source, Head), Head = Goal, term_string(Goal, GoalText).
prove(Goal, Seen, _{kind:rule, goal:GoalText, item_id:Id, source:Source, children:Children}) :- item_clause(Id, Source, (Head :- Body)), Head = Goal, term_string(Goal, GoalText), prove_body(Body, [Goal|Seen], Children).
prove_body((A,B), Seen, Children) :- !, prove(A, Seen, PA), prove_body(B, Seen, PB), append([PA], PB, Children).
prove_body(Goal, Seen, [Proof]) :- prove(Goal, Seen, Proof).
missing_goals(Goal, Limit, Missing) :- ( item_clause(_, _, (Head :- Body)), Head = Goal -> body_missing(Body, Limit, Missing) ; Missing = [Goal] ).
body_missing(_, 0, []) :- !.
body_missing((A,B), Limit, Missing) :- !, body_missing(A, Limit, Left), length(Left, Used), Next is Limit - Used, body_missing(B, Next, Right), append(Left, Right, Missing).
body_missing(Goal, _, []) :- catch(once(call(Goal)), _, fail), !.
body_missing(Goal, _, [Goal]).
