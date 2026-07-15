# World Cup Edge

Read-only consensus-gap monitor for prediction-market traders.

Compares TxLINE's cryptographically anchored sports data probability against Polymarket's live top-of-book quote for the same outcome. Emits deterministic alerts when a meaningful gap exists. No trading execution. No wallet connection. No profit claims.

## Quickstart

```bash
cp .env.example .env.local
# Fill in TXLINE_JWT and TXLINE_API_TOKEN after activation
npm install
npm run dev
```

## TxLINE activation

See `docs/txline-activation.md` for the full mainnet service-level-12 activation flow.

## Architecture

```
TxLINE odds snapshot -> normalize probability -> \
                                                   -> contract checks -> gap engine -> server route -> dashboard
Polymarket Gamma API -> verify event/market   -> /
Polymarket CLOB book -> calculate best bid/ask -> /
```

## Project structure

```
src/
  lib/
    txline/
      client.ts        # Auth, fixtures, odds snapshot
      types.ts         # Fixture, OddsPayload types
      normalize.ts     # Pct -> probability, label mapping
    polymarket/
      client.ts        # Gamma API, CLOB book, fee fetch
      types.ts         # Market, Book types
      normalize.ts     # Outcome/token pairing, best bid/ask
    gap/
      engine.ts        # Gross gap, fee-adjusted gap, alert logic
      types.ts         # Signal, Alert types
    contract/
      equivalence.ts   # Runtime checks that both sides are the same outcome
  app/
    api/
      snapshot/
        route.ts       # Server route returning normalized JSON
    page.tsx           # Dashboard
    layout.tsx
  config.ts            # Fixture ID, market slug, thresholds
design/
  stitch-brief.md      # Prompt sent to Google Stitch
DESIGN.md              # Approved visual system
```

## Labels

| Field | Meaning |
|---|---|
| TxLINE Consensus Probability | Demargined estimate from TxLINE StablePrice |
| Polymarket YES Best Ask | Lowest current ask price for England YES |
| Gross Consensus Gap | TxLINE probability minus Polymarket best ask |
| Gap After Fee | Gap minus venue fee, before slippage |

## Constraints

- Read-only. No trade execution, custody, or order placement.
- Analysis tool, not an AI agent.
- Consensus gap, not arbitrage or guaranteed profit.
- TxLINE is a consensus benchmark, not cryptographic truth.
- Proof verifies data provenance, not signal correctness.
