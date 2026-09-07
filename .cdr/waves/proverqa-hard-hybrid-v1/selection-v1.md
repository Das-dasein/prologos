# ProverQA hard hybrid selection v1

The source file is `dev/hard.json` at the URL and commit pinned in
`source-manifest.json`. Its verified SHA-256 is
`79428ef614d43729ce82e4d065055fdc6a39abad0f20cb226c5288fc315468e4`.

Generator: `proverqa-hard-preflight.js` v1.
Seed: `proverqa-hard-hybrid-v1-20260907`.

| Source answer | Selected source ids |
| --- | --- |
| A (true) | 96, 185, 267, 304 |
| B (false) | 22, 200, 213, 373 |
| C (uncertain) | 179, 327, 348, 368 |

The P2-hybrid subset has source ids `96, 179, 200, 267, 304, 368`.
Every one contains at least one universal quantifier in its source `nl2fol`
map. This is a source-selection fact only: it is neither a solver result nor
a model-quality result.

To reproduce the non-vendored fixture locally:

```sh
node proverqa-hard-preflight.js \
  --source /absolute/path/to/hard.json \
  --source-manifest .cdr/waves/proverqa-hard-hybrid-v1/source-manifest.json \
  --output /tmp/proverqa-hard-hybrid-fixture.json
```
