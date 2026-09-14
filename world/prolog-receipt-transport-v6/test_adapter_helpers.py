"""Offline regression checks for deterministic compact receipt projection."""
import json
from adapter import compact_receipt

raw = json.dumps({
    "status": "ok",
    "query": "goal(a)",
    "raw_status": "conflict",
    "raw_support_sets": [
        {"literal": "internal(a)", "item_ids": ["i9"]},
        {"literal": "goal(a)", "item_ids": ["i2", "i1"]},
        {"literal": "neg(goal(a))", "item_ids": ["i4", "i3"]},
        {"literal": "goal(a)", "item_ids": ["i0"]},
    ],
})
actual = json.loads(compact_receipt(raw, "goal(a)"))
assert actual == {
    "receipt_schema": "target-support-v1",
    "query": "goal(a)",
    "status": "conflict",
    "positive_support_sets": [["i0"], ["i1", "i2"]],
    "negative_support_sets": [["i3", "i4"]],
}
assert compact_receipt(raw, "goal(a)") == compact_receipt(raw, "goal(a)")
print("compact receipt projection ok")
