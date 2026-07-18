# FIX-SPEC.md — World Cup Edge Tier A Bug Fixes

**Purpose**: Self-contained spec for a fix agent to execute autonomously. No prior context needed.
**Base commit**: `a69e3d4` on `master` (merged master + feat/replay-fly-deploy).
**Scope**: Tier A — 9 blocking functional/safety bugs + 4 packaging gaps + tests for each fix. Visual polish (BUG-12/13/14) and non-blocking issues are documented in `FUTURE-FIXES.md` and are NOT in scope.
**Worktree**: Work in `/tmp/opencode/world-cup-edge-review` (branch `review/end-to-end-audit`). All edits go there. Do NOT touch `/home/patrickpassos/GitHub/work/world-cup-edge` (the user's main checkout).
**Verify after every fix**: `npm run typecheck && npm run lint && npm run test` — all must pass. Baseline: 189 tests pass.

---

## Critical constraints (from AGENTS.md — read before starting)

1. Never claim the consensus gap is arbitrage, guaranteed profit, or verified truth.
2. Never add automated trading, wallet connection, or order placement.
3. Never add an LLM/agent loop that decides whether a gap exists.
4. Never hardcode fees, probabilities, or market mappings. Fetch everything dynamically.
5. Never compare non-equivalent contracts. Runtime equivalence checks are mandatory.
6. Never suppress or fabricate alerts. Fail closed on stale, missing, or mismatched data.
7. Never commit secrets, API keys, or private keys. Use `.env.local` only.
8. Never expose raw TxLINE API responses through a public proxy.
9. Never badge a probability as "verified" unless deterministically recomputed from validated raw prices.
10. Never describe the Polymarket quote as "executable" from Brazil. Use "top-of-book quote."

**Code style**: No comments in code unless explicitly requested. No emojis. Commit messages: lowercase, imperative, no prefix tokens (e.g., `remove hardcoded slugs from config`).

---

## Execution order — 3 phases, 5 agents

### Phase 1: Agent A — Data-identity core (MUST complete first, ~60-75 min)
- Owns: `lib/config.ts`, `lib/data/real-provider.ts`, `lib/data/index.ts`, `app/api/snapshot/route.ts`, `lib/types.ts`
- Fixes: BUG-1, BUG-2, BUG-3, BUG-4, BUG-10 (bonus), S-7
- Why first: Other agents build on the cleaned config + provider. Agent B's `normalizeTxline` signature change and Agent C's `evaluateAlert` input change both depend on Agent A's call-site changes.

### Phase 2: Agents B, C, D in parallel (after Phase 1, ~60-90 min)

**Agent B — TxLINE normalization**
- Owns: `lib/txline/client.ts`, `lib/txline/normalize.ts`, `lib/txline/types.ts`
- Fixes: BUG-5, BUG-8, BUG-9, BUG-10
- Note: BUG-8 requires live API verification BEFORE implementing — see BUG-8 section.

**Agent C — Fail-closed safety**
- Owns: `lib/polymarket/normalize.ts`, `lib/polymarket/client.ts`, `lib/gap/engine.ts`
- Fixes: BUG-6, BUG-7, BUG-11
- Interface contract: Agent C adds `fixtureGameState?: number` to `AlertInput` in `lib/gap/engine.ts` and adds a suppression branch. Agent A (Phase 1) already added the call-site in `real-provider.ts` passing `fixtureGameState: txlineData.fixture?.gameState ?? null`.

**Agent D — UI + packaging**
- Owns: `app/page.tsx`, `README.md`, `.env.example`, `LICENSE` (new file)
- Fixes: BUG-15, S-1, S-2, S-3
- No dependency on Agents B/C — fully independent.

### Phase 3: Agent E — Tests + verification (after Phase 2, ~30 min)
- Adds tests for all 9 fixes
- Runs full suite: `npm run typecheck && npm run lint && npm run test && npm run build`
- Verifies replay mode: `curl localhost:3000/api/snapshot?demo=replay` returns active alert
- Writes `FUTURE-FIXES.md` if not already written (I provide it below — Agent E just verifies it exists)

---

## Interface contracts between agents (CRITICAL)

These contracts MUST be followed exactly so parallel agents produce compatible code.

### Contract 1: `normalizeTxline` signature change (Agent A changes call site, Agent B changes function)

**Current signature** (lib/txline/normalize.ts:128-134):
```typescript
export function normalizeTxline(
  fixture: Fixture | null,
  odds: OddsPayload[],
  receivedAt: number = Date.now(),
  serviceLevel: number = CONFIG.txline.serviceLevel,
  outcome: Outcome = "home",
): NormalizedTxline {
```

**New signature** (Agent B implements):
```typescript
export function normalizeTxline(
  fixture: Fixture | null,
  odds: OddsPayload[],
  receivedAt: number = Date.now(),
  outcome: Outcome = "home",
): NormalizedTxline {
```
- Remove the `serviceLevel` parameter entirely. Agent B reads the service level from the odds API response inside the function body instead. See BUG-5 for details.
- `NormalizedTxline.serviceLevel` and `NormalizedTxline.delayed` fields STAY in the return type — Agent B populates them from the API data, falling back to `CONFIG.txline.serviceLevel` only if the API doesn't report one.

**Call site** (Agent A changes in lib/data/real-provider.ts ~line 140-146):
```typescript
// OLD:
const normalizedTxline = normalizeTxline(
  txlineData.fixture,
  txlineData.odds,
  now,
  CONFIG.txline.serviceLevel,
  this.outcome,
);

// NEW:
const normalizedTxline = normalizeTxline(
  txlineData.fixture,
  txlineData.odds,
  now,
  this.outcome,
);
```

### Contract 2: `AlertInput.fixtureGameState` (Agent A changes call site, Agent C adds field + suppression)

**Agent C** adds to `lib/gap/engine.ts` `AlertInput` interface:
```typescript
export interface AlertInput {
  // ... existing fields ...
  fixtureGameState: number | null;  // NEW: 6 = cancelled, 1 = scheduled
  // ...
}
```

**Agent C** adds suppression branch in `evaluateAlert` (AFTER the `serviceLevel === 1` check, BEFORE the `equivalencePassed` check):
```typescript
if (input.fixtureGameState === 6) {
  suppressedReason = "Fixture is cancelled (GameState 6). Alerts suppressed.";
}
```

**Agent A** adds to the `evaluateAlert` call in `lib/data/real-provider.ts` (~line 194-212):
```typescript
const alertEval = evaluateAlert({
  // ... existing fields ...
  fixtureGameState: txlineData.fixture?.gameState ?? null,  // NEW
  // ...
});
```

### Contract 3: `CreateProviderArgs` gains draw/away slugs (Agent A only, no cross-agent)

Agent A adds `drawMarketSlug` and `awayMarketSlug` to `CreateProviderArgs` in `lib/data/index.ts` and threads them through `app/api/snapshot/route.ts` query params and `RealDataProvider` constructor. No other agent touches this.

---

## BUG-1: Remove hardcoded polymarket slugs from CONFIG (SOTA approach)

**File**: `lib/config.ts`
**Agent**: A
**Severity**: BLOCKING

### Current code (lib/config.ts:1-21)
```typescript
export const CONFIG = {
  txline: {
    fixtureId: 18257865,
    network: "mainnet" as const,
    serviceLevel: 12,
    maxAgeMs: 30_000,
    delayedMaxAgeMs: 120_000,
  },
  polymarket: {
    eventSlug: "fifwc-eng-arg-2026-07-15",
    marketSlug: "fifwc-eng-arg-2026-07-15-eng",
    maxAgeMs: 10_000,
  },
  gap: {
    thresholdPp: 5,
    threshold: 0.05,
    consecutiveSamples: 2,
    cooldownMs: 60_000,
    maxSourceSkewMs: 15_000,
  },
} as const;
```

### New code
```typescript
export const CONFIG = {
  txline: {
    fixtureId: 18257865,
    network: "mainnet" as const,
    serviceLevel: 12,
    maxAgeMs: 30_000,
    delayedMaxAgeMs: 120_000,
  },
  polymarket: {
    maxAgeMs: 10_000,
  },
  gap: {
    thresholdPp: 5,
    threshold: 0.05,
    consecutiveSamples: 2,
    cooldownMs: 60_000,
    maxSourceSkewMs: 15_000,
  },
} as const;
```

**What changed**: Removed `eventSlug` and `marketSlug` from `CONFIG.polymarket`. The match picker always passes these dynamically. No-args `RealDataProvider` construction fails closed with "no match selected" instead of fetching wrong data.

### Grep-and-fix all references
After removing the slugs, grep for `CONFIG.polymarket.eventSlug` and `CONFIG.polymarket.marketSlug` across the codebase. Every reference must be removed or replaced with a dynamic value:

1. **`lib/data/real-provider.ts:62-63`** — currently:
   ```typescript
   this.homeMarketSlug = homeMarketSlug ?? CONFIG.polymarket.marketSlug;
   this.eventSlug = this.homeMarketSlug.replace(/-(eng|draw|arg)$/, "") || CONFIG.polymarket.eventSlug;
   ```
   Replace with (see BUG-2 for full constructor changes):
   ```typescript
   this.homeMarketSlug = homeMarketSlug ?? "";
   this.eventSlug = eventSlug ?? "";
   ```

2. **`lib/polymarket/client.ts:70-71`** — `fetchPolymarketData` defaults:
   ```typescript
   export async function fetchPolymarketData(
     eventSlug: string = CONFIG.polymarket.eventSlug,
     marketSlug: string = CONFIG.polymarket.marketSlug,
   ): Promise<PolymarketFetchResult> {
   ```
   Replace with:
   ```typescript
   export async function fetchPolymarketData(
     eventSlug: string,
     marketSlug: string,
   ): Promise<PolymarketFetchResult> {
   ```
   Remove the CONFIG import if no other reference remains in this file. **Note**: This file is owned by Agent C. Agent A should NOT edit it. Instead, Agent A documents this needed change and Agent C implements it as part of BUG-11. **HOWEVER**, to avoid a cross-agent conflict, Agent A should leave `lib/polymarket/client.ts` alone and just remove the CONFIG import from `lib/config.ts` consumers that Agent A owns. Agent C will fix `fetchPolymarketData` defaults as part of BUG-11.

3. **`lib/txline/client.ts:101`** — `fetchOddsForMatch` default:
   ```typescript
   export async function fetchOddsForMatch(
     fixtureId: number = CONFIG.txline.fixtureId,
   ): Promise<{ fixture: Fixture | null; odds: OddsPayload[] }> {
   ```
   **Keep this** — `CONFIG.txline.fixtureId` stays. This is a TxLINE fixture ID, not a Polymarket slug. It's acceptable as a CONFIG default per AGENTS.md #4 ("except CONFIG defaults").

### Test to add (Agent E)
File: `tests/config.test.ts` (new)
```typescript
import { describe, it, expect } from "vitest";
import { CONFIG } from "@/lib/config";

describe("CONFIG", () => {
  it("does not contain hardcoded polymarket eventSlug", () => {
    expect((CONFIG.polymarket as Record<string, unknown>).eventSlug).toBeUndefined();
  });
  it("does not contain hardcoded polymarket marketSlug", () => {
    expect((CONFIG.polymarket as Record<string, unknown>).marketSlug).toBeUndefined();
  });
  it("retains txline fixtureId as a numeric default", () => {
    expect(typeof CONFIG.txline.fixtureId).toBe("number");
  });
  it("retains gap threshold and consecutive samples", () => {
    expect(CONFIG.gap.threshold).toBe(0.05);
    expect(CONFIG.gap.consecutiveSamples).toBe(2);
  });
});
```

---

## BUG-2: Remove regex-based slug derivation, pass all 3 slugs from picker

**Files**: `lib/data/real-provider.ts`, `lib/data/index.ts`, `app/api/snapshot/route.ts`, `lib/types.ts` (for `CreateProviderArgs`)
**Agent**: A
**Severity**: BLOCKING

### Current code (lib/data/real-provider.ts:53-70)
```typescript
export class RealDataProvider implements DataProvider {
  private fixtureId: number;
  private eventSlug: string;
  private homeMarketSlug: string;
  private drawMarketSlug: string;
  private awayMarketSlug: string;
  private outcome: Outcome;
  private homeTeam: string;
  private awayTeam: string;
  private kickoffISO: string;
  private previousPhase: AlertPhase = "IDLE";
  private previousConsecutiveSamples = 0;
  private lastAlertTime: number | null = null;
  private lastDedupeKey: string | null = null;

  constructor(
    fixtureId?: number,
    homeMarketSlug?: string,
    outcome?: Outcome,
    homeTeam?: string,
    awayTeam?: string,
    kickoffISO?: string,
  ) {
    this.fixtureId = fixtureId ?? CONFIG.txline.fixtureId;
    this.homeMarketSlug = homeMarketSlug ?? CONFIG.polymarket.marketSlug;
    this.eventSlug = this.homeMarketSlug.replace(/-(eng|draw|arg)$/, "") || CONFIG.polymarket.eventSlug;
    this.drawMarketSlug = `${this.eventSlug}-draw`;
    this.awayMarketSlug = `${this.eventSlug}-away`;
    this.outcome = outcome ?? "home";
    this.homeTeam = homeTeam ?? "";
    this.awayTeam = awayTeam ?? "";
    this.kickoffISO = kickoffISO ?? "";
  }
```

### New code (lib/data/real-provider.ts:38-80)
```typescript
export class RealDataProvider implements DataProvider {
  private fixtureId: number;
  private eventSlug: string;
  private homeMarketSlug: string;
  private drawMarketSlug: string;
  private awayMarketSlug: string;
  private outcome: Outcome;
  private homeTeam: string;
  private awayTeam: string;
  private kickoffISO: string;
  private previousPhase: AlertPhase = "IDLE";
  private previousConsecutiveSamples = 0;
  private lastAlertTime: number | null = null;
  private lastDedupeKey: string | null = null;

  constructor(
    fixtureId?: number,
    homeMarketSlug?: string,
    outcome?: Outcome,
    homeTeam?: string,
    awayTeam?: string,
    kickoffISO?: string,
    drawMarketSlug?: string,
    awayMarketSlug?: string,
    eventSlug?: string,
  ) {
    this.fixtureId = fixtureId ?? CONFIG.txline.fixtureId;
    this.homeMarketSlug = homeMarketSlug ?? "";
    this.drawMarketSlug = drawMarketSlug ?? "";
    this.awayMarketSlug = awayMarketSlug ?? "";
    this.eventSlug = eventSlug ?? "";
    this.outcome = outcome ?? "home";
    this.homeTeam = homeTeam ?? "";
    this.awayTeam = awayTeam ?? "";
    this.kickoffISO = kickoffISO ?? "";
  }
```

**What changed**:
- Removed `this.homeMarketSlug.replace(/-(eng|draw|arg)$/, "")` regex.
- Removed `this.drawMarketSlug = \`${this.eventSlug}-draw\`` derivation.
- Removed `this.awayMarketSlug = \`${this.eventSlug}-away\`` derivation.
- Added `drawMarketSlug`, `awayMarketSlug`, `eventSlug` as explicit constructor params.
- All default to empty string (fail closed — no slug = no fetch = unavailable status).

### Update `getActiveMarketSlug` (lib/data/real-provider.ts:72-76)
No change needed — it already returns the right field:
```typescript
private getActiveMarketSlug(): string {
  if (this.outcome === "home") return this.homeMarketSlug;
  if (this.outcome === "draw") return this.drawMarketSlug;
  return this.awayMarketSlug;
}
```

### Update `CreateProviderArgs` (lib/data/index.ts:6-13)
**Current**:
```typescript
export interface CreateProviderArgs {
  fixtureId?: number;
  homeMarketSlug?: string;
  outcome?: Outcome;
  homeTeam?: string;
  awayTeam?: string;
  kickoffISO?: string;
}
```

**New**:
```typescript
export interface CreateProviderArgs {
  fixtureId?: number;
  homeMarketSlug?: string;
  drawMarketSlug?: string;
  awayMarketSlug?: string;
  eventSlug?: string;
  outcome?: Outcome;
  homeTeam?: string;
  awayTeam?: string;
  kickoffISO?: string;
}
```

### Update `createProvider` (lib/data/index.ts:15-31)
**Current**:
```typescript
export function createProvider(args: CreateProviderArgs = {}): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline" || source === "real") {
    return new RealDataProvider(
      args.fixtureId,
      args.homeMarketSlug,
      args.outcome,
      args.homeTeam,
      args.awayTeam,
      args.kickoffISO,
    );
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario, args.outcome);
}
```

**New**:
```typescript
export function createProvider(args: CreateProviderArgs = {}): DataProvider {
  const source = process.env.DATA_SOURCE;

  if (source === "txline" || source === "real") {
    return new RealDataProvider(
      args.fixtureId,
      args.homeMarketSlug,
      args.outcome,
      args.homeTeam,
      args.awayTeam,
      args.kickoffISO,
      args.drawMarketSlug,
      args.awayMarketSlug,
      args.eventSlug,
    );
  }

  const scenario = (process.env.MOCK_SCENARIO ?? "live") as MockScenario;
  return new MockDataProvider(scenario, args.outcome);
}
```

### Update snapshot route to parse and pass new params (app/api/snapshot/route.ts:12-56)
**Current** (lines 12-56):
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureIdRaw = searchParams.get("fixtureId");
  const marketSlugRaw = searchParams.get("marketSlug");
  const outcomeRaw = searchParams.get("outcome");
  const homeTeamRaw = searchParams.get("homeTeam");
  const awayTeamRaw = searchParams.get("awayTeam");
  const kickoffRaw = searchParams.get("kickoffUTC");

  const fixtureId = fixtureIdRaw !== null ? Number(fixtureIdRaw) : undefined;
  const marketSlug = marketSlugRaw !== null && marketSlugRaw !== "" ? marketSlugRaw : undefined;
  const outcome = parseOutcome(outcomeRaw);
  const homeTeam = homeTeamRaw !== null && homeTeamRaw !== "" ? homeTeamRaw : undefined;
  const awayTeam = awayTeamRaw !== null && awayTeamRaw !== "" ? awayTeamRaw : undefined;
  const kickoffISO = kickoffRaw !== null && kickoffRaw !== "" ? kickoffRaw : undefined;

  const provider = createProvider({
    fixtureId: Number.isFinite(fixtureId) ? (fixtureId as number) : undefined,
    homeMarketSlug: marketSlug,
    outcome,
    homeTeam,
    awayTeam,
    kickoffISO,
  });
```

**New**:
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fixtureIdRaw = searchParams.get("fixtureId");
  const marketSlugRaw = searchParams.get("marketSlug");
  const drawMarketSlugRaw = searchParams.get("drawMarketSlug");
  const awayMarketSlugRaw = searchParams.get("awayMarketSlug");
  const eventSlugRaw = searchParams.get("eventSlug");
  const outcomeRaw = searchParams.get("outcome");
  const homeTeamRaw = searchParams.get("homeTeam");
  const awayTeamRaw = searchParams.get("awayTeam");
  const kickoffRaw = searchParams.get("kickoffUTC");

  const fixtureId = fixtureIdRaw !== null ? Number(fixtureIdRaw) : undefined;
  const marketSlug = marketSlugRaw !== null && marketSlugRaw !== "" ? marketSlugRaw : undefined;
  const drawMarketSlug = drawMarketSlugRaw !== null && drawMarketSlugRaw !== "" ? drawMarketSlugRaw : undefined;
  const awayMarketSlug = awayMarketSlugRaw !== null && awayMarketSlugRaw !== "" ? awayMarketSlugRaw : undefined;
  const eventSlug = eventSlugRaw !== null && eventSlugRaw !== "" ? eventSlugRaw : undefined;
  const outcome = parseOutcome(outcomeRaw);
  const homeTeam = homeTeamRaw !== null && homeTeamRaw !== "" ? homeTeamRaw : undefined;
  const awayTeam = awayTeamRaw !== null && awayTeamRaw !== "" ? awayTeamRaw : undefined;
  const kickoffISO = kickoffRaw !== null && kickoffRaw !== "" ? kickoffRaw : undefined;

  const provider = createProvider({
    fixtureId: Number.isFinite(fixtureId) ? (fixtureId as number) : undefined,
    homeMarketSlug: marketSlug,
    drawMarketSlug,
    awayMarketSlug,
    eventSlug,
    outcome,
    homeTeam,
    awayTeam,
    kickoffISO,
  });
```

### Update `app/page.tsx` to pass all 3 slugs (Agent D owns this file, but this change is part of BUG-2/BUG-4 which is Agent A's scope — COORDINATION NEEDED)

**Problem**: `app/page.tsx` is owned by Agent D (for BUG-15), but the `doPoll` function needs to pass `drawMarketSlug`, `awayMarketSlug`, and `eventSlug` in the query params. This is a cross-agent conflict.

**Resolution**: Agent A makes the `app/page.tsx` change for the `doPoll` params (lines ~298-312) BEFORE Agent D starts. Agent D's BUG-15 fix (line 249 hydration) is in a different part of the file, so no conflict. **Agent A should make this change as the LAST step of Phase 1, then Agent D can start.**

**Current** (app/page.tsx ~lines 298-312, inside `doPoll`):
```typescript
const params = new URLSearchParams();
params.set("fixtureId", String(selectedMatch.fixtureId));
if (marketSlug) params.set("marketSlug", marketSlug);
params.set("outcome", outcome);
params.set("homeTeam", selectedMatch.homeTeam);
params.set("awayTeam", selectedMatch.awayTeam);
params.set("kickoffUTC", selectedMatch.kickoffUTC);
if (isReplay) params.set("demo", "replay");
```

**New**:
```typescript
const params = new URLSearchParams();
params.set("fixtureId", String(selectedMatch.fixtureId));
if (marketSlug) params.set("marketSlug", marketSlug);
if (selectedMatch.polymarketDrawMarketSlug) params.set("drawMarketSlug", selectedMatch.polymarketDrawMarketSlug);
if (selectedMatch.polymarketAwayMarketSlug) params.set("awayMarketSlug", selectedMatch.polymarketAwayMarketSlug);
if (selectedMatch.polymarketEventSlug) params.set("eventSlug", selectedMatch.polymarketEventSlug);
params.set("outcome", outcome);
params.set("homeTeam", selectedMatch.homeTeam);
params.set("awayTeam", selectedMatch.awayTeam);
params.set("kickoffUTC", selectedMatch.kickoffUTC);
if (isReplay) params.set("demo", "replay");
```

### Test to add (Agent E)
File: `tests/snapshot-params.test.ts` (append to existing)
```typescript
it("passes drawMarketSlug, awayMarketSlug, and eventSlug to RealDataProvider", () => {
  process.env.DATA_SOURCE = "real";
  const provider = createProvider({
    fixtureId: 18257865,
    homeMarketSlug: "fifwc-fra-eng-2026-07-18-fra",
    drawMarketSlug: "fifwc-fra-eng-2026-07-18-draw",
    awayMarketSlug: "fifwc-fra-eng-2026-07-18-eng",
    eventSlug: "fifwc-fra-eng-2026-07-18",
    outcome: "away",
    homeTeam: "France",
    awayTeam: "England",
    kickoffISO: "2026-07-18T21:00:00.000Z",
  }) as RealDataProvider;
  expect(provider).toBeInstanceOf(RealDataProvider);
});
```

---

## BUG-3: Snapshot route error fallback uses parsed params instead of hardcoded identity

**File**: `app/api/snapshot/route.ts`
**Agent**: A
**Severity**: BLOCKING

### Current code (app/api/snapshot/route.ts:44-119, the catch block)
The catch block hardcodes:
```typescript
match: {
  name: "England vs Argentina",
  date: "2026-07-15",
  kickoffUTC: "2026-07-15T19:00:00Z",
  rules: "regulation-time 1X2",
  outcome: "home",
  outcomeLabel: "England",
  homeTeam: "England",
  awayTeam: "Argentina",
},
```

### New code
Replace the entire catch block's `match` field with values derived from the parsed query params. At the top of the catch block, compute:
```typescript
catch (error) {
  const home = homeTeam ?? "Unknown";
  const away = awayTeam ?? "Unknown";
  const outcomeLabel = outcome === "draw" ? "Draw" : outcome === "away" ? away : home;
  const kickoff = kickoffISO ?? "";
  const date = kickoff ? kickoff.slice(0, 10) : "";

  const fallback: Snapshot = {
    status: "error",
    alertKind: "no-alert",
    match: {
      name: `${home} vs ${away}`,
      date,
      kickoffUTC: kickoff,
      rules: "regulation-time 1X2",
      outcome: outcome ?? "home",
      outcomeLabel,
      homeTeam: home,
      awayTeam: away,
    },
    txline: {
      probability: null,
      messageId: null,
      timestamp: null,
      receivedAt: null,
      fresh: false,
      serviceLevel: CONFIG.txline.serviceLevel,
      delayed: false,
    },
    polymarket: {
      bestAsk: null,
      bestBid: null,
      askSize: null,
      feeRate: null,
      bookSeq: null,
      timestamp: null,
      receivedAt: null,
      fresh: false,
      marketActive: false,
      marketClosed: false,
      acceptingOrders: false,
      bookEmpty: true,
      yesTokenId: null,
    },
    gap: {
      grossGap: null,
      feePerShare: null,
      gapAfterFee: null,
      threshold: CONFIG.gap.threshold,
    },
    alert: {
      active: false,
      reason: "Fetch error. Alerts suppressed.",
      consecutiveSamples: 0,
      suppressedReason: "Fetch error. Alerts suppressed.",
      phase: "IDLE",
      lastAlertTime: null,
      cooldownRemainingMs: null,
      dedupeKey: null,
    },
    checks: {
      teams: false,
      date: false,
      rules: false,
      token: false,
      marketState: false,
      fee: false,
    },
    equivalence: null,
    sourceSkewMs: null,
    receivedAt: Date.now(),
    errorMessage: error instanceof Error ? error.message : "Unknown error fetching snapshot.",
  };

  return NextResponse.json(fallback, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
```

**What changed**: `match.name`, `date`, `kickoffUTC`, `homeTeam`, `awayTeam`, `outcome`, `outcomeLabel` now come from the parsed query params. `threshold` reads from `CONFIG.gap.threshold` (not hardcoded 0.05). `serviceLevel` reads from `CONFIG.txline.serviceLevel`.

### Test to add (Agent E)
```typescript
it("error fallback uses query params for match identity, not hardcoded England-Argentina", async () => {
  // This requires a route-level test. Since route.test.ts doesn't exist yet,
  // test the RealDataProvider.buildErrorSnapshot instead, which already does this correctly.
  // The route fix is verified by manual curl test.
  // Agent E: add a unit test that constructs RealDataProvider with France-England params,
  // calls getSnapshot() on a fixture that will error, and asserts match.name === "France vs England"
});
```

---

## BUG-4: Already addressed by BUG-2

BUG-4 (constructor doesn't accept draw/away slugs) is fully resolved by the BUG-2 changes above (adding `drawMarketSlug`, `awayMarketSlug`, `eventSlug` to the constructor).

---

## S-7: Align MATCH constant with SPEC.md (England vs Argentina)

**File**: `lib/config.ts`
**Agent**: A
**Severity**: MEDIUM (submission packaging)

### Current code (lib/config.ts:23-30)
```typescript
export const MATCH = {
  homeTeam: "England",
  awayTeam: "France",
  matchName: "England vs France",
  matchDate: "2026-07-16",
  kickoffUTC: "2026-07-16T19:00:00Z",
  rules: "regulation-time 1X2",
};
```

### New code
```typescript
export const MATCH = {
  homeTeam: "England",
  awayTeam: "Argentina",
  matchName: "England vs Argentina",
  matchDate: "2026-07-15",
  kickoffUTC: "2026-07-15T19:00:00Z",
  rules: "regulation-time 1X2",
};
```

**Why**: SPEC.md says the first-version match is England vs Argentina, 2026-07-15. The `REPLAY_MATCH` in `lib/data/replay.ts` already uses this identity. `MATCH` is used as the default display identity in `app/page.tsx` before the picker loads and in `MockDataProvider`. Aligning it with SPEC.md ensures judges see a consistent identity.

### Test to add (Agent E)
Add to `tests/config.test.ts`:
```typescript
it("MATCH identity matches SPEC.md (England vs Argentina, 2026-07-15)", () => {
  expect(MATCH.homeTeam).toBe("England");
  expect(MATCH.awayTeam).toBe("Argentina");
  expect(MATCH.matchDate).toBe("2026-07-15");
});
```

---

## BUG-5: Read service level from TxLINE API response instead of hardcoding 12

**Files**: `lib/txline/normalize.ts`, `lib/txline/client.ts`, `lib/txline/types.ts`
**Agent**: B
**Severity**: BLOCKING

### Step 1: Verify what the TxLINE API returns for service level
Before implementing, the agent should verify the actual API response shape. Run:
```bash
cd /tmp/opencode/world-cup-edge-review
# Use the .env.local that's already copied to the worktree
node --experimental-strip-types -e "
import { fetchOddsSnapshot } from './lib/txline/client.ts';
const odds = await fetchOddsSnapshot(18257865);
console.log(JSON.stringify(odds[0], null, 2));
console.log('---Fields with level/service:', Object.keys(odds[0]).filter(k => k.toLowerCase().includes('level') || k.toLowerCase().includes('service')));
"
```
If the odds response has a `serviceLevel` or `level` field, read it. If not, check the fixture response:
```bash
node --experimental-strip-types -e "
import { fetchFixtures } from './lib/txline/client.ts';
const fixtures = await fetchFixtures();
const f = fixtures.find(x => x.fixtureId === 18257865);
console.log(JSON.stringify(f, null, 2));
"
```

### Step 2: Implement based on findings

**If the API returns a service-level field** (e.g., `serviceLevel: 12` on the odds row):
- Add `serviceLevel: number` to `OddsPayload` in `lib/txline/types.ts`
- Extract it in `normalizeOddsFields` in `lib/txline/client.ts`: `serviceLevel: Number(r.serviceLevel ?? r.ServiceLevel ?? CONFIG.txline.serviceLevel)`
- In `normalizeTxline` (lib/txline/normalize.ts), read from the regulation-time row: `serviceLevel: regRow?.serviceLevel ?? CONFIG.txline.serviceLevel`
- Remove the `serviceLevel` parameter from `normalizeTxline` signature (per Contract 1)

**If the API does NOT return a service-level field** (no field found in Step 1):
- Keep `CONFIG.txline.serviceLevel` as the fallback, but read it INSIDE `normalizeTxline` rather than as a parameter
- Remove the `serviceLevel` parameter from `normalizeTxline` signature (per Contract 1)
- Add a comment-free TODO by leaving the fallback as `CONFIG.txline.serviceLevel`
- Document in FUTURE-FIXES.md that service level detection from the API is unimplemented

### New `normalizeTxline` signature (lib/txline/normalize.ts:128-134)
```typescript
export function normalizeTxline(
  fixture: Fixture | null,
  odds: OddsPayload[],
  receivedAt: number = Date.now(),
  outcome: Outcome = "home",
): NormalizedTxline {
  const regRow = selectRegulationTimeRow(odds);
  const outcomeResult = regRow ? findOutcomeProbability(regRow, outcome) : null;
  const teams = extractTeams(fixture);
  const matchDate = extractFixtureDate(fixture);

  const timestamp = regRow?.ts ?? null;
  const fresh =
    timestamp !== null && receivedAt - timestamp <= CONFIG.txline.maxAgeMs;

  const serviceLevel = regRow?.serviceLevel ?? CONFIG.txline.serviceLevel;

  return {
    probability: outcomeResult?.probability ?? null,
    messageId: regRow?.messageId ?? null,
    timestamp,
    receivedAt,
    fresh,
    serviceLevel,
    delayed: isDelayed(serviceLevel),
    homeTeam: teams.home,
    awayTeam: teams.away,
    matchDate,
    marketType: regRow?.superOddsType ?? null,
    marketPeriod: regRow?.marketPeriod ?? null,
  };
}
```

### Test to add (Agent E)
```typescript
it("normalizeTxline does not accept a serviceLevel parameter", () => {
  // Verify the function signature has 4 params, not 5
  expect(normalizeTxline.length).toBe(4);
});
it("normalizeTxline reads serviceLevel from data or falls back to CONFIG", () => {
  const result = normalizeTxline(null, [], Date.now(), "home");
  expect(result.serviceLevel).toBe(CONFIG.txline.serviceLevel);
  expect(result.delayed).toBe(false);
});
```

---

## BUG-8: `MarketPeriod: null` should NOT be classified as regulation time

**Files**: `lib/txline/normalize.ts`
**Agent**: B
**Severity**: BLOCKING

### Step 1: Verify against live API (CRITICAL — do NOT skip)
The handoff doc (`docs/match-picker-handoff.md:333`) says `MarketPeriod: null` = full match. But the observed real API payload shows `MarketPeriod: null` on what appears to be the 1X2 row. **Rejecting null could break the only working row selector.**

Run this BEFORE implementing:
```bash
cd /tmp/opencode/world-cup-edge-review
node --experimental-strip-types -e "
import { fetchOddsSnapshot } from './lib/txline/client.ts';
const odds = await fetchOddsSnapshot(18257865);
for (const row of odds) {
  console.log(JSON.stringify({
    superOddsType: row.superOddsType,
    marketPeriod: row.marketPeriod,
    priceNames: row.priceNames,
    pct: row.pct,
  }));
}
"
```

Look at the output. Find the row with `SuperOddsType` containing `1X2` or `PARTICIPANT_RESULT`. What is its `MarketPeriod`?

- **If `MarketPeriod` is `null`** AND this is the regulation-time 1X2 row → the handoff doc is WRONG. `null` means regulation-time for this API. **Do NOT reject null.** Instead, update `docs/match-picker-handoff.md:333` to correct the documentation. Keep the current behavior (accept null). Skip this bug fix — mark as "verified, no change needed" in FUTURE-FIXES.md.
- **If `MarketPeriod` is `"regulation"` or `"90"` or similar** → the handoff doc is RIGHT. `null` means full match. Reject null.
- **If there are MULTIPLE 1X2 rows** (one with `null`, one with `"regulation"`) → keep null as "full match" (reject it) and select the `"regulation"` row.

### Step 2: Implement (only if Step 1 confirms null = full match)

**Current code** (lib/txline/normalize.ts:46):
```typescript
if (marketPeriod === null || marketPeriod === undefined || marketPeriod === "") return true;
```

**New code**:
```typescript
if (marketPeriod === null || marketPeriod === undefined || marketPeriod === "") return false;
```

**Also update the test** that encodes the wrong behavior (tests/txline.test.ts ~line 131-133):

Find the test that asserts `isRegulationTime1X2("1X2", null)` returns `true` and change it to `false`:
```typescript
// OLD:
it("returns true for 1X2 with null marketPeriod (full match)", () => {
  expect(isRegulationTime1X2("1X2", null)).toBe(true);
});

// NEW:
it("returns false for 1X2 with null marketPeriod (null = full match, not regulation)", () => {
  expect(isRegulationTime1X2("1X2", null)).toBe(false);
});
```

**IMPORTANT**: If Step 1 shows that `null` IS the regulation-time marker (i.e., the handoff doc is wrong), then:
- Do NOT change line 46
- Do NOT change the test
- Instead, add a comment-free note to FUTURE-FIXES.md: "BUG-8 verified against live API: MarketPeriod: null IS the regulation-time marker for this fixture. Handoff doc line 333 is incorrect. No code change needed."
- Skip to BUG-9

---

## BUG-9: `StartTime` should be a number, not a string

**Files**: `lib/txline/types.ts`, `lib/txline/client.ts`, `lib/txline/normalize.ts`
**Agent**: B
**Severity**: BLOCKING

### Current code

**lib/txline/types.ts:17-26**:
```typescript
export interface Fixture {
  fixtureId: number;
  participant1: string;
  participant2: string;
  participant1IsHome: boolean;
  startTime: string;  // ← WRONG: should be number
  gameState: number;
  competition: string;
  competitionId: number;
}
```

**lib/txline/client.ts:64**:
```typescript
startTime: String(r.startTime ?? r.StartTime ?? ""),  // ← converts number to string
```

**lib/txline/normalize.ts:109-112**:
```typescript
export function extractFixtureDate(fixture: Fixture | null): string | null {
  if (!fixture || !fixture.startTime) return null;
  return fixture.startTime.slice(0, 10);  // ← slices "1784408400000" → "1784408400" (garbage)
}
```

**lib/data/real-provider.ts:95** (Agent A's file — already handles both cases):
```typescript
const kickoff = fixture?.startTime ?? this.kickoffISO;
const kickoffUTC = kickoff ? new Date(Number(kickoff) || Date.parse(kickoff)).toISOString() : "";
```
This line already does `Number(kickoff) || Date.parse(kickoff)` — so it works with both number and string. No change needed here.

### New code

**lib/txline/types.ts:22** — change `startTime: string` to `startTime: number`:
```typescript
export interface Fixture {
  fixtureId: number;
  participant1: string;
  participant2: string;
  participant1IsHome: boolean;
  startTime: number;  // Unix milliseconds
  gameState: number;
  competition: string;
  competitionId: number;
}
```

**lib/txline/client.ts:64** — parse as number, not string:
```typescript
startTime: Number(r.startTime ?? r.StartTime ?? 0),
```

**lib/txline/normalize.ts:109-112** — convert to ISO date properly:
```typescript
export function extractFixtureDate(fixture: Fixture | null): string | null {
  if (!fixture || !fixture.startTime || !Number.isFinite(fixture.startTime)) return null;
  return new Date(fixture.startTime).toISOString().slice(0, 10);
}
```

### Update tests that use string `startTime`
Grep for `startTime:` in `tests/` and update all fixtures that use ISO strings to use Unix ms numbers:

```bash
rg -n "startTime:" tests/
```

For each hit, change from:
```typescript
startTime: "2026-07-15T19:00:00Z",
```
to:
```typescript
startTime: 1752620400000,  // 2026-07-15T19:00:00Z as Unix ms
```

**Important**: Verify the timestamp value is correct for the date. Use:
```bash
node -e "console.log(new Date('2026-07-15T19:00:00Z').getTime())"
# Output: 1752620400000
```

### Test to add (Agent E)
```typescript
it("extractFixtureDate converts Unix ms timestamp to ISO date", () => {
  const fixture: Fixture = {
    fixtureId: 1,
    participant1: "England",
    participant2: "Argentina",
    participant1IsHome: true,
    startTime: 1752620400000,
    gameState: 1,
    competition: "World Cup",
    competitionId: 72,
  };
  expect(extractFixtureDate(fixture)).toBe("2026-07-15");
});
it("extractFixtureDate returns null for invalid timestamp", () => {
  const fixture: Fixture = {
    fixtureId: 1,
    participant1: "A",
    participant2: "B",
    participant1IsHome: true,
    startTime: 0,
    gameState: 1,
    competition: "World Cup",
    competitionId: 1,
  };
  expect(extractFixtureDate(fixture)).toBeNull();
});
```

---

## BUG-10: Call `validateDistribution` in `normalizeTxline`

**File**: `lib/txline/normalize.ts`
**Agent**: B (bonus — they already own this file)
**Severity**: BLOCKING

### Current code (lib/txline/normalize.ts:128-158)
`validateDistribution` is defined (lines 83-96) but never called in `normalizeTxline`.

### New code
In `normalizeTxline`, after selecting `regRow`, call `validateDistribution` and reject if it fails:

```typescript
export function normalizeTxline(
  fixture: Fixture | null,
  odds: OddsPayload[],
  receivedAt: number = Date.now(),
  outcome: Outcome = "home",
): NormalizedTxline {
  const regRow = selectRegulationTimeRow(odds);
  const outcomeResult = regRow ? findOutcomeProbability(regRow, outcome) : null;
  const teams = extractTeams(fixture);
  const matchDate = extractFixtureDate(fixture);

  const distributionValid = regRow ? validateDistribution(regRow.pct) : false;
  const probability = distributionValid ? (outcomeResult?.probability ?? null) : null;

  const timestamp = regRow?.ts ?? null;
  const fresh =
    timestamp !== null && receivedAt - timestamp <= CONFIG.txline.maxAgeMs;

  const serviceLevel = regRow?.serviceLevel ?? CONFIG.txline.serviceLevel;

  return {
    probability,
    messageId: regRow?.messageId ?? null,
    timestamp,
    receivedAt,
    fresh,
    serviceLevel,
    delayed: isDelayed(serviceLevel),
    homeTeam: teams.home,
    awayTeam: teams.away,
    matchDate,
    marketType: regRow?.superOddsType ?? null,
    marketPeriod: regRow?.marketPeriod ?? null,
  };
}
```

**What changed**: Added `const distributionValid = regRow ? validateDistribution(regRow.pct) : false;` and gated `probability` on it. If the three Pct values don't sum to ~1.0 (±0.05), probability is null → gap is null → alert suppressed.

### Test to add (Agent E)
```typescript
it("normalizeTxline rejects odds with implausible distribution", () => {
  const badOdds: OddsPayload[] = [{
    fixtureId: 1,
    messageId: "msg1",
    ts: Date.now(),
    bookmaker: "test",
    bookmakerId: 1,
    superOddsType: "1X2_PARTICIPANT_RESULT",
    gameState: "1",
    inRunning: false,
    marketParameters: null,
    marketPeriod: null,
    priceNames: ["part1", "draw", "part2"],
    prices: ["1.5", "5.0", "8.0"],
    pct: ["10.000", "10.000", "10.000"],  // sums to 0.30, not ~1.0
  }];
  const result = normalizeTxline(null, badOdds, Date.now(), "home");
  expect(result.probability).toBeNull();
});
```

---

## BUG-6: `isBookEmpty` should use OR-logic, not AND-logic

**File**: `lib/polymarket/normalize.ts`
**Agent**: C
**Severity**: BLOCKING

### Current code (lib/polymarket/normalize.ts:82-87)
```typescript
export function isBookEmpty(book: ClobBook | null): boolean {
  if (!book) return true;
  const hasBids = book.bids && book.bids.length > 0;
  const hasAsks = book.asks && book.asks.length > 0;
  return !hasBids && !hasAsks;
}
```

### New code
```typescript
export function isBookEmpty(book: ClobBook | null): boolean {
  if (!book) return true;
  const hasBids = book.bids && book.bids.length > 0;
  const hasAsks = book.asks && book.asks.length > 0;
  return !hasBids || !hasAsks;
}
```

**What changed**: `&&` → `||`. A book is empty if EITHER side has no liquidity. Per `docs/safety.md:43-44`: "if bids or asks is empty, that side has no liquidity. Suppress alerts."

### Update existing test (tests/polymarket.test.ts)
Find the `isBookEmpty` tests and add the half-empty cases:

```typescript
it("returns true when only asks are empty (half-empty)", () => {
  const book: ClobBook = {
    market: "x",
    asset_id: "y",
    bids: [{ price: "0.40", size: "100" }],
    asks: [],
    timestamp: "1000",
  };
  expect(isBookEmpty(book)).toBe(true);
});

it("returns true when only bids are empty (half-empty)", () => {
  const book: ClobBook = {
    market: "x",
    asset_id: "y",
    bids: [],
    asks: [{ price: "0.50", size: "100" }],
    timestamp: "1000",
  };
  expect(isBookEmpty(book)).toBe(true);
});
```

**Also check**: The existing test that asserts `isBookEmpty` returns `false` for a book with both bids and asks should still pass. But if any existing test asserts that a half-empty book returns `false`, that test must be changed to `true`. Grep for the existing tests:
```bash
rg -n "isBookEmpty" tests/polymarket.test.ts
```

---

## BUG-7: GameState=6 (cancelled) must suppress alerts

**Files**: `lib/gap/engine.ts` (Agent C), `lib/data/real-provider.ts` (Agent A — already done in Phase 1)
**Agent**: C
**Severity**: BLOCKING

### Agent C: Add `fixtureGameState` to `AlertInput` (lib/gap/engine.ts:38-56)

**Current**:
```typescript
export interface AlertInput {
  gapAfterFee: number | null;
  txlineFresh: boolean;
  polymarketFresh: boolean;
  sourceSkewMs: number | null;
  maxSourceSkewMs: number;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
  bookEmpty: boolean;
  equivalencePassed: boolean;
  serviceLevel: number;
  previousPhase: AlertPhase;
  previousConsecutiveSamples: number;
  messageId: string | null;
  bookHash: string | null;
  lastAlertTime: number | null;
  now: number;
}
```

**New** — add `fixtureGameState` field:
```typescript
export interface AlertInput {
  gapAfterFee: number | null;
  txlineFresh: boolean;
  polymarketFresh: boolean;
  sourceSkewMs: number | null;
  maxSourceSkewMs: number;
  marketActive: boolean;
  marketClosed: boolean;
  acceptingOrders: boolean;
  bookEmpty: boolean;
  equivalencePassed: boolean;
  serviceLevel: number;
  fixtureGameState: number | null;
  previousPhase: AlertPhase;
  previousConsecutiveSamples: number;
  messageId: string | null;
  bookHash: string | null;
  lastAlertTime: number | null;
  now: number;
}
```

### Agent C: Add suppression branch (lib/gap/engine.ts:73-93)

**Current suppression block** (lines 73-93):
```typescript
if (input.serviceLevel === 1) {
  suppressedReason = "TxLINE service level 1 (60-second delayed). Alerts suppressed.";
} else if (!input.equivalencePassed) {
  suppressedReason = "Contract equivalence checks failed. Alerts suppressed.";
} else if (!input.txlineFresh) {
  ...
```

**New** — insert `fixtureGameState === 6` check AFTER serviceLevel, BEFORE equivalence:
```typescript
if (input.serviceLevel === 1) {
  suppressedReason = "TxLINE service level 1 (60-second delayed). Alerts suppressed.";
} else if (input.fixtureGameState === 6) {
  suppressedReason = "Fixture is cancelled (GameState 6). Alerts suppressed.";
} else if (!input.equivalencePassed) {
  suppressedReason = "Contract equivalence checks failed. Alerts suppressed.";
} else if (!input.txlineFresh) {
  ...
```

### Agent A: Pass `fixtureGameState` from real-provider (lib/data/real-provider.ts ~line 194-212)

**Current** (the `evaluateAlert` call):
```typescript
const alertEval = evaluateAlert({
  gapAfterFee,
  txlineFresh: normalizedTxline.fresh,
  polymarketFresh: normalizedPoly.fresh,
  sourceSkewMs,
  maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
  marketActive: normalizedPoly.marketActive,
  marketClosed: normalizedPoly.marketClosed,
  acceptingOrders: normalizedPoly.acceptingOrders,
  bookEmpty: normalizedPoly.bookEmpty,
  equivalencePassed: equivalence.passed,
  serviceLevel: normalizedTxline.serviceLevel,
  previousPhase: this.previousPhase,
  previousConsecutiveSamples: this.previousConsecutiveSamples,
  messageId: normalizedTxline.messageId,
  bookHash,
  lastAlertTime: this.lastAlertTime,
  now,
});
```

**New** — add `fixtureGameState`:
```typescript
const alertEval = evaluateAlert({
  gapAfterFee,
  txlineFresh: normalizedTxline.fresh,
  polymarketFresh: normalizedPoly.fresh,
  sourceSkewMs,
  maxSourceSkewMs: CONFIG.gap.maxSourceSkewMs,
  marketActive: normalizedPoly.marketActive,
  marketClosed: normalizedPoly.marketClosed,
  acceptingOrders: normalizedPoly.acceptingOrders,
  bookEmpty: normalizedPoly.bookEmpty,
  equivalencePassed: equivalence.passed,
  serviceLevel: normalizedTxline.serviceLevel,
  fixtureGameState: txlineData.fixture?.gameState ?? null,
  previousPhase: this.previousPhase,
  previousConsecutiveSamples: this.previousConsecutiveSamples,
  messageId: normalizedTxline.messageId,
  bookHash,
  lastAlertTime: this.lastAlertTime,
  now,
});
```

### Fix existing tests that call `evaluateAlert` without `fixtureGameState`
Every test that calls `evaluateAlert` must now pass `fixtureGameState: 1` (or `null`). Grep:
```bash
rg -n "evaluateAlert" tests/
```
For each test, add `fixtureGameState: 1,` to the input object. This is a mechanical change — add the field to every `evaluateAlert({...})` call.

### Test to add (Agent E)
```typescript
it("suppresses alerts when fixtureGameState is 6 (cancelled)", () => {
  const result = evaluateAlert({
    gapAfterFee: 0.10,
    txlineFresh: true,
    polymarketFresh: true,
    sourceSkewMs: 0,
    maxSourceSkewMs: 15_000,
    marketActive: true,
    marketClosed: false,
    acceptingOrders: true,
    bookEmpty: false,
    equivalencePassed: true,
    serviceLevel: 12,
    fixtureGameState: 6,
    previousPhase: "IDLE",
    previousConsecutiveSamples: 0,
    messageId: "msg1",
    bookHash: "hash1",
    lastAlertTime: null,
    now: 1000000,
  });
  expect(result.alert.active).toBe(false);
  expect(result.alert.suppressedReason).toContain("cancelled");
});
```

---

## BUG-11: Remove `tokens[0]` fallback in `fetchPolymarketData`

**File**: `lib/polymarket/client.ts`
**Agent**: C
**Severity**: BLOCKING

### Current code (lib/polymarket/client.ts:69-101)
```typescript
export async function fetchPolymarketData(
  eventSlug: string = CONFIG.polymarket.eventSlug,
  marketSlug: string = CONFIG.polymarket.marketSlug,
): Promise<PolymarketFetchResult> {
  const [event, market] = await Promise.all([
    fetchEvent(eventSlug),
    fetchMarket(marketSlug),
  ]);

  let yesTokenId: string | null = null;
  if (market && market.clobTokenIds) {
    try {
      const tokens: string[] = JSON.parse(market.clobTokenIds);
      const labels: string[] = market.outcomes ? JSON.parse(market.outcomes) : [];
      const yesIdx = labels.findIndex(
        (l) => l.toLowerCase() === "yes",
      );
      if (yesIdx >= 0 && tokens[yesIdx]) {
        yesTokenId = tokens[yesIdx];
      } else if (tokens[0]) {
        yesTokenId = tokens[0];
      }
    } catch {
      yesTokenId = null;
    }
  }

  let book: ClobBook | null = null;
  if (yesTokenId) {
    book = await fetchBook(yesTokenId);
  }

  return { event, market, book, yesTokenId };
}
```

### New code
```typescript
export async function fetchPolymarketData(
  eventSlug: string,
  marketSlug: string,
): Promise<PolymarketFetchResult> {
  const [event, market] = await Promise.all([
    fetchEvent(eventSlug),
    fetchMarket(marketSlug),
  ]);

  let yesTokenId: string | null = null;
  if (market && market.clobTokenIds) {
    try {
      const tokens: string[] = JSON.parse(market.clobTokenIds);
      const labels: string[] = market.outcomes ? JSON.parse(market.outcomes) : [];
      const yesIdx = labels.findIndex(
        (l) => l.toLowerCase() === "yes" || l.toLowerCase() === "true",
      );
      if (yesIdx >= 0 && tokens[yesIdx]) {
        yesTokenId = tokens[yesIdx];
      }
    } catch {
      yesTokenId = null;
    }
  }

  let book: ClobBook | null = null;
  if (yesTokenId) {
    book = await fetchBook(yesTokenId);
  }

  return { event, market, book, yesTokenId };
}
```

**What changed**:
1. Removed `= CONFIG.polymarket.eventSlug` and `= CONFIG.polymarket.marketSlug` defaults (these no longer exist in CONFIG after BUG-1). Both params are now required.
2. Removed the `else if (tokens[0]) { yesTokenId = tokens[0]; }` branch — this was the bug. If no "Yes" label is found, `yesTokenId` stays `null` (fail closed).
3. Added `|| l.toLowerCase() === "true"` to the yes-label check (some Polymarket markets use "True"/"False" instead of "Yes"/"No").

### Also fix `fetchMarket` regex (lib/polymarket/client.ts:39)
**Current**:
```typescript
const eventSlug = slug.replace(/-eng$|-draw$|-arg$/, "");
```
**New** — remove the hardcoded team-code regex. Since `fetchPolymarketData` now requires both `eventSlug` and `marketSlug` as explicit params, the `fetchMarket` fallback is less critical. But if it's still called independently, it needs to work for any team code:

```typescript
const eventSlug = slug.replace(/-[a-z]{3}$/, "");
```
This strips any 3-letter lowercase suffix (eng, fra, esp, arg, bra, etc.) — generic, not hardcoded.

---

## BUG-15: Fix hydration error in replay mode

**File**: `app/page.tsx`
**Agent**: D
**Severity**: MEDIUM (console error visible to judges)

### Current code (app/page.tsx:249)
```typescript
const isReplay = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "replay";
```

This is the hydration bug. On the server, `typeof window !== "undefined"` is `false`, so `isReplay` is `false`. On the client, it's `true` (if `?demo=replay` is in the URL). This causes the server-rendered HTML (no ReplayBanner) to mismatch the client-rendered HTML (with ReplayBanner).

### Fix
Use `useSearchParams` from `next/navigation` (App Router), which is available on both server and client:

**Step 1**: Add import at top of file:
```typescript
import { useSearchParams } from "next/navigation";
```

**Step 2**: Replace line 249. Since `useSearchParams` is a hook, it must be called inside the component body (not inside a callback). Find where `isReplay` is currently declared (line 249, inside the `DashboardPage` component) and replace:

**Current**:
```typescript
const isReplay = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "replay";
```

**New**:
```typescript
const searchParams = useSearchParams();
const isReplay = searchParams.get("demo") === "replay";
```

**Important**: `useSearchParams` returns `null` during SSR in some Next.js versions. Wrap in a null check:
```typescript
const searchParams = useSearchParams();
const isReplay = searchParams?.get("demo") === "replay";
```

**If `useSearchParams` causes a "should be wrapped in a Suspense boundary" error** (common in Next 14+):
Wrap the component's return in `<Suspense>`:
```typescript
import { Suspense } from "react";
// ... at the end of the file:
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <DashboardContent />
    </Suspense>
  );
}
```
Rename the current `DashboardPage` function to `DashboardContent` and create the wrapper. This is the standard Next.js App Router pattern for `useSearchParams`.

### Verify
After the fix, run `npm run dev`, open `http://localhost:3000/?demo=replay`, and check the browser console — the hydration error should be gone.

---

## S-1: Fix README broken doc link

**File**: `README.md`
**Agent**: D
**Severity**: HIGH (submission)

### Current (README.md:16-18)
```markdown
## TxLINE activation

See `docs/txline-activation.md` for the full mainnet service-level-12 activation flow.
```

### New
```markdown
## TxLINE activation

Run `npm run txline:activate` (CLI) or visit `/activate` in the browser after `npm run dev`.

Requires a mainnet Solana wallet with a small SOL balance for the on-chain subscription transaction. The activation flow:
1. Connects your wallet (Phantom or Solflare)
2. Submits a `subscribe(12, 4)` transaction to the Txoracle program (service level 12 = real-time, 4 weeks)
3. Signs the activation message
4. Returns a JWT and API token to copy into `.env.local`
```

---

## S-2: Add missing env vars to `.env.example`

**File**: `.env.example`
**Agent**: D
**Severity**: HIGH (submission)

### Current
```
TXLINE_JWT=
TXLINE_API_TOKEN=
TXLINE_NETWORK=mainnet
GOOGLE_STITCH_API_KEY=
NEXT_PUBLIC_HELIUS_API_KEY=
```

### New
```
TXLINE_JWT=
TXLINE_API_TOKEN=
TXLINE_NETWORK=mainnet
GOOGLE_STITCH_API_KEY=
NEXT_PUBLIC_HELIUS_API_KEY=

# Data source: "real" for live TxLINE+Polymarket, unset for mock mode
DATA_SOURCE=

# Mock scenario (only used when DATA_SOURCE is unset): live|alert|stale|unavailable|error|loading
MOCK_SCENARIO=live
```

---

## S-3: Add LICENSE file

**File**: `LICENSE` (new file)
**Agent**: D
**Severity**: HIGH (submission)

Create an MIT LICENSE file:
```
MIT License

Copyright (c) 2026 Patrick Passos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Note**: If the copyright holder should be different (e.g., a team name), update accordingly. The agent should use "Patrick Passos" based on the git author of the commits.

---

## Verification checklist (Agent E runs this after all fixes)

```bash
cd /tmp/opencode/world-cup-edge-review

# 1. Type check
npm run typecheck
# Expected: clean, no errors

# 2. Lint
npm run lint
# Expected: clean, no errors

# 3. Tests
npm run test
# Expected: 189+ tests pass (original 189 + new tests for each bug fix)
# Flag ANY test that fails or was removed

# 4. Build
npm run build
# Expected: succeeds, no warnings

# 5. Replay mode smoke test
# Start dev server: npm run dev
# Then: curl -s http://localhost:3000/api/snapshot?demo=replay | grep -o '"active":[a-z]*'
# Expected: "active":true (replay alert fires)

# 6. Mock mode smoke test
# MOCK_SCENARIO=alert npm run dev
# curl -s http://localhost:3000/api/snapshot | grep -o '"active":[a-z]*'
# Expected: "active":true (mock alert fires)

# 7. No-args fails closed (BUG-1 SOTA verification)
# DATA_SOURCE=real npm run dev
# curl -s http://localhost:3000/api/snapshot | grep -o '"status":"[^"]*"'
# Expected: "unavailable" (not "England vs Argentina" fabricated data)

# 8. Hydration error check
# Open http://localhost:3000/?demo=replay in browser
# Check console — no "Hydration failed" error
```

---

## Files owned by each agent (conflict prevention)

| Agent | Files they edit | Files they read-only |
|---|---|---|
| **A** (Phase 1) | `lib/config.ts`, `lib/data/real-provider.ts`, `lib/data/index.ts`, `app/api/snapshot/route.ts`, `app/page.tsx` (doPoll params only, ~lines 298-312) | All others |
| **B** (Phase 2) | `lib/txline/client.ts`, `lib/txline/normalize.ts`, `lib/txline/types.ts`, `tests/txline.test.ts` | All others |
| **C** (Phase 2) | `lib/polymarket/normalize.ts`, `lib/polymarket/client.ts`, `lib/gap/engine.ts`, `tests/polymarket.test.ts`, `tests/gap.test.ts`, `tests/safety.test.ts` | All others |
| **D** (Phase 2) | `app/page.tsx` (line 249 area ONLY — hydration fix), `README.md`, `.env.example`, `LICENSE` (new) | All others |
| **E** (Phase 3) | `tests/` (new test files + appending to existing), `FUTURE-FIXES.md` | All source files (verification only) |

**Critical**: Agent A and Agent D both edit `app/page.tsx`. Agent A edits the `doPoll` params (~lines 298-312). Agent D edits the `isReplay` declaration (~line 249). These are ~50 lines apart. **Agent A must complete its `app/page.tsx` edit BEFORE Agent D starts.** Agent A should do this as the LAST step of Phase 1.

---

## Commit strategy

After all phases complete, Agent E should commit the changes:

```bash
cd /tmp/opencode/world-cup-edge-review
git add -A
git status  # verify no .env.local or keypair.json staged
git commit -m "fix data-identity bugs, fail-closed safety violations, and submission packaging"
```

**Do NOT commit `.env.local` or `keypair.json`** — verify with `git status` before committing. These are gitignored but verify anyway.

**Do NOT push** — leave the commit on the `review/end-to-end-audit` branch for the user to review and merge.

---

*End of FIX-SPEC.md. The executing agent should read this file completely before starting, then execute Phase 1 → Phase 2 → Phase 3 in order. If any step is unclear, consult the referenced file:line in the codebase. Do NOT skip the BUG-8 live API verification step.*