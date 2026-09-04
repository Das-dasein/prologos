# Alpha report: legacy polarity projection v1

**Related issue:** #14

## Delivered

- The legacy extractor prompt now describes the Prolog assertion journal,
  separate qualifiers, predicate meanings, mandatory arities, and the bounded
  canonical-polarity rule for `likes/2`.
- `dislikes` was removed from the legacy relation allowlist.
- `RELATION_SIGNATURES` is shared by prompt generation and `MemoryStore`, so
  wrong-arity proposals are rejected before durable serialization.
- A fake-provider pizza fixture produces positive and negative
  `likes(user,pizza)` proposals; the actual `MemoryStore` path reports one
  direct conflict and chooses no winner.

## Evidence

```text
npm test                      PASS
npm run test:cdr-annotation   PASS
npm run test:cdr-gold         PASS, existing B5 12/12
git diff --check              PASS
```

## Boundary

This proves contract and serializer behavior under a deterministic fixture. It
does not establish how a live model handles Russian phrasing, arbitrary
antonyms, dialogue context, or user utility. The CDR pizza oracle remains the
separate measurement boundary.
