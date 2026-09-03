# CDD wave: assertion-lifecycle-v1

## Objective

Make assertion epistemic status explicit and keep reflection changes
append-only and reviewable.

## In scope

- lifecycle statuses and allowed transitions;
- Socrates gating of unsafe derived conclusions;
- reflection proposals and explicit approval;
- preservation of source assertions and provenance.

## Out of scope

- automatic truth selection;
- deletion or rewriting of the raw journal;
- proof of general LLM semantic quality;
- ontology registry redesign.

## Definition of done

- valid and invalid lifecycle transitions are executable tests;
- unresolved conflicts block safe derived conclusions;
- reflection proposals are validated before application;
- application is append-only and requires explicit approval;
- existing regression and CDR gold tests remain green;
- an alpha report records evidence and limitations.
