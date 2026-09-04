# Alpha repair report R2: canonical inline registry identity

This repair responds to beta's remaining registry-provenance finding.

- Registry identity is now `sha256(canonicalJson(registry))`: recursively
  sorted object keys with declaration-array order retained. This is executable
  and avoids claiming that parsed JSON retains original whitespace bytes.
- The accepted CLI fixture and focused tests use the same canonical digest.
- The unrelated on-disk registry-byte assertion was removed: the current
  Elenchus contract uses a hash-pinned inline registry, not a file it does not
  consume.

`node test-elenchus.js` and `npm test` pass. A shared registry file/commit
selection remains outside this bounded issue and requires separate governance.
