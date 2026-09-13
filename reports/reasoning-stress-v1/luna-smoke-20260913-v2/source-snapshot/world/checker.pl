% Trusted signed-Horn interpreter. Input programs are TERMS, never consulted or called.
:- use_module(library(http/json)).
:- use_module(library(time)).
:- initialization(main, main).

main :-
    catch((json_read_dict(current_input, Request),
           call_with_inference_limit(call_with_time_limit(Request.seconds, run(Request, Result)),
                                     Request.inferences, Limit),
           ( Limit == inference_limit_exceeded -> Output = _{status:resource_exhausted, reason:inferences}
           ; Output = Result )), Error, error_result(Error, Output)),
    json_write_dict(current_output, Output), nl.
error_result(time_limit_exceeded, _{status:resource_exhausted, reason:time}) :- !.
error_result(error(resource_error(proof_support_sets), _), _{status:resource_exhausted, reason:proof_support_sets}) :- !.
error_result(error(resource_error(_), _), _{status:resource_exhausted, reason:memory}) :- !.
error_result(Error, _{status:unsupported, reason:Text}) :- term_string(Error, Text).

require(Goal, Why) :- (call(Goal) -> true ; throw(invalid(Why))).
% All require/2 goals below are authored here, not supplied as executable input.
one_term(Text, Term) :-
    setup_call_cleanup(open_string(Text, Stream),
      (read_term(Stream, Term, [syntax_errors(error)]),
       read_term(Stream, End, [syntax_errors(error)]),
       require(End == end_of_file, multiple_terms)), close(Stream)),
    require(Term \== end_of_file, empty_program).
literal(neg(P), Registry) :- !, positive_literal(P, Registry).
literal(P, Registry) :- positive_literal(P, Registry).
positive_literal(P, Registry) :-
    require(nonvar(P), variable_goal),
    P =.. [Name|Args], length(Args, Arity), atom_string(Name, String),
    require(member(_{name:String, arity:Arity}, Registry), undeclared(Name/Arity)),
    require(maplist(flat_arg, Args), compound_argument).
flat_arg(A) :- var(A), !.
flat_arg(A) :- atom(A), !.
flat_arg(A) :- number(A).
body((A,B), Registry, Literals) :- !,
    body(A, Registry, Left), body(B, Registry, Right), append(Left, Right, Literals).
body(A, Registry, [A]) :- literal(A, Registry).
clause_term((Head :- Body), Registry, Head, Literals) :- !,
    literal(Head, Registry), body(Body, Registry, Literals),
    term_variables(Head, HV), term_variables(Literals, BV),
    require(vars_in(HV, BV), unbound_head_variable).
clause_term(Head, Registry, Head, []) :-
    literal(Head, Registry), require(ground(Head), nonground_fact).
vars_in([], _).
vars_in([V|Vs], All) :- identical_member(V, All), vars_in(Vs, All).
identical_member(V, [A|_]) :- V == A, !.
identical_member(V, [_|As]) :- identical_member(V, As).
item_source_group(Item, Group) :- (get_dict(source_group, Item, Value) -> Group = Value ; Group = Item.source).
parse_item(Registry, Item, rule(Head, Body, Item.id, Item.source, Group)) :-
    one_term(Item.program, Term), clause_term(Term, Registry, Head, Body), item_source_group(Item, Group).
opposite(neg(P), P) :- !.
opposite(P, neg(P)).
literal_text(P, Text) :- term_string(P, Text, [quoted(true), numbervars(true)]).

run(R, Result) :- R.mode == "import_assertions", !,
    setup_call_cleanup(open_string(R.import_text, Stream), read_envelopes(Stream, Terms), close(Stream)),
    maplist(envelope, Terms),
    findall(Item, imported_assertion(Terms, R.registry, Item), Items),
    findall(IdText, (member(assertion(Id,_), Terms), atom_string(Id, IdText)), All),
    Result = _{status:imported, items:Items, original_ids:All}.
