# World Cup Edge

> World Cup Edge is a read-only consensus-gap monitor that compares TxLINE's cryptographically anchored sports data against Polymarket's live prediction market quotes. It identifies moments where the consensus probability and market price diverge, adjusted for fees, with full source provenance and contract verification. No trading. No AI. Deterministic analysis.

Compares TxLINE's cryptographically anchored sports data probability against Polymarket's live top-of-book quote for the same outcome. Emits deterministic alerts when a meaningful gap exists. No trading execution. No wallet connection for trading. No profit claims.

## Live demo

- **Deploy**: https://world-cup-edge.fly.dev/
- **Replay mode (deterministic alert)**: https://world-cup-edge.fly.dev/?demo=replay
- **On-chain activation page**: https://world-cup-edge.fly.dev/activate
- **Demo video**: see `SUBMISSION.md` for the recording script and link

The deploy boots into mock mode when no TxLINE credentials are configured, so judges can see the dashboard immediately. Append `?demo=replay` to see the deterministic alert-firing state.

## Quickstart

```bash
cp .env.example .env.local
# Fill in TXLINE_JWT and TXLINE_API_TOKEN after activation
npm install
npm run dev
```

### Environment variables

| Variable | Purpose |
|---|---|
| `TXLINE_JWT` | Guest JWT from `POST /auth/guest/start` |
| `TXLINE_API_TOKEN` | Activated token from `POST /api/token/activate` |
| `TXLINE_NETWORK` | `mainnet` or `devnet` |
| `DATA_SOURCE` | Set to `real` for live TxLINE+Polymarket; unset for mock mode |
| `MOCK_SCENARIO` | Mock scenario when `DATA_SOURCE` unset: `live`, `alert`, `stale`, `unavailable`, `error`, `loading` |
| `GOOGLE_STITCH_API_KEY` | Optional — design generation only |
| `NEXT_PUBLIC_HELIUS_API_KEY` | Optional — Solana RPC for activation flow |

## Match picker and outcomes

The dashboard auto-discovers live World Cup fixtures from TxLINE and the matching Polymarket markets. Pick a match from the dropdown, then pick an outcome (home / draw / away). The gap engine re-runs against the selected outcome on every poll.

## TxLINE activation

Run `npm run txline:activate` (CLI) or visit `/activate` in the browser after `npm run dev`.

Requires a mainnet Solana wallet with a small SOL balance for the on-chain subscription transaction. The activation flow:
1. Connects your wallet (Phantom or Solflare)
2. Submits a `subscribe(12, 4)` transaction to the Txoracle program (service level 12 = real-time, 4 weeks)
3. Signs the activation message
4. Returns a JWT and API token to copy into `.env.local`

## Architecture

```
TxLINE odds snapshot -> normalize probability -> \
                                                    -> contract checks -> gap engine -> server route -> dashboard
Polymarket Gamma API -> verify event/market   -> /
Polymarket CLOB book -> calculate best bid/ask -> /
```

## Project structure

```
lib/
  config.ts                 # Thresholds, default fixture ID, match identity
  types.ts                  # Shared Snapshot, VerificationChecks, Outcome types
  txline/
    client.ts                # Auth, fixtures, odds snapshot
    types.ts                 # Fixture, OddsPayload types
    normalize.ts             # Pct -> probability, label mapping
  polymarket/
    client.ts                # Gamma API, CLOB book, fee fetch
    types.ts                 # Market, Book types
    normalize.ts             # Outcome/token pairing, best bid/ask
  gap/
    engine.ts                # Gross gap, fee-adjusted gap, alert logic
    types.ts                 # Signal, Alert types
  contract/
    equivalence.ts           # Runtime checks that both sides are the same outcome
    regulation.ts            # Shared regulation-time 1X2 predicate
  data/
    index.ts                 # Provider factory + cache
    real-provider.ts         # RealDataProvider (TxLINE + Polymarket)
    mock-provider.ts         # MockDataProvider for local dev / 6 scenarios
    replay.ts                # Deterministic replay scenario for ?demo=replay
  ui/
    check-state.ts           # Check state derivation for the UI
app/
  api/
    snapshot/route.ts        # Server route returning normalized JSON
    matches/route.ts         # Server route listing fixtures + Polymarket slugs
    health/route.ts          # Liveness check
  activate/                  # On-chain TxLINE activation page
  page.tsx                   # Dashboard
  layout.tsx
  globals.css
design/
  stitch-brief.md            # Prompt sent to Google Stitch
DESIGN.md                    # Approved visual system
docs/                        # API references, safety rules, claims guide
tests/                       # Vitest suite (13 files, 330 tests)
Dockerfile, fly.toml         # Fly.io deploy artifacts
SUBMISSION.md                # Hackathon submission materials
```

## Labels

| Field | Meaning |
|---|---|
| TxLINE Consensus Probability | Demargined estimate from TxLINE StablePrice |
| Polymarket YES Best Ask | Lowest current ask price for the selected YES token |
| Gross Consensus Gap | TxLINE probability minus Polymarket best ask |
| Gap After Fee | Gap minus venue fee, before slippage |

## Constraints

- Read-only. No trade execution, custody, or order placement.
- Analysis tool, not an AI agent.
- Consensus gap, not arbitrage or guaranteed profit.
- TxLINE is a consensus benchmark, not cryptographic truth.
- Proof verifies data provenance, not signal correctness.

## Testing

```bash
npm run test         # 330 tests across 13 files
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # next build (standalone output for Docker)
```