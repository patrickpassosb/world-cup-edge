# Specification - World Cup Edge

## Problem

Prediction-market traders lack timely, trustworthy tools for finding price discrepancies between sports data consensus estimates and live market quotes. Existing tools are either trust-based ("trust our AI") or pure execution bots with no provenance verification.

## Solution

A read-only dashboard that compares TxLINE's StablePrice consensus probability against Polymarket's live top-of-book quote for the same regulation-time outcome. When the gap exceeds a threshold after fees, it emits a deterministic alert with full source provenance.

## First version scope (July 15 live test)

- One match: England vs Argentina, July 15, 2026, 19:00 UTC
- One outcome: England wins in regulation time
- One Polymarket market: `fifwc-eng-arg-2026-07-15-eng`
- TxLINE fixture ID: `18241006`
- Read-only. No trading, no wallet, no LLM.

## Data sources

### TxLINE

- StablePrice odds: demargined consensus probability from aggregated sharp-book odds
- Anchored on Solana via Merkle proofs (provenance only, not signal correctness)
- Mainnet service level 12 (real-time) or level 1 (60-second delay)
- Auth: guest JWT + on-chain subscription + API token activation

### Polymarket

- Gamma API: market discovery, event/market metadata, outcome/token pairing
- CLOB API: order book, best bid/ask, fee configuration
- Read-only access. No order placement.
- Polymarket geoblocks Brazil for order placement. Display "top-of-book quote," not "executable price."

## Core calculation

```
grossGap = txlineProbability - polymarketBestAsk
feePerShare = dynamicFeeRate * bestAsk * (1 - bestAsk)
gapAfterFee = grossGap - feePerShare
```

An alert fires only when ALL conditions pass:

1. TxLINE row is confirmed as regulation-time 1X2
2. Polymarket contract is England regulation-time YES
3. Both sources are fresh (within configurable age thresholds)
4. Cross-source timestamp skew is acceptable
5. Polymarket market is active, open, accepting orders, non-empty book
6. `gapAfterFee` exceeds threshold (initial: 5 percentage points)
7. Condition holds for 2 consecutive samples
8. Not within cooldown period

Every invalid, stale, unknown, suspended, reset, or mismatched state suppresses alerts.

## Labels

| Display label | Meaning | Technical source |
|---|---|---|
| TxLINE Consensus Probability | Demargined estimate from StablePrice | `Pct` field, converted from percentage string to 0-1 |
| Polymarket YES Best Ask | Lowest current ask price | CLOB `/book` endpoint, minimum ask price |
| Gross Consensus Gap | TxLINE probability minus best ask | `txlineProbability - bestAsk` |
| Gap After Fee | Gap minus venue fee | `grossGap - feePerShare` |
| Source Freshness | Age of each data source | Per-source timestamp vs receive time |
| Input Verification | Contract equivalence checks | Runtime validation of teams, date, rules, market state |
| Session Alert History | Alerts from this browser session | Browser state, not server-persisted |

## States

| State | Trigger | Display |
|---|---|---|
| Loading | Initial fetch in progress | Skeleton layout |
| Live | Both sources fresh, market open | Normal display |
| Stale | Source data older than threshold | Last good values, clearly marked stale |
| No Alert | Gap below threshold | Calm display, no alert styling |
| Alert | Gap exceeds threshold after fee | Prominent but not alarming |
| Unavailable | Source disconnected or market closed | "Unavailable" with reason |
| Error | Fetch failure | Error message with retry action |

## Success criteria for July 15

- Dashboard runs through the match without false alerts from stale or mismatched data
- Every displayed comparison uses equivalent contracts (regulation-time 1X2 vs regulation-time YES)
- At least one trader watches or reviews it
- Feedback identifies a concrete next feature or rejects the premise
- The run produces evidence for the hackathon demo even if no real gap appears
- "No alert" is a valid result if the market is efficient

## What is explicitly out of scope

- TxLINE score stream and score-stat validation (after the live run)
- Odds proof validation (after the live run)
- SSE streaming (unless polling proves insufficient)
- Public deployment (local only for the live test)
- Multiple teams, outcomes, or match picker
- SELL/NO-side signals
- LLM, AI agent, or reasoning panel
- Wallet connection, trading, billing, database, user accounts
- shadcn design-system work beyond basic readable CSS (unless Stitch provides the design)

## Future phases (after live test, not before)

1. Odds-record validation using TxLINE's odds validation path
2. Score-stat validation as a separately labeled provenance feature
3. Clearly labeled synthetic/replay mode for hackathon demo
4. Telegram alerts (if traders ask for notifications)
5. LLM to explain deterministic alerts (never to invent them)
6. Expansion to more outcomes and matches
7. Public deployment with server-side credentials

## Business model (future, not hackathon scope)

Freemium SaaS:
- Free: delayed dashboard, limited alerts
- Pro (~$29-49/month): real-time monitoring, custom thresholds, more markets, notifications
- API/team (~$199/month): webhooks, historical data, integrations

Billing is not part of the hackathon MVP.
