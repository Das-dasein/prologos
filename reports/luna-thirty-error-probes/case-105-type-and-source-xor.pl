:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[anders,ronan,alyssa,bo]).
% If a farmer works hard, then they value quality and are dedicated to their work.
axiom(s1, rule([farmer(X), works_hard(X)], and(values_quality(X), dedicated(X)))).
% Anders does not use crop rotation.
axiom(s2, not(uses_crop_rotation(anders))).
% Every dedicated farmer either improves their crops or is experienced (or both).
axiom(s3, rule([farmer(X), dedicated(X)], or(improves_crops(X), experienced(X)))).
% For all farmers, either they diversify their farm or improve their crops, but not necessarily both.
axiom(s4, rule([farmer(X)], xor(diversifies_farm(X), improves_crops(X)))).
% Ronan either manages pests or increases crop yields.
axiom(s5, or(manages_pests(ronan), increases_crop_yields(ronan))).
% Ronan does not use crop rotation.
axiom(s6, not(uses_crop_rotation(ronan))).
% Any farmer who uses quality seeds or optimizes soil conditions can increase crop yields.
axiom(s7, rule([farmer(X), or(uses_quality_seeds(X), optimizes_soil_conditions(X))], increases_crop_yields(X))).
% Every farmer monitors soil or manages pests.
axiom(s8, rule([farmer(X)], or(monitors_soil(X), manages_pests(X)))).
% Ronan rotates fields.
axiom(s9, rotates_fields(ronan)).
% If Ronan is experienced, then he can either increase crop yields or develop new techniques, but not both.
axiom(s10, rule([experienced(ronan)], xor(increases_crop_yields(ronan), develops_new_techniques(ronan)))).
% If Alyssa is experienced, then he can either increase crop yields or develop new techniques, but not both.
axiom(s11, rule([experienced(alyssa)], xor(increases_crop_yields(alyssa), develops_new_techniques(alyssa)))).
% If Bo either rotates fields or uses crop rotation (but not both), then he is dedicated.
axiom(s12, rule([xor(rotates_fields(bo), uses_crop_rotation(bo))], dedicated(bo))).
% Ronan either uses sustainable methods or manages pests, but not both.
axiom(s13, xor(uses_sustainable_methods(ronan), manages_pests(ronan))).
% If Ronan either rotates fields or uses crop rotation (but not both), then he is dedicated.
axiom(s14, rule([xor(rotates_fields(ronan), uses_crop_rotation(ronan))], dedicated(ronan))).
% Ronan diversifies his farm.
axiom(s15, diversifies_farm(ronan)).
% Ronan uses sustainable methods.
axiom(s16, uses_sustainable_methods(ronan)).
% Bo diversifies his farm.
axiom(s17, diversifies_farm(bo)).
axiom(probe_type,farmer(ronan)).

