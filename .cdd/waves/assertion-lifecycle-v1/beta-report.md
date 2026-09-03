# Beta report: assertion-lifecycle-v1

## Verdict

**PASS for the bounded lifecycle and safety boundary.** This verdict does not
establish truth, general ontology quality, or live LLM reflection quality.

## Review basis

The beta review consumed the lifecycle manifest and alpha report, then ran the
repository checks from a clean working tree.

## Evidence

```text
npm test                         PASS
npm run test:cdr-gold            PASS, 12/12
git diff --check                 PASS
```

The tests cover valid and invalid lifecycle transitions, unresolved-conflict
blocking, proposal validation against diagnostics and IDs, explicit approval,
append-only revisions/status events, and preservation of the source journal.

## Limitations

- This is a repository-level beta gate, not a fresh external model evaluation.
- Identity aliases remain review-only.
- Legacy assertions use a migration default of `accepted`.
- CDR result artifacts retain the historical `active_claims` field name.
- A separate beta is still required for reflection usefulness and semantic
  extraction quality.
