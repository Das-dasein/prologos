# Collector measurement repair v2.0.1

The first live command on 2026-09-13 stopped before runtime configuration and
before any provider dispatch because the fresh report directory's parent did
not exist. No report or call directory was created and provider calls equal
zero.

The repair adds recursive creation of only the output parent before exclusive
creation of the fresh run directory. It does not change the fixture, prompts,
oracle, plan, model configuration, scoring, or retry policy. The collector test
now uses a missing nested parent and still executes and verifies all 72 fake
slots. The original collector source remains frozen as
`collector-v2.source.cjs`; the repaired source is frozen separately before the
first provider dispatch.
