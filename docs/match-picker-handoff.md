# Handoff: Match Picker UI + Dynamic Snapshot

This document is for a clean-session agent to build the match picker feature. It contains everything needed: project context, current state, environment setup, real API shapes, file-by-file instructions, and verification steps.

## Project overview

World Cup Edge is a read-only consensus-gap monitor. It compares TxLINE's cryptographically anchored sports data probability against Polymarket's live top-of-book quote for the same outcome and emits deterministic alerts when a meaningful gap exists.

**Read `AGENTS.md` first.** Critical constraints:
- Never claim the gap is arbitrage, guaranteed profit, or verified truth
- Never add trading, wallet connection, or order placement
- Never add an LLM/agent loop that decides whether a gap exists
- Never hardcode fees, probabilities, or market mappings
- Never suppress or fabricate alerts — fail closed on stale/missing/mismatched data
- Never describe the Polymarket quote as "executable" from Brazil — use "top-of-book quote"
- No emojis in code unless explicitly requested
- No comments in code unless explicitly requested
- Commit messages: lowercase, imperative, no prefix tokens

**Tech stack:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Vitest. No database. Session state in browser.

## Current state (as of this commit)

### What's built and passing
- **TxLINE activation**: done. Credentials in `.env.local` (gitignored, not committed). Activation page at `/activate` using Solflare SDK.
- **Real TxLINE client**: `lib/txline/{client,normalize,types}.ts` — fetches fixtures + odds snapshots, normalizes Pct→probability, identifies regulation-time 1X2 rows, maps `part1`/`part2` labels to teams.
- **Real Polymarket client**: `lib/polymarket/{client,normalize,types}.ts` — fetches Gamma events + CLOB books, extracts best bid/ask, token pairing, fee rates.
- **Real data provider**: `lib/data/real-provider.ts` — orchestrates both clients + equivalence checks + gap engine, returns a `Snapshot`.
- **Gap engine**: `lib/gap/engine.ts` — gross gap, fee-adjusted gap, alert state machine (IDLE→SAMPLING→ALERTING→COOLDOWN), fail-closed suppression.
- **Contract equivalence**: `lib/contract/equivalence.ts` — runtime checks that both sides are the same outcome (teams, date, rules, token, market state).
- **Mock data provider**: `lib/data/mock-provider.ts` — 6 scenarios (live, alert, stale, unavailable, error, loading) for testing all UI states.
- **Dashboard**: `app/page.tsx` — renders the snapshot, polls `/api/snapshot` every 3s. Works with mock data.
- **Snapshot route**: `app/api/snapshot/route.ts` — calls `createProvider()` which switches on `DATA_SOURCE` env var.
- **Tests**: 143 passing. Covers equivalence, gap engine, state machine, safety/fail-closed, mock provider, polymarket normalize, txline normalize.
- **typecheck**: clean. **lint**: clean.

### What's NOT built yet
- **Match picker UI**: the dashboard is hardcoded to one match (config in `lib/config.ts`). Need a UI that shows available matches and lets the user select one.
- **Dynamic snapshot endpoint**: `/api/snapshot` reads from hardcoded `CONFIG`. Need to accept `?fixtureId=X&marketSlug=Y` query params.
- **Visual polish**: dashboard doesn't match the Stitch design PNGs in `design/stitch-previews/`.
- **Dress rehearsal**: no continuous run against live data yet.
- **Hackathon submission**: not started.

### Environment setup

`.env.local` (gitignored, already exists on this machine):
```
TXLINE_JWT=<activated JWT — 30 day expiry>
TXLINE_API_TOKEN=<activated API token>
TXLINE_NETWORK=mainnet
NEXT_PUBLIC_HELIUS_API_KEY=<Helius API key for reliable Solana RPC>
GOOGLE_STITCH_API_KEY=
```

`.env.example` (committed, placeholder):
```
TXLINE_JWT=
TXLINE_API_TOKEN=
TXLINE_NETWORK=mainnet
GOOGLE_STITCH_API_KEY=
NEXT_PUBLIC_HELIUS_API_KEY=
```

