# OSV revision dependency experiment v1

This module executes the preregistered old-revision → explicit copy →
replacement/withdrawal → restart → stale-redelivery episode. It compares a
current-record JavaScript aggregator, `WorldAgent` with assertion dependencies,
the same world without the copy dependency, and an independent JavaScript
truth-maintenance implementation.

The pre-run contract and source hashes are frozen in
[`prerun-manifest.md`](../../.cdr/waves/osv-revision-dependency-v1/prerun-manifest.md).
The selector requires a complete Git commit graph and the exact upstream commit
`8637d8ca65e3dbcc6a228e6f8bfb65df6559e675`; abbreviated refs and shallow clones
are rejected.

Run local contract tests:

```sh
npm run test:osv-revision-dependency
```

Selection and evaluation write new paths and refuse to overwrite an existing
fixture or report:

```sh
npm run select:osv-revision-dependency -- \
  --repo /path/to/advisory-database \
  --commit 8637d8ca65e3dbcc6a228e6f8bfb65df6559e675 \
  --count 24 \
  --receipt-dir reports/osv-revision-dependency-v1/receipts \
  --out .cdr/waves/osv-revision-dependency-v1/fixture.json

npm run eval:osv-revision-dependency -- \
  --fixture .cdr/waves/osv-revision-dependency-v1/fixture.json \
  --receipt-dir reports/osv-revision-dependency-v1/receipts \
  --out reports/osv-revision-dependency-v1/report.json
```

The stress set measures the frozen dependency contract. It does not determine
whether an advisory is true or estimate how common revisions are in OSV.
