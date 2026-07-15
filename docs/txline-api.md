# TxLINE API Reference

Compiled from official docs at https://txline.txodds.com/documentation/ and the llms.txt index at https://txline-docs.txodds.com/llms.txt

## Networks

| Network | RPC | API Origin | Program ID | TxL Token Mint |
|---|---|---|---|---|
| Mainnet | https://api.mainnet-beta.solana.com | https://txline.txodds.com | 9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA | Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL |
| Devnet | https://api.devnet.solana.com | https://txline-dev.txodds.com | 6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J | 4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG |

IMPORTANT: Use the same network for every step. Do not activate a devnet transaction on mainnet or vice versa.

## Authentication flow

1. Get guest JWT: `POST /auth/guest/start` -> returns `{ token: "<jwt>" }` (expires in 30 days)
2. Subscribe on-chain: call `subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)` on the Txoracle program -> get `txSig`
3. Sign activation message: `${txSig}::${jwt}` (for empty leagues: `${txSig}::${jwt}`)
4. Activate: `POST /api/token/activate` with `{ txSig, walletSignature, leagues: [] }` using JWT for authorization -> returns API token
5. Use both credentials for data API calls:
   - `Authorization: Bearer ${jwt}` (guest JWT)
   - `X-Api-Token: ${apiToken}` (activated token)

### Service levels (free, no payment required)

| Service Level | Data | Delay |
|---|---|---|
| 1 | World Cup & International Friendlies | 60-second delay |
| 12 | World Cup & International Friendlies | Real-time (mainnet only) |

Subscription duration must be a multiple of 4 weeks (4, 8, 12, etc.). Free tiers charge 0 TxL tokens but still register the subscription on-chain.

**For live alerts, use service level 12. If level 12 cannot be activated, level 1 can validate the integration but the dashboard must display "60-second delayed" and suppress all live alerts.**

## Data API endpoints

Base URL: `https://txline.txodds.com/api` (mainnet) or `https://txline-dev.txodds.com/api` (devnet)

All requests need headers:
```
Authorization: Bearer ${jwt}
X-Api-Token: ${apiToken}
Content-Type: application/json
```

### Fixtures

```typescript
GET /api/fixtures/snapshot
GET /api/fixtures/snapshot?competitionId=500005
```

Fixture object: `FixtureId`, `Participant1`, `Participant2`, `Participant1IsHome`, `StartTime`, `GameState`

GameState values: `1` = scheduled, `6` = cancelled

`Participant1IsHome` is the feed's home/away designation. For neutral competitions (World Cup), it means listed as home side for feed purposes, not a venue guarantee.

### Odds

```typescript
GET /api/odds/snapshot/${fixtureId}
GET /api/odds/updates/${epochDay}/${hourOfDay}/${interval}
GET /api/odds/stream  // SSE
```

Headers for SSE: `Accept: text/event-stream`, `Cache-Control: no-cache`

### Scores

```typescript
GET /api/scores/snapshot/${fixtureId}?asOf=${Date.now()}
GET /api/scores/updates/${fixtureId}
GET /api/scores/historical/${fixtureId}
GET /api/scores/stream  // SSE
```

Score updates include: `seq`, `ts`, `gameState`

### Validation proofs

```typescript
GET /api/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKey=${statKey}
GET /api/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKey=${statKey}&statKey2=${statKey2}
```

Returns: `summary`, `subTreeProof`, `mainTreeProof`, `statToProve`, `eventStatRoot`, `statProof`

## Odds payload structure

The `OddsPayload` does NOT expose a field named `StablePrice`. "StablePrice" is the product/feed name, not a field.

Positional arrays in the payload:

| Field | Type | Description |
|---|---|---|
| `PriceNames` | string[] | Outcome labels (e.g., "England", "Draw", "Argentina") |
| `Prices` | string[] | Price values |
| `Pct` | string[] | Percentage strings (e.g., "47.000" or "NA") |
| `SuperOddsType` | enum | Market type identifier (must identify regulation-time 1X2) |
| `MarketPeriod` | enum | Period identifier (must confirm regulation time) |
| `MarketParameters` | object | Additional market parameters |
| `InRunning` | boolean | Whether match is in-play |
| `GameState` | number | Fixture state (1 = scheduled, 6 = cancelled) |
| `MessageId` | string | Unique message ID for deduplication |
| `Ts` | number | Source timestamp |

