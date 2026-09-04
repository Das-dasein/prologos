# Gamma specification: legacy polarity projection v1

For the legacy ingestion relation `likes/2` only:

```text
like/love            -> likes(Person, Thing), positive
dislike/hate/cannot stand/do not like -> likes(Person, Thing), negative
```

`dislikes/2` is not an admissible legacy extraction relation. This is a narrow
serialization rule, not a general natural-language antonym ontology. The LLM
proposes structured data; Zod and `MemoryStore` remain the durable-write gate.

The prompt names the Prolog assertion representation and every currently
admissible legacy predicate with its arity and argument order. The serializer
enforces the same signature table, so a schema-valid but wrong-arity proposal
cannot enter durable memory.

Acceptance requires a deterministic fake-provider pizza case to produce two
opposite-polarity `likes(user,pizza)` proposals and an observable direct
conflict. Neither the prompt nor the test demonstrates live-model semantic
reliability.
