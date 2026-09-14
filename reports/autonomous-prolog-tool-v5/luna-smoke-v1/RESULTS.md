# Autonomous Prolog tool v5: terminal two-case smoke

Verified terminal smoke; report SHA-256:
`635117b870c7dd7a5f074b0d856188ceca55db9ed637a8ddd94d8434a3ef908d`.
All six cells are runtime-valid. This smoke validates the v5 harness and is not
the planned 16-case result.

| Condition | Tool selected | Valid primary receipt | Status correct | Support membership correct | Canonical exact |
| --- | ---: | ---: | ---: | ---: | ---: |
| N | 0/2 | 0/2 | 2/2 | 1/2 | 1/2 |
| A | 1/2 | 1/2 | 2/2 | 1/2 | 0/2 |
| G | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 |

In A, the model skipped the tool on the entailed case and emitted the observed
two-call `q` plus `neg(q)` strategy on the conflict case. Both calls executed;
the primary receipt was correct. The final conflict answer had correct status
and support membership but noncanonical ID order. Thus v5 successfully turns
the v4 protocol violation into measurable autonomous behavior.

In G, both primary queries and receipts were correct. One answer preserved
support membership but not canonical ordering; the other corrupted the
negative support output after receiving a correct receipt. These are downstream
receipt-use/serialization errors, not checker failures.

The sample is too small for an effect claim. Proceed to the frozen 16-case wave.
