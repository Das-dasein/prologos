# Beta review: CDR wire-authority repair v5 (issue #44)

## Scope and independence

Fresh independent CDR beta review of alpha target
`6e662682154d4005b0f0516e6e0d3673224c8487` against gamma scaffold
`f24bb217eed0941e4f0fac1e1d4877fe2e81b934`.

The alpha is a descendant of gamma and adds only the forward-only v5
registry, fixture, schema, validator, documentation, and npm command. It
does not modify v4, the collector, data, oracle, threshold, policy, scoring,
aggregation, provider implementation, or a live-result artifact.

## Reproduction

I created a fresh `git archive` of the alpha commit. This repository does not
contain a package lockfile, so `npm ci` correctly cannot run; the clean
archive used `npm install --ignore-scripts --no-audit --no-fund` instead.

```text
node build-wire-authority-prompt-digest-registry-v5.js
cmp rebuilt JSON with wire-authority-assembled-prompt-digest-registry-v5.json
# identical

npm run test:cdr-receipt-intake:v5
# receipt-intake-v5-self-test-ok

npm run test:cdr-receipt-intake:v4
# receipt-intake-v4-self-test-ok

npm test
# complete baseline suite passed
```

The rebuilt v5 registry, including its self-hash and every P0/P1 digest,
matches the committed registry byte-for-byte. Its authority source map is
exactly, and only:

```text
providers/openai-answering.js
trusted-proof-answering.js
```

The sealed assembler remains named as an identity-bound input, with literal
template identities. It is not misrepresented as a third transport source.

## Independent mutation matrix

Changing the contents of `trusted-proof-live-candidate.js` and of
`trusted-proof-live-candidate-config-v3.json` separately did not change the
rebuilt v5 registry or its two-item authority source list. Conversely,
physical content mutation of each listed transport source made registry
reproduction fail against its pinned SHA-256.

I also constructed a full local synthetic candidate envelope with all P0/P1
pairs and locally created prompt/raw artifacts. No provider, model, or
network API was invoked. Each of the following mutations was rejected:

| Gate | Mutation |
| --- | --- |
| Literal | registered base-template identity changed |
| Input / input mode | dataset binding changed; mode changed |
| Sampling | `top_p` changed |
| Prompt | record prompt digest changed |
| Raw | local raw artifact content changed after its declared hash |
| Proof | P1 trusted-proof digest changed |
| Equal E | one P1 effective-context budget changed |
| Leakage | hidden-answer-contract field added to scorer |
| Historical envelopes | schema changed independently to v1, v2, v3, and v4 |

The supplied v5 self-test independently covers all historical-version
rejections, exact sampling shape, input-mode and prompt swapping, consumer
non-consultation, authority-map/template/sampling drift, and raw SHA mismatch.

## No-live boundary

The v5 builder and validator only rebuilt deterministic local sealed prompts
and checked local synthetic artifacts. There was no provider call, network
call, model inference, live raw data, score aggregation, effectiveness claim,
or policy/data/oracle/threshold change.

## Verdict

`GO_PREPARATION`.

This approves only the deterministic v5 authority-bound receipt preparation.
It is not permission for a live collection and is not evidence of model or
method effectiveness.
