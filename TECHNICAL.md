# Technical Documentation — World Cup Edge

World Cup Edge is a read-only consensus-gap monitor for prediction-market traders. It pulls cryptographically anchored sports probabilities from TxLINE's Solana-anchored `txoracle` program, fetches the matching top-of-book quote from Polymarket's CLOB, and deterministically emits an alert when the two probabilities diverge beyond a configurable threshold. There is no LLM, no wallet connection for trading, and no order placement — the gap engine is pure arithmetic, and every alert fails closed on stale or mismatched data.

**Approved one-line description** (from `docs/claims.md`):
> World Cup Edge is a read-only consensus-gap monitor that compares TxLINE's cryptographically anchored sports data against Polymarket's live prediction market quotes. It identifies moments where the consensus probability and market price diverge, adjusted for fees, with full source provenance and contract verification. No trading. No AI. Deterministic analysis.

---

## 1. Tech stack

- **Framework:** Next.js 14+ (App Router), TypeScript, Tailwind CSS + shadcn/ui
- **Runtime:** Local persistent Next.js process (also deployed on Fly.io for the hackathon demo)
- **Fonts:** Source Serif 4 (headlines), Source Sans 3 (body), JetBrains Mono (numerals)
- **Tests:** Vitest — 330 tests across 13 files, all passing
- **No database.** Session alert history in browser localStorage only.
- **No LLM, no AI agent.** The gap engine is deterministic arithmetic.
- **No trading, no wallet-for-execution, no order placement.** Wallet only used for the one-time TxLINE on-chain activation (`/activate` page).

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (client)                      │
│  Polls /api/snapshot every 2-5 seconds                   │
│  Renders dashboard from normalized JSON                  │
│  Session alert history in browser localStorage           │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP GET (no-cache)
┌──────────────────────────┴──────────────────────────────┐
│              NEXT.JS SERVER ROUTE                         │
│  /api/snapshot/route.ts                                  │
│                                                          │
│  1. Fetch TxLINE odds snapshot (concurrent)              │
│  2. Fetch Polymarket Gamma market + CLOB book (concurrent)│
│  3. Run contract equivalence checks                      │
│  4. Normalize both sources                               │
│  5. Calculate gross gap, fee, gap after fee               │
│  6. Evaluate alert conditions (fail-closed)              │
│  7. Return normalized JSON                               │
│                                                          │
│  cache: "no-store" — never cache live data               │
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌────────────────┼────────────────┐
           │                │                │
┌─────────┴──────┐ ┌───────┴────────┐ ┌─────┴──────────┐
│  TxLINE API    │ │  Gamma API     │ │  CLOB API      │
│  txline.       │ │  gamma-api.    │ │  clob.         │
│  txodds.com    │ │  polymarket.   │ │  polymarket.   │
│                │ │  com           │ │  com           │
│  Auth:         │ │  No auth       │ │  No auth       │
│  Bearer JWT    │ │  (read-only)   │ │  (read-only)   │
│  X-Api-Token   │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
```

### Module layout

```
lib/
  config.ts                  # Thresholds, default fixture ID, match identity, disclaimer text
  types.ts                   # Shared Snapshot, VerificationChecks, Outcome, MatchEntry types
  txline/
    client.ts                # HTTP client: auth, fixtures, odds snapshot
    types.ts                 # Fixture, OddsPayload, NormalizedTxline types
    normalize.ts             # Pct -> probability, label mapping, distribution validation
  polymarket/
    client.ts                # Gamma API + CLOB book + fee fetch + identity validation
    types.ts                 # Market, Event, Book, Fee types
    normalize.ts             # Outcome/token pairing, best bid/ask, fee exponent
  gap/
    engine.ts                # Gross gap, fee-adjusted gap, alert state machine, dedupe
    types.ts                 # AlertInput, AlertPhase types
  contract/
    equivalence.ts           # Runtime checks: teams, date, rules, token, marketState
    regulation.ts            # Shared regulation-time 1X2 predicate
  data/
    index.ts                 # Provider factory + per-match cache
    real-provider.ts         # RealDataProvider (orchestrates TxLINE + Polymarket + gap)
    mock-provider.ts         # MockDataProvider (6 local-dev scenarios)
    replay.ts                # Deterministic replay scenario for ?demo=replay
  ui/
    check-state.ts           # Check state derivation for the UI
