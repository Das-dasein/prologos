% Optional domain projection. The trusted memory core does not load this file.
% Consumers opt in when they need domain-specific conclusions or constraints.

functional(lives_in).
functional(birth_year).
functional(email).

worked_on(Person, Project) :-
    safe_assertion(_, project_role_at(Person, _, Project, _)).

has_frontend_experience(Person) :-
    safe_assertion(_, project_role_at(Person, _, _, frontend_developer)).

current_project(Person, Employer, Project) :-
    safe_assertion(_, current_project_at(Person, Employer, Project)).

knows_frontend_framework(Person) :-
    safe_assertion(_, knows_technology(Person, angular)).

knows_multiple_programming_languages(Person) :-
    safe_assertion(_, knows_technology(Person, java)),
    safe_assertion(_, knows_technology(Person, python)).

conflict(functional, Id1, Id2, Relation) :-
    active_assertion_record(Id1, positive, Proposition1, _, From1, To1, _),
    active_assertion_record(Id2, positive, Proposition2, _, From2, To2, _),
    Proposition1 =.. [Relation, Subject, Value1],
    Proposition2 =.. [Relation, Subject, Value2],
    functional(Relation),
    Value1 \= Value2,
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).

% At one employer a person can have only one current project state.
conflict(current_project, Id1, Id2, Employer) :-
    active_assertion_record(Id1, positive, current_project_at(Person, Employer, Project1), _, From1, To1, _),
    active_assertion_record(Id2, positive, current_project_at(Person, Employer, Project2), _, From2, To2, _),
    Project1 \= Project2,
    Id1 @< Id2,
    overlaps(From1, To1, From2, To2).
