:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[muppet]).
% Muppet does not become more efficient.
axiom(s1, not(becomes_more_efficient(muppet))).
% All robots that acquire new skills learn from experience and improve their performance.
axiom(s2, rule([robot(X), acquires_new_skills(X)], and(learns_from_experience(X), improves_performance(X)))).
% If Muppet either executes predefined programs or follows scheduled routines (but not both), then it receives remote commands.
axiom(s3, rule([xor(executes_predefined_programs(muppet), follows_scheduled_routines(muppet))], receives_remote_commands(muppet))).
% Muppet improves its performance.
axiom(s4, improves_performance(muppet)).
% Any robot that can process information is able to analyze data.
axiom(s5, rule([robot(X), can_process_information(X)], can_analyze_data(X))).
% If a robot learns from experience and achieves its mission objectives, then it becomes more efficient.
axiom(s6, rule([robot(X), learns_from_experience(X), achieves_mission_objectives(X)], becomes_more_efficient(X))).
% Muppet does not operate offline.
axiom(s7, not(operates_offline(muppet))).
% Muppet either performs tasks autonomously or has advanced sensors.
axiom(s8, or(performs_tasks_autonomously(muppet), has_advanced_sensors(muppet))).
% For all robots, if a robot has advanced sensors and has deep learning capabilities, then it can make informed decisions.
axiom(s9, rule([robot(X), has_advanced_sensors(X), has_deep_learning_capabilities(X)], can_make_informed_decisions(X))).
% Muppet can process information.
axiom(s10, can_process_information(muppet)).
% Muppet either receives remote commands or performs tasks autonomously, but not both.
axiom(s11, xor(receives_remote_commands(muppet), performs_tasks_autonomously(muppet))).
% If Muppet makes precise calculations, then it will achieve its mission objectives.
axiom(s12, rule([can_make_precise_calculations(muppet)], achieves_mission_objectives(muppet))).
% Muppet either receives remote commands or operates offline, but not both.
axiom(s13, xor(receives_remote_commands(muppet), operates_offline(muppet))).
% Muppet acquires new skills.
axiom(s14, acquires_new_skills(muppet)).
% Every robot that can analyze data either has deep learning capabilities or can make precise calculations.
axiom(s15, rule([robot(X), can_analyze_data(X)], or(has_deep_learning_capabilities(X), can_make_precise_calculations(X)))).
