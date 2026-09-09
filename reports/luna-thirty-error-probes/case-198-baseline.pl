:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[gary]).
% Gary makes tactical decisions.
axiom(s1, makes_tactical_decisions(gary)).
% Gary cannot handle critical situations.
axiom(s2, not(handle_critical_situations(gary))).
% If Gary leads others effectively, then he either makes tactical decisions or communicates clearly, but not both.
axiom(s3, rule([leads_others_effectively(gary)], xor(makes_tactical_decisions(gary), communicates_clearly(gary)))).
% Anyone who thinks quickly and stays calm under pressure can handle critical situations.
axiom(s4, rule([thinks_quickly(X), stays_calm_under_pressure(X)], handle_critical_situations(X))).
% Gary gains experience or has training.
axiom(s5, or(gains_experience(gary), has_training(gary))).
% If Gary takes risks, then he either acts impulsively or follows his instincts (but not both).
axiom(s6, rule([takes_risks(gary)], xor(acts_impulsively(gary), follows_instincts(gary)))).
% Gary thinks quickly.
axiom(s7, thinks_quickly(gary)).
% Gary either performs heroic actions or takes risks.
axiom(s8, or(performs_heroic_actions(gary), takes_risks(gary))).
% Anyone who prioritizes their own safety and has proper training can respond to emergencies effectively.
axiom(s9, rule([prioritizes_own_safety(X), has_proper_training(X)], responds_to_emergencies_effectively(X))).
% Anyone who responds to emergencies either stays calm under pressure or leads others effectively (or both).
axiom(s10, rule([responds_to_emergencies(X)], or(stays_calm_under_pressure(X), leads_others_effectively(X)))).
% Gary does not gain experience.
axiom(s11, not(gains_experience(gary))).
% Gary does not act impulsively.
axiom(s12, not(acts_impulsively(gary))).
% If Gary is brave, then he will perform heroic actions and earn accolades.
axiom(s13, rule([brave(gary)], and(performs_heroic_actions(gary), earns_accolades(gary)))).
% Gary either prioritizes his own safety or is brave, but Gary may not necessarily do both.
axiom(s14, or(prioritizes_own_safety(gary), brave(gary))).
% Gary does not follow his instincts.
axiom(s15, not(follows_instincts(gary))).
% Gary communicates clearly.
axiom(s16, communicates_clearly(gary)).
