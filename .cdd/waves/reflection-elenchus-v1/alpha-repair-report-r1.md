# Alpha repair report R1: reflection-elenchus-v1

This repair responds to the independent beta `REQUEST CHANGES` verdict. It
does not replace a fresh beta review.

## Repairs

- A malformed hypothesis result now still contains `source_snapshot_sha256` and
  an explicit `registry_identity` object or `null`; no missing identity is
  silently invented.
- The contract now defines inline registry identity precisely: the SHA-256
  binds exact declaration bytes. A shared on-disk registry is deferred to its
  own governance/versioning contract rather than being falsely implied.
- Focused tests compare the trusted `ontology-registry-v1.json` bytes before
  and after evaluation in addition to the memory fixture bytes.
- General reflection tests now use a tracked synthetic fixture rather than
  ignored local `data/memory.pl`, making `npm test` reproducible from an archive
  with installed dependencies.

## Re-run evidence

```text
npm run test:cdr-annotation  PASS
npm test                      PASS
npm run test:cdr-gold         PASS, existing B5 12/12
git diff --check              PASS
```

## Remaining boundary

The Elenchus registry is immutable by inline-content hash, not yet a shared
World-of-Ideas registry selection. The repair does not claim a live LLM can
produce useful hypotheses. Fresh independent beta review remains required.
