# AGENTS.md - World Cup Edge

This file grounds AI agents (Claude Code, OpenCode, Cursor, etc.) in the project's purpose, constraints, and conventions. Read this first.

## What this project is

World Cup Edge is a read-only consensus-gap monitor for prediction-market traders. It compares TxLINE's cryptographically anchored sports data probability against Polymarket's live top-of-book quote for the same outcome and emits deterministic alerts when a meaningful gap exists.

## What this project is NOT

- Not an AI agent. No LLM in the loop. Deterministic calculations only.
- Not a trading bot. No order placement, no custody, no wallet connection.
- Not a gambling product. No bet recommendations, no profit promises.
- Not a settlement oracle. No claim of cryptographic truth.
- Not "verified intelligence." The proof verifies data provenance, not signal correctness.

## Critical constraints for any agent working on this code

1. Never claim the consensus gap is arbitrage, guaranteed profit, or verified truth.
2. Never add automated trading, wallet connection, or order placement.
3. Never add an LLM/agent loop that decides whether a gap exists. The gap engine is deterministic.
4. Never hardcode fees, probabilities, or market mappings. Fetch everything dynamically.
5. Never compare non-equivalent contracts. Runtime equivalence checks are mandatory.
6. Never suppress or fabricate alerts. Fail closed on stale, missing, or mismatched data.
7. Never commit secrets, API keys, or private keys. Use `.env.local` only.
8. Never expose raw TxLINE API responses through a public proxy.
9. Never badge a probability as "verified" unless it is deterministically recomputed from validated raw prices using a confirmed TxLINE method.
10. Never describe the Polymarket quote as "executable" from Brazil. Polymarket geoblocks Brazil for order placement. Use "top-of-book quote."

## Tech stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Runtime:** Local persistent Next.js process (not serverless)
- **Fonts:** Inter or Geist for UI, JetBrains Mono or Geist Mono for numerals
- **Tests:** Vitest
- **No database.** Session state only (browser localStorage or in-memory).

## Environment variables

```
TXLINE_JWT=           # Guest JWT from POST /auth/guest/start
TXLINE_API_TOKEN=     # Activated token from POST /api/token/activate
TXLINE_NETWORK=       # "mainnet" or "devnet"
GOOGLE_STITCH_API_KEY= # For design generation (optional after initial design)
```

Never commit these. They live in `.env.local` only.

## Key files to read

| File | Purpose |
|---|---|
| `AGENTS.md` | This file. Read first. |
| `SPEC.md` | Product specification, scope, and success criteria |
| `ARCHITECTURE.md` | Technical architecture, data flow, and module boundaries |
| `DESIGN.md` | Approved visual system and UI states |
| `design/stitch-brief.md` | Prompt sent to Google Stitch for design generation |
| `docs/txline-api.md` | TxLINE API reference (endpoints, auth, validation) |
| `docs/polymarket-api.md` | Polymarket API reference (Gamma, CLOB, fees) |
| `docs/fixture-mapping.md` | TxLINE fixture to Polymarket market mapping |
| `docs/build-order.md` | Milestone-ordered implementation plan |
| `docs/safety.md` | Fail-closed states and alert suppression rules |
| `docs/claims.md` | What we can and cannot say about this product |

## Build and run

```bash
npm install
npm run dev          # Local dev server
npm run test         # Run tests
npm run lint         # Lint
npm run typecheck    # Type check
```

## Git conventions

- Commit messages: lowercase, imperative, no prefix tokens
- Example: `add txline odds normalization and pct conversion`
- Never commit `.env.local`, `node_modules/`, or `keypair.json`

## When you're stuck

- If TxLINE activation fails, stop. Do not build UI to work around a data blocker.
- If the Polymarket contract cannot be confirmed as regulation-time 1X2, stop. Do not compare non-equivalent contracts.
- If you find yourself adding an LLM, wallet, or trading feature, stop. Re-read the constraints above.
- If the dashboard shows an alert from stale or mismatched data, that is a critical bug, not a feature.
