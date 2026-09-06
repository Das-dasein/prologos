# CDR beta audit #60: Codex v8 local live-attempt evidence

Audited read-only raw root
`/Users/artem/Documents/prologos-live/codex-v8-run-20260906-1` against the
v8 authority/receipt contract on branch
`cdr/60-codex-v8-live-attempt-audit`.  This report is about this one attempt
only.

## Verdict

**NOT_A_CANDIDATE_RECEIPT — incomplete and equal-budget-invalid.**  The two
`multi_hop_01` artifacts are internally readable native Codex completions, but
they are not a candidate receipt and cannot enter aggregation.  There is no
receipt/intake envelope, only one of the required twelve case pairs is present,
and its measured effective-context budgets differ.

This is not an effectiveness, correctness, or comparative-performance result.
It neither validates nor invalidates the model or the experiment beyond the
evidence boundary stated here.

## Read-only evidence and hashes

All twelve files under `attempts/multi_hop_01/{p0,p1}` were enumerated and
SHA-256 hashed.  The submitted prompts match the sealed v8 registry entries:

| condition | prompt SHA-256 | stdout SHA-256 | stderr SHA-256 | final SHA-256 | metadata SHA-256 |
| --- | --- | --- | --- | --- | --- |
| P0 | `ff1c97eaa9f048e0ef094d6303271c632d8122ab6b8dce1f6efeb38990934a50` | `a410c9f1a7643d564bfad8b00a8453a8c7dfeaf733dbc0419eabf732d6961092` | `1aa26269eb1cc57f86b235a03cda53c004edb5b1e9fc99d4da4f00843293d721` | `0cf583d29e696bd2241c7d29681de0246ed96b6f9df23747cb752cef3a7c1c33` | `d5ebab4700e6b8101b36f44e1cc0f761fc9850eb66c9b9c9926b89166e473490` |
| P1 | `65a367a03370468e85e83ad9bb63549fa5da077045e3c24f888321415fc0261d` | `5ca6e8cc82b72a56f60e46ebc316297fed80674bdca41d9ef7b6d4e4a416fc5a` | `1aa26269eb1cc57f86b235a03cda53c004edb5b1e9fc99d4da4f00843293d721` | `88db729a59d9a627394adb4ea4ad7fe473174c18ac7f8f5c878e077a45eb901d` | `c6c07078328d0e4f22580ebc8c2438d6d85404e6c3ed0b53e6f24209c9d11ccc` |

For each condition, `metadata.json`'s submitted-prompt and provider-response
digest equals the observed file digest; the shared raw-response descriptor is
`f34f25d33830491e80ec873a864efebf346191652f8a104a01faa04dd7f24736`.
Both stderr files contain only `Reading additional input from stdin...`.
Each JSONL has one `thread.started`, one `turn.started`, one agent-message,
and exactly one `turn.completed`; the answer encoded in that agent message
equals the captured final-output JSON.

The two schema files hash to
`8a08cbd83800c409eac247ebd1512bafce2d5b14de09b0fdcd5811c5345c170a`.
That is the canonical registered `FINAL_SCHEMA` JSON plus the writer's terminal
newline; its canonical no-newline hash is the registry value
`0d2045c9e5fe365b83b91141940e95461296add72d72f3e201c61ca3df97032a`.
This is a serialization distinction, not an additional schema mismatch.

## Native usage reconstruction and exact E mismatch

Using the production `parseJsonl` and `completedUsage` functions on the raw
stdout gives:

| condition | input | output | total | measured effective-context budget |
| --- | ---: | ---: | ---: | ---: |
| P0 | 20,207 | 245 | 20,452 | 20,207 |
| P1 | 19,564 | 170 | 19,734 | 19,564 |

Those counters reconcile with their respective metadata records.  The v8
validator defines measured effective-context budget as native `input_tokens`
and requires P0 and P1 to be equal within every case pair.  For
`multi_hop_01`, the exact E mismatch is **20,207 != 19,564** (difference
**643 input tokens**).  P1's reported `cached_input_tokens: 9984` is an
auxiliary raw event field and is not substituted for the native input counter.

## Receipt boundary

No `codex-exec-receipt-intake-v8` candidate envelope or any receipt-like file
exists in the supplied raw root.  Therefore it cannot provide the required
24 records / 12 complete P0–P1 pairs, run/config binding, artifact-reference
set, and candidate validation.  The local files establish neither a candidate
receipt nor an aggregable result.

No provider invocation, credential/auth inspection, raw-root modification,
implementation change, or rerun was performed.  No rerun recommendation is
made; any future action would require separate authority.
