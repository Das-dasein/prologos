:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[kahlani,bristol,ford]).
% If Kahlani values quality and appreciates uniqueness, then she enjoys craft beer.
axiom(s1,rule([values_quality(kahlani),appreciates_uniqueness(kahlani)],enjoys_craft_beer(kahlani))).
% If Kahlani knows good taste, then she values quality and supports local business.
axiom(s2,rule([knows_good_taste(kahlani)],and(values_quality(kahlani),supports_local_business(kahlani)))).
% If Bristol respects tradition, then she appreciates uniqueness and seeks innovation.
axiom(s3,rule([respects_tradition(bristol)],and(appreciates_uniqueness(bristol),seeks_innovation(bristol)))).
% Ford does not foster community.
axiom(s4,not(fosters_community(ford))).
% If Kahlani respects tradition, then she appreciates uniqueness and seeks innovation.
axiom(s5,rule([respects_tradition(kahlani)],and(appreciates_uniqueness(kahlani),seeks_innovation(kahlani)))).
% Kahlani knows good taste.
axiom(s6,knows_good_taste(kahlani)).
% Everyone who runs a brewpub either seeks innovation or fosters community (or both).
axiom(s7,rule([runs_a_brewpub(X)],or(seeks_innovation(X),fosters_community(X)))).
% Kahlani embraces diversity.
axiom(s8,embraces_diversity(kahlani)).
% If Kahlani values creativity, then she pursues excellence and respects tradition.
axiom(s9,rule([values_creativity(kahlani)],and(pursues_excellence(kahlani),respects_tradition(kahlani)))).
% If Kahlani either tries new recipes or experiments with flavors (but not both), then she seeks innovation.
axiom(s10,rule([xor(tries_new_recipes(kahlani),experiments_with_flavors(kahlani))],seeks_innovation(kahlani))).
% Kahlani either enjoys craft beer or prefers mass-produced beer, but not both.
axiom(s11,xor(enjoys_craft_beer(kahlani),prefers_mass_produced_beer(kahlani))).
% If Kahlani has a discerning palate, then she either pays attention to detail or values quality, but not both.
axiom(s12,rule([has_a_discerning_palate(kahlani)],xor(pays_attention_to_detail(kahlani),values_quality(kahlani)))).
% Anyone who seeks originality or loves experimentation appreciates uniqueness.
axiom(s13,rule([or(seeks_originality(X),loves_experimentation(X))],appreciates_uniqueness(X))).
% For Kahlani, she either honors her culture or embraces diversity, but not necessarily both.
axiom(s14,or(honors_culture(kahlani),embraces_diversity(kahlani))).
% Kahlani does not foster community.
axiom(s15,not(fosters_community(kahlani))).
% Kahlani honors culture or respects tradition.
axiom(s16,or(honors_culture(kahlani),respects_tradition(kahlani))).
% Kahlani runs a brewpub.
axiom(s17,runs_a_brewpub(kahlani)).
% If Ford knows good taste, then she values quality and supports local business.
axiom(s18,rule([knows_good_taste(ford)],and(values_quality(ford),supports_local_business(ford)))).
