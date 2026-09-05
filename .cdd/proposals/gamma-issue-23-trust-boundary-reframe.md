# Gamma reframe: full Prolog thought is not proof authority

Date: 2026-09-06 (Europe/Samara)  
Role: gamma  
Input: beta review `98186a153c0a692ebee1aaf925d99040a54dfe6b` of alpha target
`8950899570c6f7d8af2681a0a020d9dd03251d12`.

## Decisive finding

The candidate can use full-Prolog `initialization/1` to print forged JSON and
`halt/0` before the runner finishes. Any protocol inside the same unrestricted
Prolog process is candidate-controlled. Banning directives/output/halt would
contradict the selected full-Prolog thought language, so another sandbox tweak
cannot make that output a trustworthy proof.

## Architecture correction

Split the runtime into two planes:

```text
full Prolog thought process -> untrusted transcript + candidate identity
accepted immutable snapshot -> trusted query process -> proof/missing-goal
```

The thought process remains isolated, full-language and non-authoritative. Its
transcript can inform an LLM or human but is labelled untrusted. It cannot
admit itself or supply a proof.

The trusted query process receives an accepted snapshot and query only; it
never consults candidate source. It owns the proof protocol. Thus the agent
still gets a Prolog derivation, but that derivation is about accepted memory,
not a claim made by arbitrary self-modifying code.

## Fresh alpha dispatch

```text
Role: fresh CDD alpha reframe repair for issue #23 on cycle/23.
Read the updated binding design/scaffold, all beta findings and this artifact.
Replace the shared candidate/runner result channel with distinct thought and
trusted-query paths. Preserve full candidate Prolog but label its output
untrusted; prevent it from being parsed as proof. Make trusted proof execution
load only accepted snapshot material and retain multi-hop proof/unknown,
revision/conflict and lifecycle tests. Add the forged initialization JSON/halt
probe and prove it cannot forge the trusted query result. Keep capability
boundary tests; no grammar allowlist, provider/live/CDR action, merge/close or
automatic admission. Update self-coherence, run tests, commit/push alpha-only.
```
