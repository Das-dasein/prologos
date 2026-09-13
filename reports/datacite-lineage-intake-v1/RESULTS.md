# DataCite lineage intake v1 results

The first external-metadata lineage path is operational. A live DataCite API
intake on 2026-09-13 retained 14 content-addressed JSON receipts:

| Requested DOI | Records | Recorded root |
| --- | ---: | --- |
| `10.14454/qdd3-ps68` | 13 | `datacite:doi:10.5438/0001` |
| `10.5061/dryad.qjq2bvqhq` | 1 | `datacite:doi:10.5061/dryad.qjq2bvqhq` |

The frozen end-to-end replay produced the expected four cells:

| Recorded source pair | v2 host-attested groups | v3 distinct lineages |
| --- | --- | --- |
| two schema-document versions, one root | `act` | `pause` |
| schema document and Dryad dataset, two roots | `act` | `act` |

This closes one implementation gap: lineage can now come from retained external
metadata rather than a test helper or manually typed label. It does not establish
the truth or completeness of DataCite metadata. The assertion passed through
Prolog was a neutral synthetic carrier, so this run does not measure extraction,
semantic fidelity, model behavior, source reliability, or task utility.

The adapter follows an explicit allowlist, rejects ambiguous parents and cycles,
limits records to 2 MiB and traversal to 16 edges, and writes raw receipts before
producing the descriptor. DataCite's documentation defines the relation field
and controlled values, while W3C PROV supplies the broader derivation model:

- https://datacite-metadata-schema.readthedocs.io/en/4.7/properties/relatedidentifier/
- https://support.datacite.org/docs/api-get-doi
- https://www.w3.org/TR/prov-o/

Verify the frozen evidence with:

```sh
npm run test:datacite-lineage
```
