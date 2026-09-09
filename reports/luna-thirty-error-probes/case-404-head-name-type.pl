:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[julian,samson,milana]).

% If Julian has hidden talents, then he is either organized or creates new opportunities (or both).
axiom(s1,rule([hidden_talents(julian)],or(organized(julian),creates_new_opportunities(julian)))).

% Julian does not avoid risks.
axiom(s2,not(avoids_risks(julian))).

% Julian does not read widely.
axiom(s3,not(reads_widely(julian))).

% Julian is either curious or avoids risks, but not both.
axiom(s4,xor(curious(julian),avoids_risks(julian))).

% Samson overcomes challenges.
axiom(s5,overcomes_challenges(samson)).

% Milana does not read widely.
axiom(s6,not(reads_widely(milana))).

% If Julian either values knowledge or pursues discovery (but not both), then he is a passionate researcher.
axiom(s7,rule([xor(values_knowledge(julian),pursues_discovery(julian))],passionate_researcher(julian))).

% All humans with curiosity value knowledge and respect history.
axiom(s8,rule([human(X),curious(X)],and(values_knowledge(X),respects_history(X)))).

% If Julian pursues discovery or reads widely, then he will make new breakthroughs.
axiom(s9,rule([or(pursues_discovery(julian),reads_widely(julian))],makes_new_breakthroughs(julian))).

% Everyone who has an inquisitive nature will pursue discovery.
axiom(s10,rule([inquisitive(X)],pursues_discovery(X))).

% If someone keeps things tidy and finds the resources they need, then they can achieve success.
axiom(s11,rule([organized(X),finds_needed_resources(X)],achieves_success(X))).

% If Julian has clear goals, then he either works efficiently or finds the resources he needs, but not both.
axiom(s12,rule([has_clear_goals(julian)],xor(works_efficiently(julian),finds_needed_resources(julian)))).

% Julian overcomes challenges.
axiom(s13,overcomes_challenges(julian)).

% Julian does not make new breakthroughs.
axiom(s14,not(makes_new_breakthroughs(julian))).

% If Julian is a passionate researcher, then he finds the resources he needs and overcomes challenges.
axiom(s15,rule([passionate_researcher(julian)],and(finds_needed_resources(julian),overcomes_challenges(julian)))).

% Julian does not achieve success.
axiom(s16,not(achieves_success(julian))).

% If Julian is dedicated to his field, then he is a passionate researcher.
axiom(s17,rule([dedicated_to_field(julian)],passionate_researcher(julian))).

% If Milana either values knowledge or pursues discovery (but not both), then he is a passionate researcher.
axiom(s18,rule([xor(values_knowledge(milana),pursues_discovery(milana))],passionate_researcher(milana))).

% Everyone who analyzes data either draws conclusions or respects history (or both).
axiom(s19,rule([analyzes_data(X)],or(draws_conclusions(X),respects_history(X)))).

% Milana loves learning.
axiom(s20,loves_learning(milana)).

% Julian is either organized or disorganized, but not both.
axiom(s21,xor(organized(julian),disorganized(julian))).
axiom(probe_type,human(julian)).

