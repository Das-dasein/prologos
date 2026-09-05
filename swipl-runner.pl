% Non-interactive JSON-lines runner used by swipl-engine.js.
:- use_module(library(http/json)).
:- initialization(main, main).

main :-
    current_prolog_flag(argv, Argv),
    (   Argv = [Program, GoalAtom|Rest]
    ->  true
    ;   throw(error(arguments(Argv), _))
    ),
    consult(Program),
    read_term_from_atom(GoalAtom, Goal, [variable_names(Names)]),
    ( memberchk('--terms', Rest) ->
        findall(String, term_solution(Goal, String), Strings)
    ;
        findall(String, solution(Goal, Names, String), Strings)
    ),
    json_write_dict(current_output, _{answers:Strings}),
    nl.

solution(Goal, Names, String) :-
    call(Goal),
    with_output_to(string(String), write_bindings(Names)).

term_solution(Goal, String) :-
    call(Goal),
    term_string(Goal, String, [quoted(false)]).

write_bindings([]) :-
    write(true).
write_bindings(Names) :-
    Names = [_|_],
    write_bindings(Names, true).

write_bindings([], _) :- !.
write_bindings([Name=Value|Rest], First) :-
    ( First == true -> true ; write(', ') ),
    write(Name), write(' = '), write_term(Value, [quoted(false)]),
    write_bindings(Rest, false).
