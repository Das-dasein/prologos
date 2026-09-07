# ProverQA hard 146: labelled symbolic status

Status: one observed diagnostic, not scored.  The model saw only the English
world and question.  It emitted a complete `domain/2`, labelled `s1`--`s19`
program, and queried:

```prolog
labelled_semantic_status(
  and(possesses_cognitive_skills(madeleine),
      uses_language_to_communicate(madeleine)), Status, Certificate)
```

The first execution exposed an interface mismatch: the model naturally wrote
`axiom(s1, xor(...))`, whereas the initial compiler required `fact(xor(...))`.
The compiler now accepts a bare well-formed formula as an axiom fact, without
changing its semantics.  Replaying the identical model program (no second
model call) returned `unknown` with an explicit true/false model pair.

The hidden dataset answer, inspected only after execution, is `C` (`Uncertain`).
Thus this one case agrees with gold.  It is a diagnostic observation, not an
accuracy claim; its useful artifact is the retained source labels and model
witnesses for audit.
