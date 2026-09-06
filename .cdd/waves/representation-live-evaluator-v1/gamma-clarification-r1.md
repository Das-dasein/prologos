# γ clarification R1: verified bytes are the sole collection authority

β reproduced a seal-integrity failure in the public `collectLive` seam: an
object different from the object serialized in its hash-verified `bytes` could
be used to collect prompts/config while the aggregate recorded the old hash.

## Binding repair

1. `collectLive` must parse fixture and config solely from their verified bytes
   before validation, planning, or provider construction. A preloaded object is
   convenience metadata only and may not be authoritative.
2. If object inputs remain supported, compare them against the canonical parsed
   object and reject a mismatch before the live gate/provider factory.
3. Add adversarial tests for a mutated in-memory fixture with original
   bytes/hash and for a mutated in-memory config with original bytes/hash;
   both must reject with zero provider construction/calls.

## Scope

This repairs only the local evaluator and its focused tests. It preserves the
fixture, generated semantics, P0/P1 no-tool baseline, 48-call design, and
raw-artifact contract. No live provider call or CDR result is authorized.