app/
  api/
    snapshot/route.ts        # Server route: orchestrates fetch + normalize + gap
    matches/route.ts         # Lists fixtures + matching Polymarket slugs
    health/route.ts          # Liveness check
  activate/                  # On-chain TxLINE activation page
  page.tsx                   # Dashboard component
  layout.tsx, globals.css   # Root layout, fonts, design tokens
tests/                       # Vitest suite (13 files, 330 tests)
Dockerfile, fly.toml         # Fly.io deploy artifacts
```

---

## 3. Data flow (per poll cycle)

```
1. route.ts receives GET request
2. Concurrently fetch:
   a. TxLINE: GET /api/odds/snapshot/{fixtureId}
   b. Polymarket: GET gamma-api.polymarket.com/events?slug={slug}
   c. Polymarket: GET gamma-api.polymarket.com/markets?slug={marketSlug}
   d. Polymarket: GET clob.polymarket.com/book?token_id={yesTokenId}
   e. Polymarket: GET clob.polymarket.com/clob-markets/{conditionId}   (fee config)
3. TxLINE normalize:
   a. Find regulation-time 1X2 row in odds payload (shared regulation predicate)
   b. Identify England probability from PriceNames/Pct arrays
   c. Convert Pct string ("47.000") to probability (0.47)
   d. Reject "NA", unequal arrays, unknown labels, implausible distribution (validateDistribution)
   e. Read serviceLevel from the odds row (fall back to CONFIG default)
   f. Capture MessageId, Ts for freshness + dedup
4. Polymarket normalize:
   a. Verify event: teams, date, start time, regulation-time wording
   b. Verify market: active, closed=false, acceptingOrders=true
   c. Pair outcomes with clobTokenIds, select YES token (no index-0 fallback)
   d. Extract best bid (max) and best ask (min) from book
   e. Fetch fee rate + fee exponent dynamically from CLOB market info
   f. Capture book timestamp/seq for freshness + dedup
5. Contract equivalence (runtime checks):
   a. Both sides are the same team (accent-stripped, case-insensitive)
   b. Match date aligns
   c. TxLINE market is regulation-time 1X2 (shared predicate)
   d. YES token label matches expected team or "Yes"/"True"
   e. Market state is active, not closed, accepting orders
   f. CLOB asset_id / conditionId round-trip matches
6. Gap engine (fail-closed):
   a. grossGap = txlineProbability - bestAsk   (null if equivalence fails)
   b. feePerShare = feeRate * bestAsk^e * (1 - bestAsk)^e
   c. gapAfterFee = grossGap - feePerShare
   d. Evaluate 12 suppression conditions in order (see §6)
   e. State machine: IDLE → SAMPLING → ALERTING → COOLDOWN → IDLE
7. Return normalized Snapshot JSON (no raw OddsPayload, no Pct arrays)
```

### Snapshot response shape

```typescript
interface Snapshot {
  status: "loading" | "live" | "stale" | "unavailable" | "error";
  alertKind: "no-alert" | "alert";
  match: { name, date, kickoffUTC, rules, outcome, outcomeLabel, homeTeam, awayTeam };
  txline: { probability, messageId, timestamp, receivedAt, fresh, serviceLevel, delayed };
  polymarket: {
    bestAsk, bestBid, askSize, feeRate, feeExponent, bookSeq,
    timestamp, receivedAt, fresh, marketActive, marketClosed,
    acceptingOrders, bookEmpty, yesTokenId, marketQuestion
  };
  gap: { grossGap, feePerShare, gapAfterFee, threshold };
  alert: { active, reason, consecutiveSamples, suppressedReason, phase, lastAlertTime, cooldownRemainingMs, dedupeKey };
  checks: { teams, date, rules, token, marketState, fee };
  equivalence: { passed, checks: {...}, failures: string[] } | null;
  sourceSkewMs: number | null;
  receivedAt: number;
  errorMessage: string | null;
}
```

---

## 4. TxLINE integration

### Networks and program IDs

| Network | API Origin | Program ID |
|---|---|---|
| Mainnet | `https://txline.txodds.com` | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` |
| Devnet | `https://txline-dev.txodds.com` | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

