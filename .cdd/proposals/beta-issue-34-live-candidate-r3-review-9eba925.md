# Beta R3: RC review of live candidate collector

Reviewed exact clean alpha target `9eba925141927c6b017f49f8f9eb688513ccff4d`
(`cycle/34-live-candidate`) against Gamma R2
`175295ebd75c0104fefc2553fc3c5824a2885940` and the pinned CDR v3 intake
validator. This is a fake-client, local review only: no credential, network,
provider result, CDR receipt, merge, or issue close action occurred.

## Baseline replay

After `npm ci`, all of these exited 0:

```
npm run test:trusted-proof-live-candidate
npm run test:trusted-proof-preflight
npm run test:trusted-proof-answering
npm run test:cdr-receipt-intake:v3
npm test
```

The default offline operator command reported
`{"status":"offline-no-default-provider","provider_calls":0}`. Supplying
only `--provider openai-api --allow-live-provider` failed with `all live gates
are required`; no client was constructed. The target diff leaves `.cdr/**`,
the pinned transport, preflight, and answering source unchanged.

## Positive fake bundle evidence

The focused fake test creates 24 records and validates its receipt with v3.
Independent fake collection observed 24 provider calls, records in exact
`P0,P1` order for each of the 12 sorted cases, and 48 distinct local prompt/raw
references. Existing preflight call-boundary instrumentation proves an
individual P0 makes zero trusted-query calls and an individual P1 makes one.
At whole-collection level, direct instrumentation observes 48 trusted-query
calls: registry rebuilds in config validation and both v3/v2 validation also
reassemble all P1 prompts. Thus that aggregate number must not be represented
as “one query per P1 collection attempt”; only the collection loop itself has
the documented P0/P1 construction shape.

## Independent negative evidence

A separate injected-client harness exercised absent live permission, wrong
provider, config provider mismatch, wrong model, pre-existing root, provider
model mismatch, malformed usage, first-pair E mismatch, injected P1 proof
failure, and sealed-prompt leak mutation. Each failed without
`candidate-receipt-v3.json`; root pre-existence and bad gates left the client
counter at zero where the gate is before construction. Failures after an
attempt began may retain local raw evidence, as Gamma permits.

## Blocking finding: rejected cases are emitted as a validated candidate receipt

Gamma requirement 4 says a receipt requires no rejected/unavailable case.
`recordFor` records `scorer.decision: "rejected"`, but `collectCandidate`
checks only P0/P1 E and immutable fields before writing the receipt.
The v3 validator delegates to v2, and neither validator checks the scorer
decision. Consequently this entirely fake response client:

```
{ model: "fake-model", output_text: "fake",
  usage: { input_tokens: 1024, output_tokens: 1, total_tokens: 1025 } }
```

created a 24-record receipt in which all 24 records had
`scorer.decision === "rejected"`. The collector returned:

```
{"status":"candidate-emits-despite-rejected-records","calls":24,
 "integrity":"candidate-integrity-valid-not-a-result-v3","rejected":24}
```

This is a direct violation of the pre-emission gate; integrity-only status does
not cure it. The focused alpha test uses the same `output_text: "fake"` but
does not assert decisions or receipt suppression, so it masks the defect.

## Decision

**RC.** No executable collection GO is available for this target. Repair must
reject/unavailable-gate every record before receipt emission, prove that all
such negative paths leave no receipt, and re-run fresh beta. This review makes
no effectiveness claim.
