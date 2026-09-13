# Hermes memory-conditioned choice v0

Two fresh Hermes CLI sessions received the same current release question and
the same two available actions. The prompt did not require a memory query and
did not state a choice policy.

- H1 recalled the old rule requiring backup readiness, autonomously called
  `world_memory_query`, received `unknown` with missing
  `backup_ready(orion)`, and returned `ASK backup_ready`.
- H2 recalled the old independent-route rule, autonomously called the same
  tool, received a safe proof of `release(orion)`, and returned `ACT release`.

The durable query receipts in `report.json` contain the snapshot hash, complete
solver result, missing-premise plan or proof, item identities, source event
identities, interpreter hash, and checker input hash. The Hermes provider
configuration was restored byte-for-byte after both runs.

This establishes one concrete memory-to-next-choice path through the installed
Hermes runtime. It remains a synthetic two-action experiment. It does not
establish a general psyche, spontaneous goal formation, or an advantage for
dreaming; no dream was used in this run.
