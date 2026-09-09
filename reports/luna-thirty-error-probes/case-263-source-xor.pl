:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[india,queenie]).

% Every parasite either invades a host or manipulates cellular machinery.
axiom(s1, rule([parasite(X)], or(invades(X), manipulates(X)))).

% India attaches to a host.
axiom(s2, attaches(india)).

% If Queenie attaches to a host, then she will infect it.
axiom(s3, rule([attaches(queenie)], infects(queenie))).

% Queenie attaches to a host.
axiom(s4, attaches(queenie)).

% Queenie does not invade a host.
axiom(s5, not(invades(queenie))).

% If Queenie has a strong flagellum, then she will dominate her host.
axiom(s6, rule([has_strong_flagellum(queenie)], dominates(queenie))).

% Any parasite that dominates its host will reproduce successfully.
axiom(s7, rule([parasite(X), dominates(X)], reproduces_successfully(X))).

% If Queenie is a virulent parasite, then she either colonizes tissues or dominates her host, but not both.
axiom(s8, rule([and(virulent(queenie), parasite(queenie))], xor(colonizes_tissues(queenie), dominates(queenie)))).

% If Queenie infects her host, then she either multiplies rapidly or evades the host's defenses, but not both.
axiom(s9, rule([infects(queenie)], xor(multiplies_rapidly(queenie), evades_host_defenses(queenie)))).

% All parasites are either able to adapt to their host or survive in its environment, if they reproduce successfully.
axiom(s10, rule([parasite(X), reproduces_successfully(X)], xor(adapts_to_host(X), survives_in_environment(X)))).

% Queenie does not colonize tissues.
axiom(s11, not(colonizes_tissues(queenie))).

% Queenie is able to adapt to her host.
axiom(s12, adapts_to_host(queenie)).

% Every parasite that manipulates cellular machinery of a host either evades the host's defenses or survives in its environment.
axiom(s13, rule([parasite(X), manipulates(X)], or(evades_host_defenses(X), survives_in_environment(X)))).

% If Queenie either penetrates cells or secretes toxins (but not both), then she infects her host.
axiom(s14, rule([xor(penetrates_cells(queenie), secretes_toxins(queenie))], infects(queenie))).

% Queenie is a virulent parasite.
axiom(s15, and(virulent(queenie), parasite(queenie))).
