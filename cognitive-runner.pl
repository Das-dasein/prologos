% This full-Prolog thought session is deliberately non-authoritative. Candidate
% directives can write or halt before main/0; every visible byte is transcript.
:- use_module(library(time)).
:- initialization(main, main).
main :-
    current_prolog_flag(argv, [Snapshot, Candidate, GoalText|PreludeAndSeconds]),
    append(Preludes, [SecondsAtom], PreludeAndSeconds), atom_number(SecondsAtom, Seconds),
    consult(Snapshot), load_snapshot_items, load_preludes(Preludes), consult(Candidate), read_term_from_atom(GoalText, Goal, []),
    catch((call_with_time_limit(Seconds, once(call(Goal))) -> Outcome = succeeded, format('PAM_DIAGNOSTIC_BINDINGS: ~q~n', [Goal]) ; Outcome = failed), E, Outcome = error(E)),
    format('PAM_DIAGNOSTIC_OUTCOME: ~q~n', [Outcome]),
    halt.
item_clause(_, _, Clause) :- current_predicate(pam_item/3), pam_item(_, _, Text), read_term_from_atom(Text, Clause, []).
load_snapshot_items :- forall(item_clause(_, _, Clause), assertz(Clause)).
load_preludes([]).
load_preludes([Prelude|Rest]) :- use_module(Prelude), load_preludes(Rest).
