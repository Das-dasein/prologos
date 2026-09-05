# Gamma closeout: equal-budget contract repair

Issue: #29  
Alpha repair: `59a3aedfa57185c1f41b395d5e610f371955e681`  
Fresh CDR beta: `db5d8c01c5328ee7288946d07f28b0a927865da7`

## Decision

**GO — offline method repair only.** The fixed evidence-slot registration has
a canonical map and SHA-256 bound in the registration, method and manifest.
Fresh beta independently reproduced all positive and post-hoc mutation
failures. CDS #28 is now allowed to implement a no-live preflight/harness.

This does not establish provider-token equality, model-answer quality,
effectiveness, PAM-C1 or any transmissible CDR claim. The offline UTF-8 byte
accounting abstraction remains deliberately distinct from later provider/model
measurement.
