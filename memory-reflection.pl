% Read-only reflection over the assertion journal.
% Findings are candidates for review; this file never changes the journal.

reflection_duplicate(Id1, Id2, Proposition) :-
    active_assertion_record(Id1, Polarity, Proposition, _, _, _, _),
    active_assertion_record(Id2, Polarity, Proposition, _, _, _, _),
    Id1 @< Id2.

reflection_unknown_time(Id) :-
    assertion_time(Id, unknown).
reflection_unknown_time(Id) :-
    assertion_time(Id, interval(10000101, inf)).

reflection_identity_review(Id, artem, user) :-
    assertion(Id, role(artem, user)).
