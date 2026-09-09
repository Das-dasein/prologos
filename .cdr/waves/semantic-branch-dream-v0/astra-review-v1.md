# Advisory review — Astra

Verdict: `REVISE`; do not start a new Luna run before repairing accounting.

The review identified five branch/baseline executions where SWI-Prolog emitted
a syntax error before the wrapper's success marker, three candidates outside
their stated branch contract, a partial-branch aggregation error, and a
sentence-splitting artifact around `Dr.`. The raw v8 data remain preserved as
development evidence only. The required next action is a clean, LLM-free
replay plus manual candidate-delta audit.
