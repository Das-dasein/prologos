# DataCite lineage intake v1

## Purpose

Replace manually invented lineage labels with a bounded connector that derives
them from explicit external metadata and retains the source record addressed by
content hash.

DataCite Metadata Schema 4.7 defines `relatedIdentifier`, requires its
`relationType`, and provides controlled relation values including
`IsVersionOf`, `IsNewVersionOf`, and `IsDerivedFrom`. W3C PROV separately models
derivation, quotation, revision, and primary-source relations. This connector
uses the narrower DataCite relation vocabulary and does not import either
project's code.

Primary references:

- https://datacite-metadata-schema.readthedocs.io/en/4.7/properties/relatedidentifier/
- https://support.datacite.org/docs/api-get-doi
- https://www.w3.org/TR/prov-o/

## Frozen live intake

On 2026-09-13 the connector fetched two public DataCite records and their
explicit ancestor chain:

- requested `10.14454/qdd3-ps68`: 13 records, all resolving through recorded
  version relations to `10.5438/0001`;
- requested `10.5061/dryad.qjq2bvqhq`: one record with itself as the root.

The 14 exact JSON responses are stored in `raw/` using their SHA-256 as the
filename. The two descriptors retain retrieval time, requested DOI, normalized
group and lineage IDs, and relative receipt paths.

## End-to-end replay

A neutral `carrier(orion)` assertion is admitted from two selected records. The
same real metadata then passes through source-event binding, the append-only
journal, checker support enrichment, and action policy:

- two DataCite schema versions: v2 `act`, v3 `pause`;
- one schema version plus the Dryad record: v2 `act`, v3 `act`.

The carrier assertion exists only to exercise plumbing. No claim about either
DOI's subject matter is extracted or evaluated.

## Limits

The connector trusts the DataCite HTTPS response as the metadata it observed.
It cannot establish that the metadata is true or complete, discover an omitted
derivation, or infer source quality. Multiple direct ancestors, cycles,
non-DOI ancestor identifiers, and chains beyond 16 edges fail closed.
