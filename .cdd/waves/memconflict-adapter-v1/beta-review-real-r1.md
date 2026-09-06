# CDD β review r1: real MemConflict intake

- Reviewer: fresh independent β.
- Reviewed immutable commit: `5122f75`.
- Scope: real `Step4_4.jsonl` schema intake/index only; no CDR or PAM-C1 claim.
- Verdict: **GO** for this bounded intake scope.

## Evidence reproduced

- Source `/tmp/memconflict-live-3vINu8/Step4_4.jsonl` SHA-256 matched the
  authorized value `8ef9ec8589eccb86f63ab3a819a9180217405351a8d5846866721ea74babe092`.
- `node test-memconflict-adapter.js` passed.
- A fresh temporary output directory and the real source produced
  `20` eligible personas, `1056` sessions, and `2505` questions
  (`dynamic=1952`, `static=240`, `conditional=313`). The manifest preserved
  source path, byte count, SHA, and upstream revision
  `ec51d5d36e87f7665d1337f3a88cbde95fc2a964`.
- The index uses the observed fields `ID`, `Full_Session_Chain`,
  `Session_ID`, `Date`, `Session_Dialogue`, `Session_Questions`, question
  `question_id/question/answer/conflict_type/ability_target/difficulty`, and
  the observed conflict metadata fields. It emits persona/session/question
  coordinates, message content hashes and source-shape markers, gold answer,
  category, and typed exclusions.
- Ten source personas containing missing/empty dialogue content were excluded
  fail-closed and recorded in `rejection-report.json`; this is explicit loss
  of eligibility, not silent normalization or fabricated provenance.
- An adversarial real-shaped row with its question `answer` removed failed
  with `INELIGIBLE: source contains no eligible records`; no output was
  accepted as a valid index.

## Boundary checks

- The reviewed code is provider-free and has no network/download path or shell
  evaluation of source content. It does not write Prolog memory/registry state.
- The output is an `index.json` intake plus manifest and rejection report; it
  does not emit fixture/oracle/mapping data and explicitly states
  `prose_to_prolog: not_performed` and `oracle: not_computed`.
- The raw source is not tracked, vendored, or sent to a provider. The license
  gate remains `blocked_pending_upstream_terms`.

This GO authorizes only the real-source intake/index implementation. It is not
readiness for live CDR collection, does not validate a 24-case mapping, and
does not establish a memory-utility result.
