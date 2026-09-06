# P2 repair supplement

The r3 raw run has valid P0/P1 records (24 each) under the pinned fixture,
config and `gpt-5.4-mini`; only its P2 collector lifecycle grouping was faulty.
After CDD β R7 approval of `da4807f`, a fresh CDR α revalidates the immutable
24 r3 P2 raw traces with the repaired lifecycle parser and emits a separate
derived revalidation artifact with source hashes. It makes no provider call and
does not alter raw evidence. This is a parser repair supplement, not a
replacement or reinterpretation of r3 P0/P1. Fresh CDR β must audit the raw
root and derived artifact before an integrated receipt.