run(R, Result) :-
    maplist(parse_item(R.registry), R.items, Rules),
    one_term(R.query, Query), literal(Query, R.registry), require(ground(Query), nonground_query),
    ( R.mode == "validate" -> literal_text(Query, QueryText), Result = _{status:valid, query:QueryText}
    ; closure(Rules, [], [], R.max_facts, Raw),
      findall(P, (member(node(P,_,_,_), Raw), opposite(P, N), member(node(N,_,_,_), Raw)), Bad0),
      sort(Bad0, Bad), closure(Rules, Bad, [], R.max_facts, Safe),
      support_closure(Rules, [], [], R.max_proof_support_sets, RawSupports),
      support_closure(Rules, Bad, [], R.max_proof_support_sets, SafeSupports),
      verdict(Query, Raw, RawStatus), verdict(Query, Safe, SafeStatus),
      maplist(node_json, Raw, RawJSON), maplist(node_json, Safe, SafeJSON),
      maplist(support_json(Rules), RawSupports, RawSupportJSON), maplist(support_json(Rules), SafeSupports, SafeSupportJSON),
      maplist(literal_text, Bad, Conflicts), literal_text(Query, QueryText),
      findall(Plan, plan_json(Query, Rules, Safe, Bad, Plan), Plans0), sort(Plans0, Plans),
      Result = _{status:ok, query:QueryText, raw_status:RawStatus, safe_status:SafeStatus,
                 conflicts:Conflicts, raw:RawJSON, safe:SafeJSON,
                 raw_support_sets:RawSupportJSON, safe_support_sets:SafeSupportJSON, plans:Plans}
    ).
read_envelopes(Stream, Terms) :- read_term(Stream, T, [syntax_errors(error)]),
    (T == end_of_file -> Terms = [] ; Terms = [T|Rest], read_envelopes(Stream, Rest)).
envelope(T) :- require(ground(T), nonground_envelope), functor(T, Name, Arity),
    require(memberchk(Name/Arity, [assertion/2, assertion_status/2, assertion_status_event/2,
      assertion_polarity/2, assertion_modality/2, assertion_time/2, assertion_source/2,
      assertion_confidence/2, assertion_revision/3]), unsupported_envelope(Name/Arity)).
single(Pattern, Terms, Value) :- findall(Value, member(Pattern, Terms), Values),
    require(Values = [_], ambiguous_or_missing_qualifier), Values = [Value].
imported_assertion(Terms, Registry, Item) :-
    member(assertion(Id, P), Terms), require(atom(Id), invalid_assertion_id),
    \+ member(assertion_revision(_, replaces, Id), Terms),
    \+ member(assertion_status_event(Id, reviewed), Terms),
    member(assertion_status(Id, accepted), Terms),
    single(assertion_status(Id, Status), Terms, Status), require(Status == accepted, bad_status),
    single(assertion_polarity(Id, Polarity), Terms, Polarity),
    single(assertion_modality(Id, Modality), Terms, Modality),
    single(assertion_time(Id, interval(From, To)), Terms, From-To),
    single(assertion_source(Id, Source), Terms, Source),
    require((integer(From), (integer(To); To == inf)), unsupported_time),
    (Polarity == positive -> Literal = P ; Polarity == negative -> Literal = neg(P) ; throw(invalid(polarity))),
    literal(Literal, Registry), literal_text(Literal, Text), literal_text(Source, SourceText),
    atom_string(Id, IdText), atom_string(Modality, ModalityText),
    (To == inf -> ValidTo = null ; ValidTo = To),
    Item = _{id:IdText, program:Text, validFrom:From, validTo:ValidTo, modality:ModalityText, original_source:SourceText}.
closure(Rules, Bad, Known, Max, Final) :-
    findall(node(H,Id,Source,Children),
      (member(rule(H,B,Id,Source,_), Rules), satisfied(B, Known, Children), ground(H),
       \+ memberchk(H, Bad), \+ member(node(H,_,_,_), Known)), Candidates),
    add_new(Candidates, Known, Next), length(Next, Count),
    (Count > Max -> throw(error(resource_error(fact_limit), checker)) ; true),
    (Next == Known -> Final = Known ; closure(Rules, Bad, Next, Max, Final)).
satisfied([], _, []).
satisfied([H|B], Known, [H|Children]) :- member(node(H,_,_,_), Known), satisfied(B, Known, Children).
add_new([], Known, Known).
add_new([node(H,I,S,C)|Rest], Known, Final) :-
    (member(node(H,_,_,_), Known) -> Next = Known ; append(Known, [node(H,I,S,C)], Next)),
    add_new(Rest, Next, Final).
verdict(Q, Known, Status) :-
    opposite(Q, N),
    (member(node(Q,_,_,_), Known) -> P = yes ; P = no),
    (member(node(N,_,_,_), Known) -> M = yes ; M = no),
    status(P, M, Status).
status(yes, no, entailed).
status(no, yes, contradicted).
status(yes, yes, conflict).
status(no, no, unknown).
node_json(node(P, Id, Source, Children), _{literal:Text, item_id:Id, source:Source, children:Texts}) :-
    literal_text(P, Text), maplist(literal_text, Children, Texts).

