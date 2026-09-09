:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[norah,jadiel,ashlynn]).
% Norah lives in a metropolis.
axiom(s1, lives_in_metropolis(norah)).
% Everyone who prefers an urban lifestyle enjoys city life.
axiom(s2, rule([prefers_urban_lifestyle(X)], enjoys_city_life(X))).
% Norah is either introspective or enjoys socializing, but not both.
axiom(s3, xor(introspective(norah), enjoys_socializing(norah))).
% Norah enjoys socializing or likes crowds.
axiom(s4, or(enjoys_socializing(norah), likes_crowds(norah))).
% If Norah enjoys art and collects antiques, then she prefers an urban lifestyle.
axiom(s5, implies(and(enjoys_art(norah), collects_antiques(norah)), prefers_urban_lifestyle(norah))).
% Jadiel is either introspective or enjoys socializing, but not both.
axiom(s6, xor(introspective(jadiel), enjoys_socializing(jadiel))).
% Anyone who frequently visits clubs will enjoy nightlife.
axiom(s7, rule([frequently_visits_clubs(X)], enjoys_nightlife(X))).
% If Norah lives in a metropolis, then she either enjoys nightlife or loves a serene atmosphere (but not both).
axiom(s8, implies(lives_in_metropolis(norah), xor(enjoys_nightlife(norah), loves_serene_atmosphere(norah)))).
% If Norah either likes crowds or enjoys nightlife (but not both), then she prefers an urban lifestyle.
axiom(s9, implies(xor(likes_crowds(norah), enjoys_nightlife(norah)), prefers_urban_lifestyle(norah))).
% Everyone either enjoys city life or appreciates nature, but they are not mutually exclusive.
axiom(s10, forall(var(x,person), xor(enjoys_city_life(var(x)), appreciates_nature(var(x))))).
% Norah either appreciates nature or values knowledge (or both).
axiom(s11, or(appreciates_nature(norah), values_knowledge(norah))).
% If Ashlynn lives in a metropolis, then she either enjoys nightlife or loves a serene atmosphere (but not both).
axiom(s12, implies(lives_in_metropolis(ashlynn), xor(enjoys_nightlife(ashlynn), loves_serene_atmosphere(ashlynn)))).
% Norah loves a serene atmosphere.
axiom(s13, loves_serene_atmosphere(norah)).
% If Jadiel either likes crowds or enjoys nightlife (but not both), then he prefers an urban lifestyle.
axiom(s14, implies(xor(likes_crowds(jadiel), enjoys_nightlife(jadiel)), prefers_urban_lifestyle(jadiel))).
% Norah is introspective.
axiom(s15, introspective(norah)).
