# ProverQA hard 241: complete labelled trace probe

Status: one observed diagnostic, not scored.  The model received only English
context and question, then emitted 35 labelled declarations `axiom(s1, ...)`
through `axiom(s35, ...)` and queried:

```prolog
audit_trace(creative(michelle), Result)
```

The isolated runtime returned:

```text
no_forward_trace(no_supported_rule_path)
```

This is useful evidence, not a success claim.  The model did retain the
relevant English rule as `s23`:

```prolog
axiom(s23, rule([creative(michelle)],
  xor(inspires_children(michelle), brings_joy_to_adults(michelle)))).
```

But it is a rule *out of* `creative`, not a fact or rule deriving `creative`.
The benchmark's false conclusion needs non-Horn classical reasoning through
XOR and contraposition.  The deliberately limited human trace engine refuses
to fake that as a forward path.  It makes the gap explicit: the full source
formalization can now be inspected by `s` id, while the next executor feature
must be a separately traceable XOR/contraposition or countermodel branch.
