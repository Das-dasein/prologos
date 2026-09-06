# Gamma CDR design — issue #62: Codex P0/P1 budget normalization

## Triggering evidence

The first human-operated v8 pair had equal 1024-byte slots but unequal native
Codex `input_tokens`: P0 `20207`, P1 `19564`.  P1 also reported `9984` cached
input tokens.  The v8 collector correctly stopped before a receipt.

Therefore `offline-utf8-byte-v1` is not a valid balance instrument for the
Codex provider.  It remains historical offline reproducibility evidence only.

## Non-negotiable requirements

A successor design must be preregistered, provider-native or explicitly
provider-independent, symmetric between P0/P1, resistant to cache/order
confounding, and unable to tune padding after observing the scored answer.
No condition may be silently dropped because it is inconvenient to normalize.

## Candidate designs (proposal, not implementation)

| Design | What it controls | Strength | Principal limitation |
|---|---|---|---|
| A. Provider tokenizer calibration | Equalize prompt tokens before live run using a pinned tokenizer/version | Directly targets token length | Codex CLI exposes reported usage, not a stable public tokenizer contract |
| B. Pre-registered calibration phase | Use separate, unscored calibration prompts to choose from a finite padding map before scored calls | Can use real provider measurement | Cache/state can change between calibration and scored calls; must isolate/re-randomize and keep map immutable |
| C. Fixed prompt plus token-count covariate | Preserve content, report provider token difference and analyze it as a confound | Honest and feasible | Not an equal-budget causal comparison; cannot support a pure proof-effect claim |
| D. Cross-over / randomized order with cache washout | Counterbalance P0/P1 ordering and run separate process/session blocks | Diagnoses order/cache effects | Does not itself equalize prompt-token lengths |
| E. Provider-independent byte experiment | Keep equal bytes and explicitly test a byte-normalized intervention | Fully reproducible offline | Measures byte-normalized prompt construction, not equal provider budget |

## Provisional recommendation

Do not claim an equal-budget Codex comparison from v8.  The smallest honest
next experiment is a preregistered **diagnostic** combining C and D: repeated
counterbalanced P0/P1 pairs, retaining `input_tokens`, cache counters and
prompt bytes, with no effectiveness threshold.  It estimates whether the
provider reports stable conditional budget differences and whether order/cache
dominates them.  Only if a stable provider-supported token calibration becomes
available should A or a strictly isolated B be promoted to a confirmatory
equal-budget design.

## Required future CDR beta questions

- Are native counters semantically stable across independently started Codex
  processes and counterbalanced condition order?
- Is any calibration map sealed before scored answers and independent of their
  contents?
- Are cache counters reported and analyzed rather than folded into `E`?
- Does the conclusion match the actual design: diagnostic association versus
  confirmatory proof-effect test?