### Auth flow (two-step credential model)

1. `POST /auth/guest/start` → `{ token: "<jwt>" }` (30-day expiry)
2. On-chain: `subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)` on the `txoracle` program → `txSig`
3. Sign: `${txSig}::${jwt}` (empty leagues for World Cup free tier)
4. `POST /api/token/activate` with `{ txSig, walletSignature, leagues: [] }` → API token
5. Use both on every data request: `Authorization: Bearer ${jwt}` + `X-Api-Token: ${apiToken}`

### On-chain subscription instruction

- Program: `txoracle` (Anchor, v1.5.6)
- Instruction: `subscribe(service_level_id: u16, weeks: u8)` — 8-byte discriminator `[254, 28, 191, 138, 156, 179, 183, 53]`
- Called with `(12, 4)` against the `pricing_matrix` and `token_treasury_v2` PDAs and the TxL token mint `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL` (Token-2022 program)
- The returned tx signature is Ed25519-signed by the wallet and sent to `/api/token/activate` to mint the API token
- The app is read-only after activation; no other on-chain instruction is called

### Free tiers used

| Level | Data | Delay |
|---|---|---|
| 1 | World Cup + Friendlies | 60 seconds |
| 12 | World Cup + Friendlies | Real-time (mainnet only) |

Service level 12 is used for live alerts. Level 1 must suppress alerts and display "60-second delayed" — enforced by `lib/gap/engine.ts` (see §6).

### Endpoints used

- `POST /auth/guest/start` — obtain a 30-day guest JWT (no auth)
- `POST /api/token/activate` — exchange a signed activation message for the API token
- `GET /api/fixtures/snapshot` — list fixtures (`Authorization: Bearer ${jwt}`, `X-Api-Token`)
- `GET /api/odds/snapshot/{fixtureId}` — fetch the anchored odds payload for one fixture (same headers)

### Odds payload structure

The `OddsPayload` exposes:
- `PriceNames`: positional array of outcome labels
- `Prices`: positional array of price values
- `Pct`: positional array of percentage strings (e.g., `"47.000"` or `"NA"`)
- `SuperOddsType`: market type identifier (used to identify regulation-time 1X2)
- `MarketPeriod`: period identifier — `null` is the correct marker for regulation-time `participant_result` rows
- `InRunning`: whether match is in-play
- `GameState`: fixture state (1 = scheduled, 6 = cancelled)
- `MessageId`: unique message ID for deduplication
- `Ts`: source timestamp
- `serviceLevel`: parsed from the API row; falls back to CONFIG default if absent

### Normalization rules

- Convert `Pct` string to probability: `"47.000"` → `0.47`
- Reject `"NA"`, unequal array lengths, unknown labels, duplicates
- `validateDistribution` verifies the three-way probabilities form a plausible distribution (tolerance 0.05); if invalid, `probability` is nulled (fail-closed — gap engine then suppresses)
- Use `MessageId` for alert deduplication
- Identify the correct row via the shared `isRegulationTime1X2` predicate in `lib/contract/regulation.ts`
- Both PascalCase and camelCase field names handled at the client boundary (`r.serviceLevel ?? r.ServiceLevel`, `r.startTime ?? r.StartTime`, etc.)

### On-chain validation

The `validateStat` instruction validates score statistics against on-chain Merkle roots. It does NOT validate odds. For odds validation, use the odds validation path (future work, not part of this hackathon submission).

- `validateStat` is a `.view()` call (read-only simulation, no gas, no transaction signature)
- Roots are published in 5-minute batches, so a current live update may not be immediately provable

---

## 5. Polymarket integration

### Gamma API (market discovery, no auth)

