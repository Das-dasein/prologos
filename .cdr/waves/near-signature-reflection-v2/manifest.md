# Near-signature reflection v2 — Alpha preregistration

Status: `ALPHA PREREGISTERED — NO v2 MODEL OUTPUT INSPECTED`.

V2 repeats the v1 diagnostic-reflection protocol on the same frozen 12-case
source split, after v1 was recorded as unscorable. In v1, an exact Codex
skills-context system notice was incorrectly classified as a trace failure;
each M0 result was then dropped and every review prompt contained `M0
unavailable`. No v1 M2 prompt received the advisory, so its outputs are not a
baseline or treatment observation and are not used in v2 scoring.

`fixture-v1.json`, `gold-v1.json`, the condition-order map, and the rubric are
byte-for-byte copies of their frozen v1 counterparts. This preserves the
source split while making the new execution identity explicit in
`protocol-v1.json`, whose v2 protocol hash is part of the raw provenance.
Fresh ephemeral model calls remain required: v1 M0 outputs are not imported.

The only runner change is trace classification. A call may contain exactly one
full-text pinned Codex notice about shortened skill descriptions; it is counted
as a system notice, not as a model tool action. Any other error item, malformed
event stream, non-single completed turn, or tool item remains a failure. The
fake sealed integration test executes all 36 calls with that notice and checks
the real M2 prompt delta.

The question, procedure, measures, falsifier, model, no-retry policy, and
Beta-before-Gamma requirement are otherwise those of v1. This is still a
read-only diagnostic experiment; it cannot support automatic predicate repair
or a claim about final A/B/C accuracy.
