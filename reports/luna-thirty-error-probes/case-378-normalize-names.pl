:- use_module('../../finite-fol-meta-prover.pl').
domain(person,[clark,kylan,harrison]).

% For all scientists, if a scientist is renowned, then they either make breakthrough discoveries or receive accolades (or both).
axiom(s1, forall(var(x,person), implies(and(scientist(var(x)), renowned(var(x))), or(make_breakthrough_discoveries(var(x)), receive_accolades(var(x)))))).

% If Dr. Clark conducts innovative research, then he will either advance the field or improve existing processes, but not both.
axiom(s2, rule([conducts_innovative_research(clark)], xor(advance_field(clark), improve_existing_processes(clark)))).

% If Dr. Clark pursues a PhD, then he either dedicates his career to research or works in industry, but not both.
axiom(s3, rule([pursues_phd(clark)], xor(dedicates_career_to_research(clark), works_in_industry(clark)))).

% Dr. Clark pursues a PhD.
axiom(s4, pursues_phd(clark)).

% If Dr. Kylan conducts innovative research, then he will either advance the field or improve existing processes, but not both.
axiom(s5, rule([conducts_innovative_research(kylan)], xor(advance_field(kylan), improve_existing_processes(kylan)))).

% Dr. Clark leads research teams.
axiom(s6, leads_research_teams(clark)).

% Dr. Clark conducts innovative research.
axiom(s7, conducts_innovative_research(clark)).

% Dr. Kylan publishes papers.
axiom(s8, publishes_papers(kylan)).

% Dr. Clark either conducts experiments or teaches at a university.
axiom(s9, or(conducts_experiments(clark), teaches_at_a_university(clark))).

% Dr. Clark does not drive progress.
axiom(s10, not(drives_progress(clark))).

% If Dr. Clark either develops new techniques or makes breakthrough discoveries (but not both), then he will advance his field.
axiom(s11, rule([xor(develops_new_techniques(clark), make_breakthrough_discoveries(clark))], advance_field(clark))).

% All scientists either study phenomena or develop new techniques.
axiom(s12, forall(var(x,person), implies(scientist(var(x)), or(study_phenomena(var(x)), develops_new_techniques(var(x)))))).

% Dr. Clark either teaches at a university or works in industry, but not both.
axiom(s13, xor(teaches_at_a_university(clark), works_in_industry(clark))).

% If Dr. Clark publishes papers and influences others, then he is renowned.
axiom(s14, rule([publishes_papers(clark), influences_others(clark)], renowned(clark))).

% Dr. Harrison pursues a PhD.
axiom(s15, pursues_phd(harrison)).

% Dr. Kylan does not create new materials.
axiom(s16, not(creates_new_materials(kylan))).

% Dr. Clark does not create new materials.
axiom(s17, not(creates_new_materials(clark))).

% If a scientist develops new techniques, then they will drive progress in their field.
axiom(s18, forall(var(x,person), implies(and(scientist(var(x)), develops_new_techniques(var(x))), drives_progress(var(x))))).

% Every scientist who dedicates their career to research either improves existing processes or creates new materials.
axiom(s19, forall(var(x,person), implies(and(scientist(var(x)), dedicates_career_to_research(var(x))), or(improve_existing_processes(var(x)), creates_new_materials(var(x)))))).

% Clark influences others.
axiom(s20, influences_others(clark)).

% If Dr. Clark either leads research teams or teaches at a university (but not both), then he collaborates with his peers.
axiom(s21, rule([xor(leads_research_teams(clark), teaches_at_a_university(clark))], collaborates_with_his_peers(clark))).

% Dr. Clark publishes papers.
axiom(s22, publishes_papers(clark)).

% Clark does not collaborate with his peers.
axiom(s23, not(collaborates_with_his_peers(clark))).

% Any scientist who studies complex phenomena or tests new hypotheses can advance their field.
axiom(s24, forall(var(x,person), implies(and(scientist(var(x)), or(studies_complex_phenomena(var(x)), tests_new_hypotheses(var(x)))), advance_field(var(x))))).

% Dr. Clark dedicates his career to research if he is passionate about science.
axiom(s25, rule([passionate_about_science(clark)], dedicates_career_to_research(clark))).
