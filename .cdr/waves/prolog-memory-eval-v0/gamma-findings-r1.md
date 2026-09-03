# Gamma findings R1 — prolog-memory-eval-v0

- F1, F2, F4: accepted as bounded repairs by independent beta R1.
- F5: checksum mismatch was caused by the intentional SWI engine-selection
  change in `memory-store.js`; the recorded SHA-256 was updated. This is a
  provenance repair, not research evidence.
- F3: remains blocking. The pinned CDS harness, configuration, sentinels, and
  raw machine-readable run output do not exist yet.

## Gate

Wave state remains `REVISE`. Receipt is not permitted. No PAM architecture
claim is transmissible. Next work is a separate CDS harness implementation,
followed by a fresh run and independent beta audit.