- `GET https://gamma-api.polymarket.com/events?slug={slug}` — resolve an event by slug
- `GET https://gamma-api.polymarket.com/markets?slug={slug}` — resolve a market by slug
- `GET https://gamma-api.polymarket.com/events?active=true&closed=false&limit={n}` — discover active soccer events

Key fields: `slug`, `markets[]`, `conditionId`, `outcomes[]`, `clobTokenIds[]`, `active`, `closed`, `acceptingOrders`, `bestBid`, `bestAsk`.

**Token pairing:** `outcomes` and `clobTokenIds` are positional arrays. We do NOT assume index 0 is YES. We verify the label matches "Yes"/"True" or the expected team name before selecting the token ID.

### CLOB API (order book, no auth for reads)

- `GET https://clob.polymarket.com/book?token_id={tokenId}` — top-of-book bids/asks for the YES token
- `GET https://clob.polymarket.com/clob-markets/{conditionId}` — taker/maker fee configuration for fee-aware gap math

Response shape:
```json
{
  "market": "...",
  "asset_id": "...",
  "bids": [{ "price": "0.38", "size": "100" }, ...],
  "asks": [{ "price": "0.39", "size": "50" }, ...],
  "timestamp": "..."
}
```

**Best bid = maximum bid price. Best ask = minimum ask price.** We never assume array index 0.

### Fee configuration (always fetched dynamically)

Polymarket sports taker fees are enabled with a rate (e.g., `0.05`) and an exponent (1 or 2), fetched dynamically from `clob.polymarket.com/clob-markets/{conditionId}`. Fees are never hardcoded.

Fee calculation per share:
```
feePerShare = feeRate * bestAsk^feeExponent * (1 - bestAsk)^feeExponent
```

### Identity validation

In addition to the equivalence checker, the Polymarket client validates:
- The selected market belongs to the resolved event
- The CLOB `asset_id` matches the YES token ID
- The CLOB `conditionId` matches the market's `conditionId`

Any mismatch sets `identityValid: false` and adds a failure string to `identityFailures[]`, which suppresses alerts via the equivalence check.

### Brazil geoblock

Polymarket geoblocks Brazil for order placement. Public read-only market-data access works. The displayed quote is a "top-of-book quote," not an "executable price." The UI never uses the word "executable."

---

## 6. Fail-closed rules (alert suppression)

The gap engine evaluates 12 suppression conditions in order. If ANY applies, the alert is suppressed (`active: false`, `suppressedReason` set). No alert can fire on stale, missing, or mismatched data.

| # | Condition | Suppression reason |
|---|---|---|
| 1 | `serviceLevel === 1` | "TxLINE service level 1 (60-second delayed). Alerts suppressed." |
| 2 | `fixtureGameState === 6` | "Fixture is cancelled (GameState 6). Alerts suppressed." |
| 3 | `!equivalencePassed` | "Contract equivalence checks failed. Alerts suppressed." |
| 4 | TxLINE data stale (> 30s) | "TxLINE data is stale. Alerts suppressed." |
| 5 | Polymarket data stale (> 10s) | "Polymarket data is stale. Alerts suppressed." |
| 6 | Cross-source skew > 15s | "Cross-source skew Xms exceeds 15000ms. Alerts suppressed." |
| 7 | `marketClosed` | "Polymarket market is closed. Alerts suppressed." |
| 8 | `!marketActive` | "Polymarket market is not active. Alerts suppressed." |
| 9 | `!acceptingOrders` | "Polymarket market is not accepting orders. Alerts suppressed." |
| 10 | `bookEmpty` (asks OR bids) | "Polymarket book is empty. Alerts suppressed." |
| 11 | `feeRate` null/invalid | "Polymarket fee rate is unavailable. Alerts suppressed." |
| 12 | `gapAfterFee` null/invalid | "Gap value is missing or invalid. Alerts suppressed." |

Additionally:
- `isBookEmpty` uses OR-logic (suppress if asks empty OR bids empty) — handles half-empty books at kickoff (`clearBookOnStart`)
- `GameState=6` (cancelled fixture) is checked in the snapshot path, not just filtered from the match list
- Service level is read from the API response row, not hardcoded — a drop to level 1 (60s delay) immediately suppresses alerts
- Duplicate `MessageId`+`bookHash` deduplication in `RealDataProvider` prevents the same alert from firing twice

