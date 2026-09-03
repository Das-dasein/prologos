:- use_module(library(http/json)).
:- initialization(main, main).
main :- current_prolog_flag(argv, [Program, Query, ParamsJson|_]), consult(Program), atom_json_term(ParamsJson, Params, []), dispatch(Query, Params, Answers), supporting_for(Query, Supporting), json_write_dict(current_output, _{answers:Answers, supporting_rules:Supporting}), nl.
supporting_for(derived, Supporting) :- !, findall(Id, ontology_support(Id), RuleIds), sort(RuleIds, Supporting).
supporting_for(_, []).
dispatch(derived, [], A) :- !, findall(_{query:derived,bindings:_{'P':P},value:V}, (knows_multiple_programming_languages(P), V="knows_multiple_programming_languages"), A).
dispatch(active_claims, [], []).
dispatch(conflicts, [], []).
dispatch(provenance, [], []).
dispatch(_, _, []) :- throw(error(unknown_query, _)).
