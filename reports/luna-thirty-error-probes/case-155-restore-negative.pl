:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[elina,stella,bridget,remington]).
% Elina loves reading.
axiom(s1,loves_reading(elina)).
% Elina sets goals or stays disciplined.
axiom(s2,or(sets_goals(elina),stays_disciplined(elina))).
% Elina either enjoys the outdoors or loves reading, but not both.
axiom(s3,xor(enjoys_outdoors(elina),loves_reading(elina))).
% If Elina either monitors her performance or evaluates her results (but not both), then she tracks her progress.
axiom(s4,rule([xor(monitors_performance(elina),evaluates_results(elina))],tracks_progress(elina))).
% Stella does not stay motivated.
axiom(s5,not(stays_motivated(stella))).
% Elina learns from her failures.
axiom(s6,learns_from_failures(elina)).
% Bridget does not perform well.
axiom(s7,not(performs_well(bridget))).
% Everyone faces challenges or overcomes fear.
axiom(s8,forall(var(x,person),or(faces_challenges(var(x)),overcomes_fear(var(x))))).
% If someone either achieves success or stays motivated, then they perform well.
axiom(s9,rule([or(achieves_success(X),stays_motivated(X))],performs_well(X))).
% If someone visualizes success, then they build strategies and set goals.
axiom(s10,rule([visualizes_success(X)],and(builds_strategies(X),sets_goals(X)))).
% Elina does not stay motivated.
axiom(s11,not(stays_motivated(elina))).
% If Bridget is a professional athlete, then she either overcomes fear or stays disciplined, but not both.
axiom(s12,rule([is_professional_athlete(bridget)],xor(overcomes_fear(bridget),stays_disciplined(bridget)))).
% Elina either tracks her progress or learns from her failures, but not both.
axiom(s13,xor(tracks_progress(elina),learns_from_failures(elina))).
% Remington sets goals or stays disciplined.
axiom(s14,or(sets_goals(remington),stays_disciplined(remington))).
% If Elina masters extreme sports, then she can overcome fear.
axiom(s15,rule([masters_extreme_sports(elina)],can_overcome_fear(elina))).
% If Elina either tracks her progress or sets goals (but not both), then she achieves success.
axiom(s16,rule([xor(tracks_progress(elina),sets_goals(elina))],achieves_success(elina))).
% If Elina is a professional athlete, then she either overcomes fear or stays disciplined, but not both.
axiom(s17,rule([is_professional_athlete(elina)],xor(overcomes_fear(elina),stays_disciplined(elina)))).
% Remington enjoys the outdoors or is a professional athlete.
axiom(s18,or(enjoys_outdoors(remington),is_professional_athlete(remington))).
% Elina enjoys the outdoors or is a professional athlete.
axiom(s19,or(enjoys_outdoors(elina),is_professional_athlete(elina))).
% If Elina lives in a rural area, then she either has an adventurous spirit or enjoys the outdoors, but not both.
axiom(s20,rule([lives_in_rural_area(elina)],xor(has_an_adventurous_spirit(elina),enjoys_outdoors(elina)))).
axiom(probe_missing,not(performs_well(elina))).

