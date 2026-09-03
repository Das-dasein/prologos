% Optional domain projection. The trusted memory core does not load this file.
% Consumers opt in when they need domain-specific conclusions or constraints.

functional(lives_in).
functional(birth_year).
functional(email).

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
