% Loaded alongside the actual checker.pl; never consult model-authored text.
% Reuses its one_term/clause_term grammar, including vocabulary and safety checks.
paired_canonical_main :-
    catch((json_read_dict(current_input, R),
           call_with_inference_limit(call_with_time_limit(2,
             maplist(paired_canonical(R.registry), R.programs, Results)), 1000000, Limit),
           require(Limit \== inference_limit_exceeded, canonical_inference_limit),
           json_write_dict(current_output, _{results:Results}), nl),
          Error, (error_result(Error, Out), json_write_dict(current_output, Out), nl)).
paired_canonical(Registry, Text, Out) :-
    catch((one_term(Text, Term), clause_term(Term, Registry, Head, Body),
           copy_term(rule(Head, Body), Canonical), numbervars(Canonical, 0, _),
           term_string(Canonical, String, [quoted(true), ignore_ops(true), numbervars(false)]),
           Out = _{status:valid, canonical:String}),
          Error, error_result(Error, Out)).