### Normalization rules

1. Convert `Pct` string to probability: `"47.000"` -> `0.47`
2. Reject `"NA"` values
3. Reject if `PriceNames`, `Prices`, and `Pct` have unequal lengths
4. Reject duplicate outcome labels
5. Reject unknown labels that don't match expected teams
6. Verify three-way probabilities form a plausible distribution (sum ~1.0 with rounding tolerance)
7. Use `MessageId` for alert deduplication
8. Identify the correct row by inspecting `SuperOddsType` and `MarketPeriod` for regulation-time 1X2

### Unknown fields (must be inspected from real data before implementation)

Until a real fixture `18241006` payload is inspected, the following remain unknown:
- Exact `SuperOddsType` value for regulation-time 1X2
- Exact full-match `MarketPeriod` value
- Price-name labels and ordering for England/draw/Argentina
- How suspension is encoded (no documented `IsSuspended` field)

**The first implementation task after activation is to print and inspect a real odds payload for fixture 18241006.**

## On-chain validation

### validateStat instruction

Validates score statistics against on-chain Merkle roots. Does NOT validate odds.

```typescript
const isValid = await program.methods
  .validateStat(
    new BN(targetTs),
    fixtureSummary,
    fixtureProof,    // Merkle proof for fixture in sub-tree
    mainTreeProof,   // Merkle proof for sub-tree in main tree
    predicate,       // { threshold: 0, comparison: { greaterThan: {} } }
    stat1,           // { statToProve, eventStatRoot, statProof }
    null,            // No second stat
    null             // No operator
  )
  .accounts({ dailyScoresMerkleRoots: dailyScoresPda })
  .preInstructions([computeBudgetIx])
  .view();  // Read-only simulation, no gas, no transaction signature
```

### Daily scores PDA derivation

```typescript
const epochDay = Math.floor(targetTs / (24 * 60 * 60 * 1000));
const [dailyScoresPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
  program.programId
);
```

### Important limitations

- `.view()` is a simulation. It produces no transaction signature. Do not promise an explorer link.
- Roots are published in 5-minute batches. A current live update may not be immediately provable.
- Score validation proves match data provenance, not odds correctness.
- For odds validation, a separate odds validation path exists (future work).
- `OddsPayload` contains `Pct`, but the validation payload and on-chain `Odds` structure contain `Prices` and not `Pct`. A proof of the raw odds record does not automatically prove the displayed `Pct`.

## SSE streaming helper

```typescript
type SseMessage = { id?: string; event?: string; data: string; retry?: number };

function parseSseBlock(block: string): SseMessage | null { /* see docs */ }
async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> { /* see docs */ }
function parseSseData(data: string) { return JSON.parse(data); }
```

Stream compression: add `"Accept-Encoding": "gzip"` to reduce bandwidth by 70-80%. Decompress with `gunzipSync()` from Node's `zlib`.

## Packages needed

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token axios tweetnacl
```

## Confirmed World Cup fixtures (from schedule)

| Date (UTC) | Fixture ID | Stage | Home | Away |
|---|---|---|---|---|
| July 14, 19:00 | 18237038 | Semi-finals | France | Spain |
| July 15, 19:00 | 18241006 | Semi-finals | England | Argentina |

## Documentation links

- Quickstart: https://txline.txodds.com/documentation/quickstart
- World Cup Free Tier: https://txline.txodds.com/documentation/worldcup
- Odds Overview: https://txline.txodds.com/documentation/odds/overview
- Scores Overview: https://txline.txodds.com/documentation/scores/overview
- Program Addresses: https://txline.txodds.com/documentation/programs/addresses
- Fetching Snapshots: https://txline.txodds.com/documentation/examples/fetching-snapshots
- Streaming Data: https://txline.txodds.com/documentation/examples/streaming-data
- On-Chain Validation: https://txline.txodds.com/documentation/examples/onchain-validation
- Runnable Devnet Examples: https://txline.txodds.com/documentation/examples/devnet-examples
- Troubleshooting: https://txline.txodds.com/documentation/examples/troubleshooting
- OpenAPI YAML: https://txline.txodds.com/docs/docs.yaml
- Full docs index: https://txline-docs.txodds.com/llms.txt