% The closure above deliberately retains its first derivation for a compact trace.
% These antichains retain every inclusion-minimal item-ID support set separately.
% A support set is provenance, not an admission decision or a claim of source independence.
support_closure(Rules, Bad, Supports, Max, Final) :-
    findall(Candidate, support_candidate(Rules, Bad, Supports, Candidate), Candidates),
    foldl(add_support, Candidates, Supports, Next0), sort(Next0, Next), length(Next, Count),
    (Count > Max -> throw(error(resource_error(proof_support_sets), checker)) ; true),
    (Next == Supports -> Final = Next ; support_closure(Rules, Bad, Next, Max, Final)).
support_candidate(Rules, Bad, Supports, support(H, IDs)) :-
    member(rule(H, Body, Id, _, _), Rules), body_supports(Body, Supports, ChildIDs),
    ground(H), \+ memberchk(H, Bad), sort([Id|ChildIDs], IDs).
body_supports([], _, []).
body_supports([Literal|Rest], Supports, IDs) :-
    member(support(Literal, Here), Supports), body_supports(Rest, Supports, There), append(Here, There, IDs).
add_support(support(P, IDs), Supports, Supports) :-
    member(support(P, Existing), Supports), subset_ids(Existing, IDs), !.
add_support(support(P, IDs), Supports, Next) :-
    remove_dominated(P, IDs, Supports, Kept), append(Kept, [support(P, IDs)], Next).
remove_dominated(_, _, [], []).
remove_dominated(P, IDs, [support(P, Existing)|Rest], Kept) :-
    strict_subset_ids(IDs, Existing), !, remove_dominated(P, IDs, Rest, Kept).
remove_dominated(P, IDs, [Item|Rest], [Item|Kept]) :- remove_dominated(P, IDs, Rest, Kept).
subset_ids([], _).
subset_ids([Id|Rest], IDs) :- memberchk(Id, IDs), subset_ids(Rest, IDs).
strict_subset_ids(Left, Right) :- subset_ids(Left, Right), Left \== Right.
support_json(Rules, support(P, IDs), _{literal:Text, item_ids:IDs, source_ids:Sources, fact_source_ids:FactSources, rule_source_ids:RuleSources, source_group_ids:Groups, fact_source_group_ids:FactGroups, rule_source_group_ids:RuleGroups}) :-
    literal_text(P, Text),
    findall(Source, (member(Id, IDs), member(rule(_,_,Id,Source,_), Rules)), Sources0), sort(Sources0, Sources),
    findall(Source, (member(Id, IDs), member(rule(_,[],Id,Source,_), Rules)), FactSources0), sort(FactSources0, FactSources),
    findall(Source, (member(Id, IDs), member(rule(_,Body,Id,Source,_), Rules), Body \== []), RuleSources0), sort(RuleSources0, RuleSources),
    findall(Group, (member(Id, IDs), member(rule(_,_,Id,_,Group), Rules)), Groups0), sort(Groups0, Groups),
    findall(Group, (member(Id, IDs), member(rule(_,[],Id,_,Group), Rules)), FactGroups0), sort(FactGroups0, FactGroups),
    findall(Group, (member(Id, IDs), member(rule(_,Body,Id,_,Group), Rules), Body \== []), RuleGroups0), sort(RuleGroups0, RuleGroups).

% Bounded backward missing-premise control. It does not assume an unknown true.
plan_json(Q, Rules, Safe, Bad, _{missing:Texts, rule_ids:Ids}) :-
    plan(Q, Rules, Safe, Bad, [], 16, Missing, Used),
    sort(Missing, Unique), maplist(literal_text, Unique, Texts), sort(Used, Ids).
plan(Q, _, Safe, _, _, _, [], []) :- member(node(Q,_,_,_), Safe).
plan(Q, Rules, Safe, Bad, Seen, Depth, Missing, [Id|Used]) :-
    Depth > 0, \+ member(node(Q,_,_,_), Safe), \+ memberchk(Q, Bad),
    opposite(Q, N), \+ member(node(N,_,_,_), Safe), \+ memberchk(Q, Seen),
    member(rule(H, B, Id, _, _), Rules), H = Q, B \== [], Next is Depth - 1,
    plan_body(B, Rules, Safe, Bad, [Q|Seen], Next, Missing, Used).
plan(Q, Rules, Safe, Bad, _, _, [Q], []) :-
    ground(Q), \+ member(node(Q,_,_,_), Safe), \+ memberchk(Q, Bad),
    opposite(Q, N), \+ member(node(N,_,_,_), Safe), \+ member(rule(Q,_,_,_,_), Rules).
plan_body([], _, _, _, _, _, [], []).
plan_body([Q|Rest], Rules, Safe, Bad, Seen, Depth, Missing, Used) :-
    plan(Q, Rules, Safe, Bad, Seen, Depth, Left, A),
    plan_body(Rest, Rules, Safe, Bad, Seen, Depth, Right, B),
    append(Left, Right, Missing), append(A, B, Used).
