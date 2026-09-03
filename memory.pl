% Universal assertion core. Meaning and qualifiers are stored separately.

:- dynamic(assertion/2).
:- dynamic(assertion_polarity/2).
:- dynamic(assertion_modality/2).
:- dynamic(assertion_time/2).
:- dynamic(assertion_source/2).
:- dynamic(assertion_confidence/2).
:- dynamic(assertion_revision/3).

active_assertion(Id, Proposition) :-
    assertion(Id, Proposition),
    assertion_polarity(Id, positive),
    \+ assertion_revision(_, replaces, Id).

active_assertion_record(Id, Polarity, Proposition, Source, From, To, Confidence) :-
    assertion(Id, Proposition),
    assertion_polarity(Id, Polarity),
    assertion_source(Id, Source),
    assertion_time_interval(Id, From, To),
    assertion_confidence(Id, Confidence),
    \+ assertion_revision(_, replaces, Id).

assertion_time_interval(Id, From, To) :-
    assertion_time(Id, interval(From, To)), !.
assertion_time_interval(Id, 10000101, inf) :-
    assertion_time(Id, unknown).

opposite(positive, negative).
opposite(negative, positive).

ends_after(inf, _).
ends_after(A, B) :- number(A), A >= B.

overlaps(From1, To1, From2, To2) :-
    ends_after(To1, From2),
    ends_after(To2, From1).

conflict(direct, Id1, Id2, Proposition) :-
    active_assertion_record(Id1, Polarity1, Proposition, _, From1, To1, _),
    active_assertion_record(Id2, Polarity2, Proposition, _, From2, To2, _),
    opposite(Polarity1, Polarity2),
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).

conflict_explanation(Type, Id1, Id2, explanation(Type, Assertion1, Assertion2)) :-
    conflict(Type, Id1, Id2, _),
    Assertion1 = assertion_record(Id1, P1, Prop1, Source1, From1, To1, C1),
    Assertion2 = assertion_record(Id2, P2, Prop2, Source2, From2, To2, C2),
    active_assertion_record(Id1, P1, Prop1, Source1, From1, To1, C1),
    active_assertion_record(Id2, P2, Prop2, Source2, From2, To2, C2).

unresolved_conflict(Type, Id1, Id2, Subject) :-
    conflict(Type, Id1, Id2, Subject),
    \+ assertion_revision(_, replaces, Id1),
    \+ assertion_revision(_, replaces, Id2).
