# Gamma repair R2: bind the evidence-slot registration immutably

Issue: #29  
Input: fresh beta `34f110845fbd9797d63bb7a3e52c64cfda39159c`  
State: `REVISE`; CDS #28 remains blocked.

## Finding accepted

The validator accepts a dataset where a declared 1024-byte slot is changed to
1025 bytes together with matching assembled output. Thus equal-length assembly
works mechanically but the pre-registration has no immutable slot-map binding.
An operator could choose a larger proof capacity after seeing a result.

## Repair

Define a canonical slot-registration object containing exactly every
`case_id -> slot_bytes` mapping and its protocol version. Record its SHA-256
in the method, manifest and a dedicated immutable registration file. The
validator must derive the canonical map from dataset content and refuse unless
all three recorded hash bindings match. It must emit the slot-registration hash
in its result artifact.

Negative fixtures must prove rejection of:

1. one changed slot byte with stale registration hash;
2. matching dataset/assembled mutation with unchanged registration artifact;
3. changed registration file/hash after the manifest binding;
4. missing or extra case mapping.

No provider/model call, token claim, live artifact, receipt, threshold/claim
change or CDS #28 implementation is authorized. A fresh CDR beta must
recompute every binding before #28 can proceed.