### How to run
```bash
npm install
npm run dev          # mock data (default)
DATA_SOURCE=real npm run dev   # real TxLINE + Polymarket data
MOCK_SCENARIO=alert npm run dev   # specific mock scenario
npm run test         # 143 tests
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

## The task: Match Picker UI + Dynamic Snapshot

### Goal
Replace the hardcoded single-match config with a match picker UI. The dashboard fetches all available World Cup fixtures from TxLINE, cross-references them with Polymarket markets, shows a list the user can select from, and monitors the selected match's gap. When no Polymarket market exists for a match, it shows TxLINE probability only with "gap monitoring disabled."

### Architecture change

**Current:**
```
Dashboard → /api/snapshot → createProvider() → reads CONFIG (hardcoded fixtureId + marketSlug)
```

**New:**
```
Dashboard → /api/matches → returns MatchEntry[] (TxLINE fixtures + Polymarket cross-ref)
Dashboard → /api/snapshot?fixtureId=X&marketSlug=Y → RealDataProvider(X, Y) → Snapshot
```

### New types to add

In `lib/types.ts`, add:

```typescript
export interface MatchEntry {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  kickoffUTC: string;
  competition: string;
  gameState: number;
  polymarketEventSlug: string | null;
  polymarketMarketSlug: string | null;
  hasPolymarketMarket: boolean;
}
```

### New file: `lib/data/matches-provider.ts`

Fetches and cross-references available matches from both sources.

```typescript
import { fetchFixtures } from "@/lib/txline/client";
import { fetchEvent, fetchMarket } from "@/lib/polymarket/client";
import type { MatchEntry } from "@/lib/types";

export async function fetchAvailableMatches(): Promise<MatchEntry[]> {
  // 1. Fetch all TxLINE fixtures
  const fixtures = await fetchFixtures();
  
  // 2. Filter for World Cup competition
  const worldCupFixtures = fixtures.filter(f => 
    f.competition.toLowerCase().includes("world cup")
  );
  
  // 3. For each fixture, try to find a matching Polymarket market
  //    - Search Polymarket events by team names
  //    - Polymarket event titles look like "England vs. Argentina"
  //    - Polymarket market slugs look like "fifwc-eng-arg-2026-07-15-eng"
  //    - Cross-reference by normalizing team names (lowercase, strip accents)
  
  const matches: MatchEntry[] = [];
  for (const fixture of worldCupFixtures) {
    const home = fixture.participant1IsHome ? fixture.participant1 : fixture.participant2;
    const away = fixture.participant1IsHome ? fixture.participant2 : fixture.participant1;
    
    // Try to find a Polymarket event matching this fixture
    // Strategy: search active events, filter by team names in title
    // This may require fetching /events?active=true&closed=false&limit=100
    // and filtering for titles containing both team names
    
    const polymarketMatch = await findPolymarketMatch(home, away);
    
    matches.push({
      fixtureId: fixture.fixtureId,
      homeTeam: home,
      awayTeam: away,
      kickoffUTC: new Date(fixture.startTime).toISOString(),
      competition: fixture.competition,
      gameState: fixture.gameState,
      polymarketEventSlug: polymarketMatch?.eventSlug ?? null,
      polymarketMarketSlug: polymarketMatch?.marketSlug ?? null,
      hasPolymarketMarket: polymarketMatch !== null,
    });
  }
  
  // Sort by kickoff time (earliest first)
  matches.sort((a, b) => a.kickoffUTC.localeCompare(b.kickoffUTC));
  
  return matches;
}

