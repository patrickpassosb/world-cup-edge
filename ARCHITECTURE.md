# Architecture - World Cup Edge

## System overview

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (client)                      │
│  Polls /api/snapshot every 2-5 seconds                   │
│  Renders dashboard from normalized JSON                  │
│  Session alert history in browser state                  │
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
│  5. Calculate gross gap, fee, gap after fee              │
│  6. Evaluate alert conditions                            │
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

## Module boundaries

```
src/
  config.ts                    # Fixture ID, market slug, thresholds, network
  lib/
    txline/
      client.ts                # HTTP client: auth, fixtures, odds snapshot
      types.ts                 # OddsPayload, Fixture, ScoreUpdate types
      normalize.ts             # Pct -> probability, label mapping, validation
    polymarket/
      client.ts                # Gamma API + CLOB book + fee fetch
      types.ts                 # Market, Event, Book, Fee types
      normalize.ts             # Outcome/token pairing, best bid/ask extraction
    contract/
      equivalence.ts           # Runtime checks that both sides are same outcome
      types.ts                 # EquivalenceResult type
    gap/
      engine.ts                # Gross gap, fee-adjusted gap, alert evaluation
      types.ts                 # GapResult, AlertState types
  app/
    api/
      snapshot/
        route.ts               # Server route: orchestrates fetch + normalize + gap
    page.tsx                   # Dashboard component
    layout.tsx                 # Root layout
    globals.css                # Tailwind + theme tokens
```

## Data flow (per poll cycle)

```
1. route.ts receives GET request
2. Concurrently fetch:
   a. TxLINE: GET /api/odds/snapshot/{fixtureId}
   b. Polymarket: GET gamma-api.polymarket.com/events?slug={slug}
   c. Polymarket: GET clob.polymarket.com/book?token_id={yesTokenId}
3. TxLINE normalize:
   a. Find regulation-time 1X2 row in odds payload
   b. Identify England probability from PriceNames/Prices/Pct arrays
   c. Convert Pct string ("47.000") to probability (0.47)
   d. Reject "NA", unequal arrays, unknown labels, implausible distribution
   e. Capture MessageId, Ts for freshness
4. Polymarket normalize:
   a. Verify event: teams, date, start time, regulation-time wording
   b. Verify market: active, closed=false, acceptingOrders=true
   c. Pair outcomes with clobTokenIds, select YES token
   d. Extract best bid (max) and best ask (min) from book
   e. Fetch fee rate dynamically from market config
   f. Capture book timestamp/seq for freshness
5. Contract equivalence:
   a. Both sides are England regulation-time win
   b. Match date and start time align
   c. TxLINE market period is regulation, not full-time or extra-time
6. Gap engine:
   a. grossGap = txlineProbability - bestAsk
   b. feePerShare = feeRate * bestAsk * (1 - bestAsk)
   c. gapAfterFee = grossGap - feePerShare
   d. Evaluate: fresh? equivalent? market open? gap > threshold? consecutive? cooldown?
   e. Return alert state
7. Return JSON:
   {
     status: "live" | "stale" | "unavailable" | "error",
     match: { name, date, kickoffUTC },
     txline: { probability, messageId, timestamp, receivedAt, fresh },
     polymarket: { bestAsk, bestBid, askSize, feeRate, bookSeq, timestamp, receivedAt, fresh, marketActive },
     gap: { grossGap, feePerShare, gapAfterFee, threshold },
     alert: { active, reason, consecutiveSamples, lastAlertTime },
     checks: { teams, date, rules, token, marketState, fee },
     history: []  // populated client-side
   }
```

## TxLINE API details

### Networks

| Network | API Origin | Program ID |
|---|---|---|
| Mainnet | `https://txline.txodds.com` | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` |
| Devnet | `https://txline-dev.txodds.com` | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |

### Auth flow

1. `POST /auth/guest/start` -> `{ token: "<jwt>" }` (30-day expiry)
2. On-chain: `subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)` on Txoracle program -> get `txSig`
3. Sign: `${txSig}::${jwt}` (empty leagues for World Cup free tier)
4. `POST /api/token/activate` with `{ txSig, walletSignature, leagues: [] }` -> API token
5. Use both: `Authorization: Bearer ${jwt}` + `X-Api-Token: ${apiToken}`

### Free tiers

| Level | Data | Delay |
|---|---|---|
| 1 | World Cup + Friendlies | 60 seconds |
| 12 | World Cup + Friendlies | Real-time (mainnet only) |

**Use service level 12 for live alerts. Level 1 must suppress alerts and display "60-second delayed."**

### Key endpoints

```
GET /api/fixtures/snapshot                    # All fixtures
GET /api/fixtures/snapshot?competitionId=X    # By competition
GET /api/odds/snapshot/{fixtureId}            # Odds for one fixture
GET /api/scores/snapshot/{fixtureId}          # Scores for one fixture
GET /api/odds/stream                          # SSE odds stream
GET /api/scores/stream                        # SSE scores stream
GET /api/scores/stat-validation?fixtureId=X&seq=Y&statKey=Z  # Merkle proof data
```

### Odds payload structure

The `OddsPayload` does NOT have a field named `StablePrice`. It exposes:

- `PriceNames`: positional array of outcome labels
- `Prices`: positional array of price values
- `Pct`: positional array of percentage strings (e.g., `"47.000"` or `"NA"`)
- `SuperOddsType`: market type identifier (must identify regulation-time 1X2)
- `MarketPeriod`: period identifier (must confirm regulation time)
- `MarketParameters`: additional market parameters
- `InRunning`: whether match is in-play
- `GameState`: fixture state (1 = scheduled, 6 = cancelled)
- `MessageId`: unique message ID for deduplication
- `Ts`: source timestamp

