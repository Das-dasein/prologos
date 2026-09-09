:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[ramon]).

% Ramon sets high goals.
axiom(s1, sets_high_goals(ramon)).
% If Ramon sets challenging targets, then he either practices often or achieves success (or both).
axiom(s2, rule([sets_challenging_targets(ramon)], or(practices_often(ramon), achieves_success(ramon)))).
% Ramon analyzes games or studies opponents.
axiom(s3, or(analyzes_games(ramon), studies_opponents(ramon))).
% If someone thinks ahead and anticipates outcomes, then they can have a strategic mind.
axiom(s4, rule([thinks_ahead(X), anticipates_outcomes(X)], strategic_mind(X))).
% Ramon develops new openings.
axiom(s5, develops_new_openings(ramon)).
% If Ramon has a strategic mind, then he can either win major tournaments or become a legend in chess, but not both.
axiom(s6, rule([strategic_mind(ramon)], xor(wins_major_tournaments(ramon), becomes_legend_in_chess(ramon)))).
% Anyone who thinks critically has a strategic mind.
axiom(s7, rule([thinks_critically(X)], strategic_mind(X))).
% Ramon thinks critically.
axiom(s8, thinks_critically(ramon)).
% Ramon does not dedicate time to achieve his goals.
axiom(s9, not(dedicates_time_to_achieve_goals(ramon))).
% For Ramon, he either develops new openings or analyzes games, but not necessarily both.
axiom(s10, or(develops_new_openings(ramon), analyzes_games(ramon))).
% Everyone who sets high goals either dedicates time to achieve them or practices often (or both).
axiom(s11, rule([sets_high_goals(X)], or(dedicates_time_to_achieve_goals(X), practices_often(X)))).
% If someone studies their opponents and practices often, then they can win major tournaments.
axiom(s12, rule([studies_opponents(X), practices_often(X)], wins_major_tournaments(X))).
