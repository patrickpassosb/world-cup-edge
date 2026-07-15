# Claims Guide

What we can and cannot say about this product. Every agent working on this repo must follow these rules.

## What this product does

- Compares TxLINE's StablePrice consensus probability against Polymarket's live top-of-book quote
- Calculates the gap between the two, adjusted for venue fees
- Emits deterministic alerts when the fee-adjusted gap exceeds a threshold
- Shows source freshness and contract verification status
- Displays session alert history

## What we CAN say

- "Read-only consensus-gap monitor for prediction-market traders"
- "Compares TxLINE's consensus probability against Polymarket's top-of-book quote"
- "TxLINE data is cryptographically anchored on Solana for provenance verification"
- "Every alert includes source timestamps and contract verification"
- "Deterministic calculation, no AI in the loop"
- "Analysis tool, not a trading bot"
- "Top-of-book quote" (not "executable price")

## What we CANNOT say

- "Arbitrage" — the gap is not guaranteed riskless profit
- "Guaranteed profit" — the gap may close, widen, or never resolve
- "Verified signal" — the proof verifies data provenance, not signal correctness
- "Cryptographic truth" — TxLINE is a consensus benchmark, not ground truth
- "Provably correct" — the calculation is deterministic, but the inputs are estimates
- "Executable price" — Polymarket geoblocks Brazil for order placement
- "AI agent" — there is no LLM in the loop
- "Verified intelligence" — the intelligence is deterministic, not AI-generated
- "Trustless settlement" — this product does not settle anything
- "Oracle replacement" — this is a monitoring tool, not an oracle
- "Not gambling" — make no legal classification claims; describe it as "read-only research tool"

## Proof and verification language

### What the Merkle proof proves

- TxODDS published a specific data record
- That record is included under an on-chain Merkle root
- The data has not been tampered with since publication

### What the Merkle proof does NOT prove

- The real-world match data is infallible
- StablePrice is the true or fair probability
- The signal or alert is correct
- The alert will be profitable
- The data is real (it proves provenance, not truth)

### `.view()` simulation

- `validateStat().view()` is a read-only simulation
- It produces no transaction signature
- Do not promise a Solana explorer link unless a real transaction is submitted
- It costs no gas

### Roots and timing

- Merkle roots are published in 5-minute batches
- A current live update may not be immediately provable
- Do not badge live data as "verified on-chain" until the root containing it is published

## Score validation vs odds validation

- Score validation proves match statistics (goals, cards, etc.)
- Odds validation proves the published odds record
- The gap engine uses odds, not scores
- Score validation is a separate provenance feature, not a verification of the gap calculation
- The `Pct` field in `OddsPayload` may not be directly validatable from the `Prices` field in the on-chain `Odds` structure
- Do not badge a probability as "verified" unless it is deterministically recomputed from validated raw prices using a confirmed TxLINE method

## Polymarket access from Brazil

- Polymarket geoblocks Brazil for order placement
- Read-only market data (Gamma API, CLOB book) works from Brazil
- The displayed quote is a "top-of-book quote," not an "executable price"
- Do not claim the user can trade on the displayed price
- Do not claim the product is "not gambling" — make no legal classification

## TxLINE StablePrice

- StablePrice is a demargined consensus from aggregated sharp-book odds
- It is a benchmark, not a prediction
- It is not "fair value" in an absolute sense
- It is not ground truth
- It is one estimate of probability, derived from betting market efficiency

## For the hackathon submission

Describe the product as:

> "World Cup Edge is a read-only consensus-gap monitor that compares TxLINE's cryptographically anchored sports data against Polymarket's live prediction market quotes. It identifies moments where the consensus probability and market price diverge, adjusted for fees, with full source provenance and contract verification. No trading. No AI. Deterministic analysis."

Do NOT describe it as:

> ~~"An AI agent that finds mispriced prediction markets with cryptographic proof"~~
> ~~"Verified trading signals on Solana"~~
> ~~"Trustless arbitrage detection"~~
