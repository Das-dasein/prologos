# V3 qualification result: no treatment cases

The local ignored V3 raw directory contains 12 M0 calls and no M1 or M2
calls. All M0 receipts completed successfully. Eleven enhanced Prolog
certificates completed with an explicitly empty `near_signature_audit`; one
enhanced certificate failed, and it was likewise ineligible.

Thus the qualification rule worked: `near_signature_audit_has_pairs/2` found
zero eligible candidates, and 24 review calls were not spent. V3 cannot test
the M1/M2 diagnostic-reflection question because it has zero treatment cases.
It is evidence that this historical 12-case error-probe split does not yield
near-name candidates under the strict reified M0 contract, not evidence for or
against the diagnostic's effect.

`build-near-signature-v3-dashboard.js` renders a local full dashboard from the
ignored raw directory, including every M0 prompt, JSON answer, and Prolog
certificate. A future paired experiment needs a split selected for actual
near-name candidate coverage before any M1/M2 calls are authorized.
