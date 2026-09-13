# Audit script validation

The first partial inspection (76 completed behavioral calls, no aggregate)
incorrectly attempted to reconstruct final text from `response.completed.output`.
This backend's terminal metadata has `output: []`; actual completed output is
preserved in `response.output_item.done` and `response.output_text.done` SSE events.
The audit script was corrected to independently reconstruct both streamed
completion representations, require their equality, and compare them to retained
API/Hermes final text. The partial-76 “final response differs” entries were audit
parser false positives, not producer/model failures. Original partial evidence is
preserved. Final audit reruns the corrected parser over every completed call.
No model, gold, primary metric or prospective diagnostic endpoint was changed.