async function findPolymarketMatch(home: string, away: string): Promise<{eventSlug: string, marketSlug: string} | null> {
  // Implementation: 
  // 1. Fetch active Polymarket events: GET https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100
  // 2. Filter for events whose title contains both team names (case-insensitive, accent-stripped)
  // 3. For matching events, find the market for the home team (question contains home team name)
  // 4. Return { eventSlug, marketSlug } or null
  // 
  // IMPORTANT: Polymarket currently has NO individual match markets for upcoming World Cup fixtures.
  // Only "World Cup Winner" futures exist. This function will often return null — that's expected.
  // The dashboard must handle null gracefully (TxLINE-only mode).
}
```

### New file: `app/api/matches/route.ts`

```typescript
import { NextResponse } from "next/server";
import { fetchAvailableMatches } from "@/lib/data/matches-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const matches = await fetchAvailableMatches();
    return NextResponse.json(matches, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
```

### Modify: `app/api/snapshot/route.ts`

Accept `fixtureId` and `marketSlug` as query params:

```typescript
import { NextResponse } from "next/server";
import { createProvider } from "@/lib/data";
import type { Snapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixtureId");
  const marketSlug = searchParams.get("marketSlug");
  
  const provider = createProvider(fixtureId, marketSlug);
  // ... rest stays the same
}
```

### Modify: `lib/data/index.ts`

Pass params through to the real provider:

```typescript
export function createProvider(fixtureId?: number, marketSlug?: string): DataProvider {
  const source = process.env.DATA_SOURCE;
  
  if (source === "txline" || source === "real") {
    return new RealDataProvider(fixtureId, marketSlug);
  }
  
  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario);
}
```

### Modify: `lib/data/real-provider.ts`

Accept `fixtureId` and `marketSlug` as constructor params. Fall back to `CONFIG` defaults if not provided:

```typescript
export class RealDataProvider implements DataProvider {
  private fixtureId: number;
  private marketSlug: string;
  private eventSlug: string;
  
  constructor(fixtureId?: number, marketSlug?: string) {
    this.fixtureId = fixtureId ?? CONFIG.txline.fixtureId;
    this.marketSlug = marketSlug ?? CONFIG.polymarket.marketSlug;
    // Derive event slug from market slug (strip -eng/-draw/-arg suffix)
    this.eventSlug = this.marketSlug.replace(/-(eng|draw|arg)$/, "");
  }
  
