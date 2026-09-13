# Memory grounding review v2 policy control v1

This fresh control measures whether grounding review v2 follows the frozen
predicate-grounding policy. The policy, ontology identity, 24 inputs, gold
labels, prompt contract, schema, collector, and verifier were frozen before the
first live call.

Luna returned the expected verdict for all 24 one-assertion candidates:

- Verdict accuracy: 24/24.
- Gate accuracy: 24/24.
- Harmful assertions passed as `entailed`: 0/13.
- Entailed assertions blocked: 0/10.
- The unadmitted Cyrillic-to-Latin transliteration was `uncertain`: 1/1.
- Structural or hash diagnostics: 0.
- Provider calls: 24; memory/admission writes: 0.

The cases cover habitual versus isolated, desired, and hypothetical roles;
employment versus project or event association; residence versus ownership or
future movement; enrollment versus a single course; knowledge versus reading;
past work versus current use; actual versus hypothetical use; stated interest
versus one attendance; project participation versus employment; and admitted
ASCII normalization versus an unadmitted transliteration.

This establishes policy adherence on a small hand-authored control. Most
negative examples closely instantiate exclusions written in the policy, each
candidate contains one assertion, and 23/24 messages are English. Therefore
24/24 is evidence that the contract is executable and followed on these
boundaries; it is not evidence of general semantic-grounding accuracy,
extraction quality, incremental product benefit, or a safe autonomous write
path. Review v2 remains experimental and has no admission authority.

Artifacts:

- Policy identity: `conversation_grounding@1.0.0`
- Policy SHA-256: `c012e2b9ca0f571d226076656324f62dc6919059dd2b342c94cb09b5782d402f`
- Frozen fixture SHA-256: `fc320b4088f754f595bef3308719f2a970854ae4ea0975e0f12fb66a380a340b`
- Frozen gold SHA-256: `37f359f40c820ac80e80f4c6b3b550823037e0e981bc9c0f7c298a72fa174f94`
- Live report SHA-256: `d7b3a62886dae2dadb6b075d64dc0c26bbd2f64831b4843c053902e19734ed8a`
- Raw artifacts: 72 files; 473,783 input tokens, including 115,200 cached,
  and 5,055 output tokens as reported by the provider.

Replay without provider calls:

```bash
node verify-grounding-review-v2-policy-eval.cjs \
  reports/memory-grounding-review-v2-policy-control-v1/luna/report.json \
  .cdr/waves/memory-grounding-review-v2-policy-control-v1/fixture.jsonl \
  .cdr/waves/memory-grounding-review-v2-policy-control-v1/gold.jsonl
```
