:- use_module(library(http/json)).
:- initialization(main, main).
main :- current_prolog_flag(argv, [Program, Query, ParamsJson|_]), consult(Program), atom_json_term(ParamsJson, Params, []), dispatch(Query, Params, Answers), supporting_for(Query, Supporting), json_write_dict(current_output, _{answers:Answers, supporting_rules:Supporting}), nl.
supporting_for(derived, Supporting) :- !, (current_predicate(knows_multiple_programming_languages/1) -> findall(Id, (knows_multiple_programming_languages(P), ontology_support(Id, knows_multiple_programming_languages, [P])), RuleIds) ; findall(Id, (ontology_derived(Pred, Args), ontology_support(Id, Pred, Args)), RuleIds)), sort(RuleIds, Supporting).
supporting_for(_, []).
dispatch(derived, [], A) :- !, (current_predicate(knows_multiple_programming_languages/1) -> findall(_{query:derived,bindings:_{'P':P},value:"knows_multiple_programming_languages"}, knows_multiple_programming_languages(P), A) ; findall(_{query:derived,bindings:_{},value:Pred,arguments:Args}, ontology_derived(Pred, Args), A)).
dispatch(active_claims, [], []).
dispatch(conflicts, [], []).
dispatch(provenance, [], []).
dispatch(_, _, []) :- throw(error(unknown_query, _)).
