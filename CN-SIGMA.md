# cn-sigma activation — v1.0.1

Changelog:

- v1.0.1 — made the project and research boundaries explicit after the
  initial activation draft.
- v1.0.0 — initial project-local hub attachment.

This repository attaches the public `usurobor/cn-sigma` hub as the Git
submodule `.cn-sigma`, pinned to commit
`42a77f223cc8f3c9b5f24ba6e5a98af2b40a4f60`.

The hub supplies the Sigma persona, operator contract, and durable
Git-backed context. It is not a runtime library and it does not make a CDR
claim true. The project code, data policy, and CDR materials remain owned by
this repository.

## Activation boundary

- **Identity hub:** `.cn-sigma/`.
- **Project body:** this repository.
- **Research protocol:** `.cdr/`; its policy and role separation govern
  research claims.
- **Current experiment:**
  `.cdr/waves/semantic-branch-dream-v0/`.

The activation is project-local: it neither edits upstream Sigma state nor
creates a new remote ref. To obtain the same pinned hub in a fresh checkout:

```sh
git submodule update --init --recursive
```

## CLP check

- **Pattern:** one pinned identity hub and one project-local CDR wave.
- **Relation:** the hub informs working discipline; project CDR policy keeps
  authority over evidence and research claims.
- **Exit:** remove the submodule and this pointer in one ordinary Git change;
  no project data is stored in the upstream hub.