  async getSnapshot(): Promise<Snapshot> {
    // Use this.fixtureId and this.marketSlug instead of CONFIG
    // Pass this.marketSlug to fetchPolymarketData(this.eventSlug, this.marketSlug)
    // Pass this.fixtureId to fetchOddsForMatch(this.fixtureId)
  }
}
```

### Modify: `app/page.tsx`

Add a match picker at the top of the dashboard. The existing dashboard code is ~599 lines — add the picker as a new section above the current content.

**Behavior:**
1. On load, fetch `GET /api/matches`
2. Auto-select the first upcoming World Cup match (earliest kickoff where `gameState === 1`)
3. Show a horizontal list of available matches (team names + kickoff time + status indicator)
4. User clicks a different match → update state, start polling the new match's snapshot
5. Poll `GET /api/snapshot?fixtureId=X&marketSlug=Y` every 3 seconds
6. If `marketSlug` is empty (no Polymarket market), poll `GET /api/snapshot?fixtureId=X` (no marketSlug param)
7. Store selected match in state (not localStorage — session only per spec)

**TxLINE-only mode (no Polymarket market):**
- When the selected match has `hasPolymarketMarket === false`:
  - Show TxLINE probability normally
  - Replace the Polymarket column with a "No Polymarket market" placeholder
  - Replace the gap section with "Gap monitoring disabled — no Polymarket market for this match"
  - Do NOT show alert states (no alert can fire without a Polymarket quote)
  - Do NOT suppress with an error — this is a valid state, not a failure

**Match picker styling:**
- Horizontal scrollable list of match buttons at the top
- Each button shows: "Home vs Away" + relative time ("Today 18:00" or "Tomorrow 16:00")
- Selected match highlighted with cobalt underline (matches the design system)
- Unselected matches at 50% opacity
- If no matches available: show "No upcoming World Cup fixtures" message

### Real API response shapes (observed)

#### TxLINE fixtures (`GET /api/fixtures/snapshot`)
```json
[
  {
    "Ts": 1784149200000,
    "StartTime": 1784408400000,
    "Competition": "World Cup",
    "CompetitionId": 72,
    "FixtureGroupId": 10115771,
    "Participant1Id": 1999,
    "Participant1": "France",
    "Participant2Id": 1888,
    "Participant2": "England",
    "FixtureId": 18257865,
    "Participant1IsHome": true,
    "GameState": 1
  }
]
```
- `StartTime` is a Unix timestamp in milliseconds
- `GameState`: 1 = scheduled, 6 = cancelled
- `Participant1IsHome` is the feed's home/away designation (not a venue guarantee for neutral matches)
- Fields are **PascalCase** in the API response. The TxLINE client (`lib/txline/client.ts`) already normalizes them to camelCase via `normalizeFixtureFields()`.

#### TxLINE odds (`GET /api/odds/snapshot/{fixtureId}`)
```json
[
  {
    "SuperOddsType": "1X2_PARTICIPANT_RESULT",
    "MarketPeriod": null,
    "PriceNames": ["part1", "draw", "part2"],
    "Prices": [...],
    "Pct": ["52.029", "23.397", "24.570"],
    "MessageId": "1838350041:00003:000750-10021-stab",
    "Ts": 1784390419652,
    "GameState": "1",
    "InRunning": false
  }
]
```
- `SuperOddsType: "1X2_PARTICIPANT_RESULT"` = regulation-time 1X2 (the normalize layer handles this)
- `MarketPeriod: null` or `undefined` = full match (NOT "regulation" — null means full match, `half=1` means first half)
- `PriceNames` are generic labels: `["part1", "draw", "part2"]` — NOT team names. Must cross-reference with fixture data to know which is home/away.
- `Pct` strings are percentages: `"52.029"` → probability `0.52029`
- Fields are **PascalCase** in the API response. The TxLINE client normalizes them via `normalizeOddsFields()`.

#### Polymarket events (`GET https://gamma-api.polymarket.com/events?slug={slug}`)
```json
[
  {
    "slug": "fifwc-eng-arg-2026-07-15",
    "title": "England vs. Argentina",
    "active": true,
    "closed": true,
    "negRisk": true,
    "markets": [
      {
        "slug": "fifwc-eng-arg-2026-07-15-eng",
        "question": "Will England win on 2026-07-15?",
        "outcomes": "[\"Yes\", \"No\"]",
        "clobTokenIds": "[\"629755...\", \"279800...\"]",
        "active": true,
        "closed": true,
        "acceptingOrders": false,
        "description": "England to win in the first 90 minutes plus stoppage time (excludes extra time)..."
      }
    ]
  }
]
```
- `outcomes` and `clobTokenIds` are **JSON strings** (not arrays) — must `JSON.parse()` them
- Token pairing is positional: `outcomes[0]` ↔ `clobTokenIds[0]`. Do NOT assume index 0 is YES.
- The `description` field contains the resolution wording (check for "regulation time" / "90 minutes" / "stoppage time")
- Polymarket currently has **no individual match markets** for upcoming World Cup fixtures. Only "World Cup Winner" futures exist. The match picker must handle this gracefully.

#### Polymarket CLOB book (`GET https://clob.polymarket.com/book?token_id={tokenId}`)
```json
{
  "market": "0x...",
  "asset_id": "...",
  "bids": [{"price": "0.38", "size": "100"}, ...],
  "asks": [{"price": "0.39", "size": "50"}, ...],
  "timestamp": "1700000000000"
}
```
- Best bid = max of all bid prices
- Best ask = min of all ask prices
- `timestamp` is a string (milliseconds) — parse to number
- If the market is closed, the endpoint returns `{"error": "No orderbook exists for the requested token id"}` — handle this as "book empty"

### Key files and their purposes

| File | Purpose | Modify? |
|---|---|---|
| `lib/types.ts` | All TypeScript types | Add `MatchEntry` |
| `lib/config.ts` | Config defaults (fixtureId, marketSlug, thresholds) | No (keep as defaults) |
| `lib/data/index.ts` | Provider factory | Modify (pass params) |
| `lib/data/real-provider.ts` | Real data orchestrator | Modify (accept params) |
| `lib/data/mock-provider.ts` | Mock data for testing | No |
| `lib/data/matches-provider.ts` | NEW: fetch + cross-reference matches | Create |
| `lib/txline/client.ts` | TxLINE API client | No (already supports arbitrary fixtureId) |
| `lib/txline/normalize.ts` | TxLINE normalization | No |
| `lib/txline/types.ts` | TxLINE types | No |
| `lib/polymarket/client.ts` | Polymarket API client | May need `searchSoccerEvents()` |
| `lib/polymarket/normalize.ts` | Polymarket normalization | No |
| `lib/polymarket/types.ts` | Polymarket types | No |
| `lib/contract/equivalence.ts` | Runtime contract checks | No |
| `lib/gap/engine.ts` | Gap calculation + alert logic | No (do not change the math) |
| `app/api/snapshot/route.ts` | Snapshot endpoint | Modify (accept query params) |
| `app/api/matches/route.ts` | NEW: matches list endpoint | Create |
| `app/page.tsx` | Dashboard | Modify (add match picker) |
| `app/activate/activate-client.tsx` | TxLINE activation page | No |
| `scripts/txline-activate.ts` | CLI activation script | No |
| `idl/txoracle.json` | Mainnet IDL | No |

