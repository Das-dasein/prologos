:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[nathalia,mae,zainab,owen]).

% Nathalia does not appreciate scenic views.
axiom(s1,not(appreciates_scenic_views(nathalia))).
% Mae goes hiking.
axiom(s2,goes_hiking(mae)).
% Nathalia is an explorer.
axiom(s3,explorer(nathalia)).
% Nathalia is either cautious or timid.
axiom(s4,or(cautious(nathalia),timid(nathalia))).
% Everyone who has outdoor hobbies either loves nature or appreciates scenic views (or both).
axiom(s5,rule([outdoor_hobbies(X)],or(loves_nature(X),appreciates_scenic_views(X)))).
% Nathalia is either fearless or timid, but not both.
axiom(s6,xor(fearless(nathalia),timid(nathalia))).
% If Nathalia enjoys challenges and seeks thrills, then she will develop her skills.
axiom(s7,rule([and(enjoys_challenges(nathalia),seeks_thrills(nathalia))],develops_skills(nathalia))).
% Nathalia does not practice camping.
axiom(s8,not(practices_camping(nathalia))).
% If Nathalia is either timid or takes risks, then she is adventurous.
axiom(s9,rule([xor(timid(nathalia),takes_risks(nathalia))],adventurous(nathalia))).
% For Nathalia, achieving success and valuing humility are mutually exclusive.
axiom(s10,xor(achieves_success(nathalia),values_humility(nathalia))).
% Nathalia enjoys challenges.
axiom(s11,enjoys_challenges(nathalia)).
% If Zainab either pushes her limits or develops her skills (but not both), then she achieves success.
axiom(s12,rule([xor(pushes_limits(zainab),develops_skills(zainab))],achieves_success(zainab))).
% Nathalia takes risks or seeks thrills.
axiom(s13,or(takes_risks(nathalia),seeks_thrills(nathalia))).
% If Nathalia trusts her instincts, then she either calculates her moves or takes risks (or both).
axiom(s14,rule([trusts_instincts(nathalia)],or(calculates_moves(nathalia),takes_risks(nathalia)))).
% Zainab does not appreciate scenic views.
axiom(s15,not(appreciates_scenic_views(zainab))).
% Mae is either fearless or timid, but not both.
axiom(s16,xor(fearless(mae),timid(mae))).
% Nathalia enjoys adventure or seeks thrills.
axiom(s17,or(enjoys_adventure(nathalia),seeks_thrills(nathalia))).
% For Owen, achieving success and valuing humility are mutually exclusive.
axiom(s18,xor(achieves_success(owen),values_humility(owen))).
% If Nathalia either pushes her limits or develops her skills (but not both), then she achieves success.
axiom(s19,rule([xor(pushes_limits(nathalia),develops_skills(nathalia))],achieves_success(nathalia))).
% If someone is an explorer, then they are either adventurous or love nature.
axiom(s20,rule([explorer(X)],xor(adventurous(X),loves_nature(X)))).
% Nathalia values humility.
axiom(s21,values_humility(nathalia)).
% Zainab values humility.
axiom(s22,values_humility(zainab)).
% If someone either goes hiking or practices camping (but not both), then they have outdoor hobbies.
axiom(s23,rule([xor(goes_hiking(X),practices_camping(X))],outdoor_hobbies(X))).
% Anyone who has an outdoor job either loves nature or understands their environment.
axiom(s24,rule([outdoor_job(X)],or(loves_nature(X),understands_environment(X)))).
% Nathalia goes hiking.
axiom(s25,goes_hiking(nathalia)).
% Nathalia does not push her limits.
axiom(s26,not(pushes_limits(nathalia))).
% Zainab is an explorer.
axiom(s27,explorer(zainab)).
% Zainab enjoys challenges.
axiom(s28,enjoys_challenges(zainab)).
% If Mae enjoys challenges and seeks thrills, then she will develop her skills.
axiom(s29,rule([and(enjoys_challenges(mae),seeks_thrills(mae))],develops_skills(mae))).
% Zainab does not practice camping.
axiom(s30,not(practices_camping(zainab))).
