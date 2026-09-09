:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[alana]).

% Alana explores new places.
axiom(s1, explores_new_places(alana)).

% Anyone who is spontaneous and trusts their intuition can learn to embrace uncertainty.
axiom(s2, rule([spontaneous(X), trusts_intuition(X)], embraces_uncertainty(X))).

% If Alana explores new places, then she will take calculated risks.
axiom(s3, rule([explores_new_places(alana)], takes_calculated_risks(alana))).

% Alana makes her own decisions.
axiom(s4, makes_own_decisions(alana)).

% Anyone who values independence and embraces uncertainty is free-spirited.
axiom(s5, rule([values_independence(X), embraces_uncertainty(X)], free_spirited(X))).

% If Alana has a creative nature, then she is either guided by reason or trusts her intuition (but not both).
axiom(s6, rule([creative_nature(alana)], xor(guided_by_reason(alana), trusts_intuition(alana)))).

% Alana is not guided by reason.
axiom(s7, not(guided_by_reason(alana))).

% Alana has a creative nature.
axiom(s8, creative_nature(alana)).

% Alana appreciates simple things.
axiom(s9, appreciates_simple_things(alana)).

% If someone makes their own decisions and takes calculated risks, then they value independence.
axiom(s10, rule([makes_own_decisions(X), takes_calculated_risks(X)], values_independence(X))).

% If someone has an open mind and tolerates ambiguity, then they can embrace uncertainty.
axiom(s11, rule([open_mind(X), tolerates_ambiguity(X)], embraces_uncertainty(X))).

% Alana is spontaneous.
axiom(s12, spontaneous(alana)).

% For all humans, if someone is free-spirited, then they either love adventure or pursue creative passions (or both).
axiom(s13, forall(var(x,person), implies(free_spirited(var(x)), or(loves_adventure(var(x)), pursues_creative_passions(var(x)))))).

% Alana either pursues creative passions or appreciates simple things, but these two traits do not necessarily overlap in her life.
axiom(s14, xor(pursues_creative_passions(alana), appreciates_simple_things(alana))).
