# Alpha repair report R3: empty write semantics

Independent beta found a contract mismatch: Gamma said a `write` could contain
zero assertions, while the validator rejected it. The contract now requires at
least one assertion for `write`; zero durable assertions are represented by
`ignore`. A focused negative test locks this rule. No extraction/model claim is
changed.