### Design system tokens (from `app/globals.css`)

```
--color-surface: #faf7f2        (warm off-white background)
--color-on-surface: #1f1f1f     (charcoal text)
--color-on-surface-variant: #444748
--color-primary: #1e40af        (cobalt — gap value, active states only)
--color-outline-variant: #e5e7eb (hairline dividers)
--color-stale: #8a6d00
--color-alert: #b45309
--color-success: #15803d
--color-error: #ba1a1a
```

Fonts: Inter or Geist for UI, JetBrains Mono or Geist Mono for numerals.

### Critical constraints for the match picker

1. **Never claim the gap is arbitrage, guaranteed profit, or verified truth**
2. **Never hardcode fees, probabilities, or market mappings** — fetch everything dynamically
3. **Never compare non-equivalent contracts** — runtime equivalence checks are mandatory
4. **Fail closed** — if a match has no Polymarket market, suppress gap alerts (not an error, a valid state)
5. **Never suppress or fabricate alerts** — if data is stale or mismatched, suppress with a clear reason
6. **"Top-of-book quote"** — never describe the Polymarket quote as "executable" from Brazil
7. **No emojis in code** unless explicitly requested
8. **No comments in code** unless explicitly requested
9. **Do not change the gap engine math** in `lib/gap/engine.ts` — it's correct and tested
10. **Do not change the compliance text** in the footer disclaimers — they must remain verbatim

### Verification steps after building

```bash
# 1. Type check
npm run typecheck    # must pass with no errors

# 2. Lint
npm run lint         # must pass with no errors

# 3. Tests
npm run test         # all 143 tests must still pass

# 4. Mock mode still works
npm run dev          # dashboard loads, mock data renders
MOCK_SCENARIO=alert npm run dev   # alert scenario renders

# 5. Real data mode works
DATA_SOURCE=real npm run dev
# - Dashboard loads
# - /api/matches returns a list of World Cup fixtures
# - Match picker shows available matches
# - Auto-selects the next upcoming match (France vs England)
# - /api/snapshot?fixtureId=18257865 returns real TxLINE probability
# - Since no Polymarket market exists, dashboard shows "TxLINE only" mode
# - No false alerts fire

# 6. Manual test the match picker
# - Open http://localhost:3000
# - Verify match list appears at the top
# - Click a different match → dashboard switches to that match's data
# - Verify the selected match is highlighted
```

### What NOT to change

1. `lib/gap/engine.ts` — the deterministic calculation is correct and tested. Do not change the math.
2. `lib/contract/equivalence.ts` — runtime checks are correct. Do not weaken them.
3. The footer disclaimers in `app/page.tsx` — must remain verbatim:
   - "Read-only monitor. Not a trading bot. Not a settlement oracle. The consensus gap is not arbitrage, guaranteed profit, or verified truth."
   - "TxLINE proof verifies data provenance, not signal correctness."
4. `.env.local` — never commit, never paste credentials in chat
5. `keypair.json` — gitignored, never commit
6. `app/activate/activate-client.tsx` — the activation page works. Do not touch it.
7. `idl/txoracle.json` — the mainnet IDL. Do not touch.

### Commit convention

```bash
git add -A
git commit -m "add match picker ui and dynamic snapshot endpoint"
```

Lowercase, imperative, no prefix tokens. Never commit `.env.local` or `keypair.json`.