**Normalization rules:**
- Convert `Pct` string to probability: `"47.000"` -> `0.47`
- Reject `"NA"`, unequal array lengths, unknown labels, duplicates
- Verify three-way probabilities form a plausible distribution
- Use `MessageId` for alert deduplication
- Identify the correct row by inspecting `SuperOddsType` and `MarketPeriod`

### On-chain validation

The `validateStat` instruction validates score statistics against on-chain Merkle roots. It does NOT validate odds. For odds validation, use the odds validation path (future work).

- `validateStat` is a `.view()` call (read-only simulation, no gas, no transaction signature)
- Do not promise an explorer transaction link unless a real transaction is submitted
- Roots are published in 5-minute batches, so a current live update may not be immediately provable

## Polymarket API details

### Gamma API (market discovery, no auth)

```
GET https://gamma-api.polymarket.com/events?slug={slug}
GET https://gamma-api.polymarket.com/markets?slug={slug}
```

Key fields from event response:
- `slug`: event slug (e.g., `fifwc-eng-arg-2026-07-15`)
- `markets`: array of market objects
- Each market: `conditionId`, `outcomes` (array of labels), `clobTokenIds` (array of token IDs)
- `active`, `closed`, `acceptingOrders`: market state flags
- `bestBid`, `bestAsk`: from Gamma (use CLOB for execution-quality data)

**Token pairing:** `outcomes` and `clobTokenIds` are positional arrays. Do NOT assume index 0 is YES. Verify the label matches "England" or "Yes" before selecting the token ID.

### CLOB API (order book, no auth for reads)

```
GET https://clob.polymarket.com/book?token_id={tokenId}
```

Response:
```json
{
  "market": "...",
  "asset_id": "...",
  "bids": [{ "price": "0.38", "size": "100" }, ...],
  "asks": [{ "price": "0.39", "size": "50" }, ...],
  "timestamp": "..."
}
```

**Best bid = maximum bid price. Best ask = minimum ask price.** Do not assume array index 0.

### Fee configuration

Polymarket sports taker fees are enabled with a rate (e.g., `0.05`). Fetch dynamically from the market config. Do not hardcode.

Fee calculation per share:
```
feePerShare = feeRate * price * (1 - price)
```

### Known event for July 15

- Event slug: `fifwc-eng-arg-2026-07-15`
- England market slug: `fifwc-eng-arg-2026-07-15-eng`
- Resolution: England winning in the first 90 minutes plus stoppage time (excludes extra time)
- Polymarket represents three-way result as three binary markets inside a negative-risk event

### Brazil geoblock

Polymarket geoblocks Brazil for order placement. Public read-only market-data access works. Never describe the quote as "executable" from Brazil. Use "top-of-book quote."

## Gap engine

### Configuration (in `config.ts`)

```typescript
export const CONFIG = {
  txline: {
    fixtureId: 18241006,
    network: "mainnet",
    serviceLevel: 12,
    maxAgeMs: 30_000,           // 30 seconds
    delayedMaxAgeMs: 120_000,   // 2 minutes for level 1
  },
  polymarket: {
    eventSlug: "fifwc-eng-arg-2026-07-15",
    marketSlug: "fifwc-eng-arg-2026-07-15-eng",
    maxAgeMs: 10_000,
  },
  gap: {
    thresholdPp: 5,             // 5 percentage points
    consecutiveSamples: 2,
    cooldownMs: 60_000,         // 1 minute between alerts
    maxSourceSkewMs: 15_000,    // max difference between source timestamps
  },
};
```

### Alert state machine

```
 States: IDLE -> SAMPLING -> ALERTING -> COOLDOWN -> IDLE
                                     -> IDLE (gap falls below threshold)

 IDLE:       No qualifying gap detected
 SAMPLING:   Gap exceeds threshold, waiting for consecutive confirmation
 ALERTING:   Gap confirmed, alert emitted, entering cooldown
 COOLDOWN:   Suppressing alerts for cooldown period
```

### Fail-closed conditions (suppress ALL alerts)

- TxLINE data older than maxAgeMs
- Polymarket data older than maxAgeMs
- Cross-source timestamp skew exceeds maxSourceSkewMs
- TxLINE `Pct` is `"NA"` or arrays are malformed
- Polymarket book is empty (expect this at kickoff due to `clearBookOnStart`)
- Polymarket market is closed, not active, or not accepting orders
- Contract equivalence checks fail
- Service level is 1 (delayed mode)
- Duplicate `MessageId` (already processed)

## Deployment

Local only for the live test. No public deployment.

```bash
npm run dev  # starts Next.js on localhost:3000
```

If public deployment is added later:
- Server-side credentials only (never expose TxLINE JWT/token to client)
- Do not expose raw TxLINE API responses through a proxy
- Return only minimal normalized fields from the server route

## Testing strategy

| Test | What it covers |
|---|---|
| `normalize.test.ts` | Pct conversion, "NA" rejection, array length checks, label mapping, distribution validation |
| `polymarket.test.ts` | Outcome/token pairing, best bid/ask extraction, empty book, fee calculation |
| `equivalence.test.ts` | Team matching, date matching, market type matching, mismatch detection |
| `gap.test.ts` | Gross gap, fee-adjusted gap, threshold logic, consecutive samples, cooldown, deduplication |
| `states.test.ts` | Stale, unavailable, error, delayed mode, kickoff book reset |
| `route.test.ts` | End-to-end server route with mocked payloads matching real response shapes |

All test payloads must match observed real response shapes (with secrets removed). Mocks that don't match reality give false confidence.