### Alert state machine

```
States: IDLE → SAMPLING → ALERTING → COOLDOWN → IDLE
                                   → IDLE (gap falls below threshold)

IDLE       No qualifying gap detected
SAMPLING   Gap exceeds threshold, waiting for 2 consecutive confirmations
ALERTING   Gap confirmed for 2 consecutive samples, alert emitted, entering cooldown
COOLDOWN   Suppressing alerts for 60 seconds
```

---

## 7. Contract equivalence (runtime checks)

Every poll runs `checkEquivalence()` which verifies the two sides are the same outcome before any gap is computed. If equivalence fails, `grossGap` and `gapAfterFee` are nulled and the alert is suppressed.

| Check | What it verifies |
|---|---|
| teams | TxLINE home/away team names match Polymarket event teams (accent-stripped, case-insensitive) |
| date | TxLINE fixture date matches Polymarket event date |
| rules | TxLINE market is regulation-time 1X2 (shared predicate); Polymarket resolution confirms regulation time |
| token | YES token label matches expected team or "Yes"/"True"; rejects "No"/"Draw" as affirmative |
| marketState | Polymarket market is active, not closed, accepting orders |

The shared `isRegulationTime1X2` predicate in `lib/contract/regulation.ts` is the single source of truth — used by both the row selector and the equivalence checker. It:
- Accepts `participant_result` market type with `null` `marketPeriod` (the verified regulation-time marker)
- Rejects plain `1X2`/`moneyline` with `null` (ambiguous full-match)
- Excludes halftime, extra time, overtime, penalties, qualification fragments

---

## 8. Testing

**330 tests across 13 files, all passing.**

