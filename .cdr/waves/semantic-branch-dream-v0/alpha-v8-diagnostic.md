# Luna semantic branch dream v8 — review required

Status: `REVISE`. The raw v8 directory is preserved as a development
diagnostic, but its 12-case aggregate is withdrawn. It is not a CDR receipt
and must not be read as accuracy evidence.

An independent review found that the runner accepted `PAM_DIAGNOSTIC_OUTCOME:
succeeded` after SWI-Prolog had printed a syntax error. SWI can continue with
a partially loaded file, so those outputs do not execute the submitted full
candidate.

| Finding | Affected v8 records | Consequence |
| --- | --- | --- |
| Syntax/load error accepted as success | baseline 31; both branches 284 and 333 | Invalidates 284's reported dependency and 333's reported stability. |
| Branch exceeded its stated delta | 284 h1/h2; 333 h1/h2; 434 h2; 490 h2 | These alternatives are outside the registered branch contract. |
| One rejected branch hidden by the aggregate | 362 h1 | The former `stable` label is invalid; a partial comparison is unresolved. |
| Sentence splitter broke `Dr.` | 362 | Its source quote could be rejected for a parser artifact. |

The fail-closed replay was then performed from the saved full candidates with
zero model calls. It yields 2 `stable` cases (106, 294), 1 mechanically
`branch_dependent` case (123), and 9 `unresolved` cases. Manual review removes
ID 123 as an ambiguity: its cited English says “but not necessarily both”, so
the `or` branch is required and the baseline `xor` is simply a formalization
error. The replay therefore leaves zero confirmed competing OR/XOR readings.
It has no gold comparison and the sample was used while iterating v1–v8. No
conclusion about Luna's accuracy, the number of real ambiguities, or an
automatic final answer follows.

The implementation now fails closed on Prolog load errors, treats a rejected
or failed branch as `unresolved`, aligns the two prompts to one finite-FOL
grammar, and audits each branch's textual delta without constructing an AST or
patching a candidate. The next useful experiment must preregister genuinely
ambiguous source language (without “not necessarily both” or “but not both”)
and use a held-out sample before any new Luna run.

Raw evidence and the local replay remain in `raw-luna-v8-20260909/`. Earlier
`raw-luna-v1` through `v7` directories are rejected setup attempts and are
excluded.
