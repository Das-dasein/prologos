% Standalone examples for lessons 6 and 7. No project memory is read or changed.
person(anna).
person(boris).
blocked(anna).
allowed(X) :- person(X), \+ blocked(X).

parent(anna, bob).
parent(bob, cara).
ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

% Ordinary neg/1 facts: no automatic opposition semantics in SWI-Prolog.
neg(blocked(anna)).
neg(blocked(boris)).

course_demo :-
    findall(X, allowed(X), Allowed),
    format('allowed=~q~n', [Allowed]),
    ( \+ blocked(_) -> writeln(non_ground_negation=succeeded)
    ; writeln(non_ground_negation=failed) ).

verify_examples :-
    findall(X, allowed(X), [boris]),
    blocked(anna),
    \+ blocked(boris),
    \+ (\+ blocked(_)),
    blocked(anna), neg(blocked(anna)),
    ancestor(anna, cara),
    \+ ancestor(cara, anna),
    \+ unify_with_occurs_check(T, f(T)),
    writeln('prolog examples: PASS').