| File | Coverage |
|---|---|
| `txline.test.ts` (52) | Pct conversion, "NA" rejection, array length, label mapping, distribution validation, StartTime as number, service level from API, regulation-time predicate |
| `polymarket.test.ts` (39) | Outcome/token pairing, best bid/ask extrema, half-empty book (asks OR bids empty), fee calculation, token label matching without "england" hardcode |
| `equivalence.test.ts` (51) | Team matching with accents (Côte d'Ivoire), date matching, rules predicate across periods (ft, ht, et, half=1, penalties, qualification), token label validation |
| `gap.test.ts` (40) | Gross gap, fee-adjusted gap with exponent 1 and 2, threshold logic, consecutive samples, cooldown, deduplication, level-1 suppression |
| `safety.test.ts` (14) | All 12 fail-closed rules: stale TxLINE, stale Polymarket, cross-source skew, market closed, inactive, not-accepting-orders, book empty, fee null, gap null, GameState=6, service level 1, equivalence fail |
| `real-provider.test.ts` (15) | Provider orchestration, gap gating on equivalence + fee, identity failures, alert lifecycle |
| `check-state.test.ts` (53) | UI check state derivation |
| `matches-provider.test.ts` (20) | Fixture discovery, slug derivation with accent-stripping (Côte d'Ivoire → civ), GameState=6 filtering |
| `snapshot-params.test.ts` (11) | Provider factory cache, different slugs produce different cached instances |
| `replay.test.ts` (8) | Deterministic replay scenario (`?demo=replay`) |
| `mock-provider.test.ts` (13) | All 6 mock scenarios |
| `config.test.ts` (5) | CONFIG has no hardcoded Polymarket slugs; MATCH matches SPEC.md |
| `state-machine.test.ts` (9) | Alert state machine transitions |

Run: `npm run test`

---

## 9. Build, deploy, and run

### Local development

```bash
cp .env.example .env.local
# Fill in TXLINE_JWT and TXLINE_API_TOKEN after activation
npm install
npm run dev          # starts Next.js on localhost:3000
```

### TxLINE activation

Run `npm run txline:activate` (CLI) or visit `/activate` in the browser after `npm run dev`. Requires a mainnet Solana wallet with a small SOL balance for the on-chain subscription.

### Scripts

```bash
npm run dev          # Next.js dev server
npm run build        # Production build (standalone output for Docker)
npm run start        # Start production server
npm run test         # Vitest suite (330 tests)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run txline:activate  # CLI TxLINE activation flow
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

### Deployment (Fly.io)

- `Dockerfile` — multi-stage build, node:22-alpine, non-root `nextjs` user, standalone Next.js output
- `fly.toml` — region `gru` (São Paulo), health check on `/api/health`, `min_machines_running 1`
- Live deploy: https://world-cup-edge.fly.dev/
- Replay mode (deterministic alert): https://world-cup-edge.fly.dev/?demo=replay
- Activation page: https://world-cup-edge.fly.dev/activate

The deploy boots into mock mode when no TxLINE credentials are configured, so judges can see the dashboard immediately. Append `?demo=replay` to see the deterministic alert-firing state.

---

## 10. Constraints compliance (from `AGENTS.md`)

All 10 hard constraints are satisfied:

1. **Never claim the consensus gap is arbitrage, guaranteed profit, or verified truth** — every use of these terms in the codebase is a negating disclaimer.
2. **Never add automated trading, wallet connection, or order placement** — all Polymarket calls are GET. The wallet is used only in `/activate` for the one-time TxLINE subscription, never for trading.
3. **Never add an LLM/agent loop** — the gap engine is deterministic arithmetic. No LLM imports.
4. **Never hardcode fees, probabilities, or market mappings** — fees are fetched dynamically per market. Probabilities flow from the TxLINE API. Market slugs are passed dynamically from the match picker. (A `FIFA_TEAM_CODES` fallback table in `lib/polymarket/client.ts` is used only as a last-resort slug derivation fallback for team-name → FIFA code mapping, never for fees, probabilities, or market values.)
5. **Never compare non-equivalent contracts** — runtime equivalence checks run on every poll and gate the gap computation.
6. **Never suppress or fabricate alerts — fail closed** — 12 suppression conditions, all enforced. No `active: true` path bypasses suppression.
7. **Never commit secrets, API keys, or private keys** — `.env.local` and `keypair.json` are gitignored and not committed.
8. **Never expose raw TxLINE API responses through a public proxy** — the route returns only the normalized `Snapshot` type. No `OddsPayload`, `Pct`, or `Prices` arrays in the response.
9. **Never badge a probability as "verified" unless deterministically recomputed** — the UI uses "TxLINE Consensus", never "verified".
10. **Never describe the Polymarket quote as "executable" from Brazil** — the UI uses "top-of-book quote" consistently. Zero "executable" hits in the app code.

---

## 11. Footer disclaimers (verbatim, displayed in the UI)

1. "Read-only monitor. Not a trading bot. Not a settlement oracle. The consensus gap is not arbitrage, guaranteed profit, or verified truth."
2. "TxLINE proof verifies data provenance, not signal correctness."

---

## 12. What this product is NOT

- Not an AI agent. No LLM in the loop. Deterministic calculations only.
- Not a trading bot. No order placement, no custody, no wallet connection for trading.
- Not a gambling product. No bet recommendations, no profit promises.
- Not a settlement oracle. No claim of cryptographic truth.
- Not "verified intelligence." The proof verifies data provenance, not signal correctness.

---

## Links

- **Live app:** https://world-cup-edge.fly.dev/
- **Replay mode (alert state):** https://world-cup-edge.fly.dev/?demo=replay
- **On-chain activation:** https://world-cup-edge.fly.dev/activate
- **Source code:** https://github.com/patrickpassosb/world-cup-edge
- **Demo video:** https://youtu.be/zgxXLuH4urk
- **README:** https://github.com/patrickpassosb/world-cup-edge/blob/master/README.md
- **SUBMISSION.md (vault-matched descriptions, demo script, checklist):** https://github.com/patrickpassosb/world-cup-edge/blob/master/SUBMISSION.md
- **API references (docs/):** https://github.com/patrickpassosb/world-cup-edge/tree/master/docs