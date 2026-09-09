:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[lovie,lilly,shiloh]).

% Lovie preaches understanding or fosters peace.
axiom(s1, or(preaches_understanding(lovie), fosters_peace(lovie))).

% If Lovie either defends minorities or supports human rights (but not both), then she advocates for freedom.
axiom(s2, rule([xor(defends_minorities(lovie), supports_human_rights(lovie))], advocates_for_freedom(lovie))).

% Lovie does not earn respect.
axiom(s3, not(earns_respect(lovie))).

% For all humans, if they oppose extremism or value tolerance, then they promote social justice.
axiom(s4, forall(var(x,person), implies(or(opposes_extremism(var(x)), values_tolerance(var(x))), promotes_social_justice(var(x))))).

% Anyone who rejects prejudice or embraces diversity values tolerance.
axiom(s5, rule([or(rejects_prejudice(X), embraces_diversity(X))], values_tolerance(X))).

% If someone heals their community, then they will earn respect.
axiom(s6, rule([heals_community(X)], earns_respect(X))).

% Lilly either supports human rights or promotes social justice, but no one necessarily does both.
axiom(s7, or(supports_human_rights(lilly), promotes_social_justice(lilly))).

% Lovie either supports human rights or promotes social justice, but no one necessarily does both.
axiom(s8, xor(supports_human_rights(lovie), promotes_social_justice(lovie))).

% If Lilly either defends minorities or supports human rights (but not both), then she advocates for freedom.
axiom(s9, rule([xor(defends_minorities(lilly), supports_human_rights(lilly))], advocates_for_freedom(lilly))).

% Shiloh does not earn respect.
axiom(s10, not(earns_respect(shiloh))).

% If someone values tolerance, then they foster peace.
axiom(s11, rule([values_tolerance(X)], fosters_peace(X))).

% Lovie defends minorities.
axiom(s12, defends_minorities(lovie)).

% Lovie does not advocate for freedom.
axiom(s13, not(advocates_for_freedom(lovie))).

% If Lilly fosters peace, then she heals her community.
axiom(s14, rule([fosters_peace(lilly)], heals_community(lilly))).

% Lovie believes in equality or supports human rights.
axiom(s15, or(believes_in_equality(lovie), supports_human_rights(lovie))).

% If Lovie fosters peace, then she heals her community.
axiom(s16, rule([fosters_peace(lovie)], heals_community(lovie))).
