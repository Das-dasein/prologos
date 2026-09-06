# γ clarification r1: real MemConflict source boundary

Date: 2026-09-06. This clarification supersedes only the claim that the
schema-shaped adapter proves compatibility with the real MemConflict release.

## Observed source facts

The locally pinned `Data/Step4_4.jsonl` at upstream revision
`ec51d5d36e87f7665d1337f3a88cbde95fc2a964` has SHA-256
`8ef9ec8589eccb86f63ab3a819a9180217405351a8d5846866721ea74babe092`.
It contains 30 top-level persona records, 1,579 sessions and 3,750 nested
`Session_Questions`.

The actual schema uses `ID`, `Fixed_Profile`, `Dynamic_Profile`,
`Preference_Profile`, `Full_Session_Chain`, and nested session records with
`Session_ID`, `Date`, `Revealed_Attributes`, conflict metadata,
`Session_Dialogue`, and question fields
`question_id/question/answer/conflict_type/ability_target/difficulty`.

It is not the provisional `record_id/profile/timeline/claims` schema used by
`519a5a7`'s local authored test fixture. That code and its β GO establish only
provider-free behavior for the authored fixture; they do not establish source
compatibility and cannot authorize collection.

## Revised CDD sequence

1. A fresh α replaces the provisional source parser with an exact,
   fail-closed real-schema intake index. It binds persona/session/question
   identity, source SHA, dates, conflict metadata and verbatim source-turn
   coordinates, but does not pretend that arbitrary natural-language values
   are already Prolog atoms.
2. γ selects a fixed local 24-question slice from that index before model
   output. Each selection row includes persona ID, session ID, question ID,
   conflict type and source hash.
3. A separate checked-in mapping contract formalizes only those selected cases:
   assertion fields, supersession, static-conflict authority, conditional rule,
   expected answer and proof basis. Every mapping must point back to actual
   source turns and be independently executable in SWI-Prolog.
4. Fresh β audits the real intake/index and the formal mapping before any live
   B1–B5 collection.

The raw source remains local evidence. No claim about Prolog, memory utility,
or source compatibility may use the earlier schema-shaped fixture alone.
