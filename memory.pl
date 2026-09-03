% Agent memory: claims stay immutable; conclusions are computed.
% claim(Id, Polarity, Proposition, Source, From, To, Confidence).
% Time interval is inclusive. Use inf as an open end.

:- dynamic(claim/7).
:- dynamic(supersedes/2).

functional(lives_in).
functional(birth_year).
functional(email).

% Domain-level conclusions remain reproducible and separate from claims.
worked_on(Person, Project) :-
    active_claim(_, positive, project_role_at(Person, _, Project, _), _, _, _, _).

has_frontend_experience(Person) :-
    active_claim(_, positive, project_role_at(Person, _, _, frontend_developer), _, _, _, _).

current_project(Person, Employer, Project) :-
    active_claim(_, positive, current_project_at(Person, Employer, Project), _, _, _, _).

knows_frontend_framework(Person) :-
    active_claim(_, positive, knows_technology(Person, angular), _, _, _, _).

knows_multiple_programming_languages(Person) :-
    active_claim(_, positive, knows_technology(Person, java), _, _, _, _),
    active_claim(_, positive, knows_technology(Person, python), _, _, _, _).

superseded(Id) :- supersedes(_, Id).

active_claim(Id, Polarity, Proposition, Source, From, To, Confidence) :-
    claim(Id, Polarity, Proposition, Source, From, To, Confidence),
    \+ superseded(Id).

opposite(positive, negative).
opposite(negative, positive).

ends_after(inf, _).
ends_after(A, B) :- number(A), A >= B.

overlaps(From1, To1, From2, To2) :-
    ends_after(To1, From2),
    ends_after(To2, From1).

conflict(direct, Id1, Id2, Proposition) :-
    claim(Id1, Polarity1, Proposition, _, From1, To1, _),
    claim(Id2, Polarity2, Proposition, _, From2, To2, _),
    opposite(Polarity1, Polarity2),
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).

conflict(functional, Id1, Id2, Relation) :-
    claim(Id1, positive, Proposition1, _, From1, To1, _),
    claim(Id2, positive, Proposition2, _, From2, To2, _),
    Proposition1 =.. [Relation, Subject, Value1],
    Proposition2 =.. [Relation, Subject, Value2],
    functional(Relation),
    Value1 \= Value2,
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).

% At one employer a person can have only one current project state.
conflict(current_project, Id1, Id2, Employer) :-
    claim(Id1, positive, current_project_at(Person, Employer, Project1), _, From1, To1, _),
    claim(Id2, positive, current_project_at(Person, Employer, Project2), _, From2, To2, _),
    Project1 \= Project2,
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).

conflict_explanation(Type, Id1, Id2, explanation(Type, Claim1, Claim2)) :-
    conflict(Type, Id1, Id2, _),
    Claim1 = claim(Id1, P1, Prop1, Source1, From1, To1, C1),
    Claim2 = claim(Id2, P2, Prop2, Source2, From2, To2, C2),
    call(Claim1),
    call(Claim2).

unresolved_conflict(Type, Id1, Id2, Subject) :-
    conflict(Type, Id1, Id2, Subject),
    \+ supersedes(Id1, Id2),
    \+ supersedes(Id2, Id1).
