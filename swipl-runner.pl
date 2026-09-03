% Non-interactive JSON-lines runner used by swipl-engine.js.
:- use_module(library(http/json)).
:- initialization(main, main).

main :-
    current_prolog_flag(argv, Argv),
    (   Argv = [Program, GoalAtom|_]
    ->  true
    ;   throw(error(arguments(Argv), _))
    ),
    consult(Program),
    read_term_from_atom(GoalAtom, Goal, []),
    findall(Goal, call(Goal), Answers),
    maplist(term_string, Answers, Strings),
    json_write_dict(current_output, _{answers:Strings}),
    nl.
