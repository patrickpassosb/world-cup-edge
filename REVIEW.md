# World Cup Edge — End-to-End Review

**Date**: 2026-07-18
**Reviewer**: opencode (GLM-5.2) via 8 parallel explore agents + live verification
**Base commit**: `a69e3d4` (merged master + feat/replay-fly-deploy)
**Worktree**: `/tmp/opencode/world-cup-edge-review` (branch `review/end-to-end-audit`)
**Mode**: Read-only review — no code changes, no commits

---

## Executive Summary

**Verdict: NOT READY FOR SUBMISSION — 15 blocking bugs, 7 submission-blocking gaps.**

The app has a solid architectural foundation: the deterministic gap engine, fail-closed suppression framework, and equivalence checker are well-designed. The replay mode (`?demo=replay`) works and is correctly labeled. Secrets hygiene is clean. All 10 AGENTS.md constraints are compliant at the claims/language level.

However, the app has **critical data-identity bugs** that mean it cannot correctly monitor any match other than the original England vs Argentina fixture. The config file is internally inconsistent (England/France vs England/Argentina), the slug derivation regex only works for 3 team codes, the YES-token matcher hardcodes "england", and the error fallback fabricates the wrong match identity. These bugs were partially masked because the original single-match scope hardcoded everything, and the transition to a dynamic match picker left the old hardcoded values in place.

Additionally, several fail-closed safety rules from `docs/safety.md` are **not enforced in production**: service level is hardcoded to 12 (level-1 suppression unreachable), GameState=6 (cancelled) is not checked in the snapshot path, and `isBookEmpty` uses AND-logic instead of OR-logic (half-empty books at kickoff are misreported).

The submission packaging is incomplete: README has a broken doc link, `.env.example` is missing 2 env vars, no LICENSE file, no demo video, no screenshots of the running app, and the approved claims.md description is not surfaced anywhere.

### Baseline (verified on merged master at `a69e3d4`)
- **typecheck**: clean
- **lint**: clean
- **tests**: 189/189 pass across 10 files
- **build**: succeeds (standalone output for Docker)
- **deploy artifacts**: Dockerfile, fly.toml, .dockerignore, /api/health all present
- **replay mode**: `?demo=replay` works, correctly labeled, produces deterministic alert

### Methodology
8 parallel explore agents (read-only), each scoped to a non-overlapping concern:
1. Data-identity audit (priority)
2. Gap engine & fail-closed safety
3. TxLINE client + normalize
4. Polymarket client + normalize
5. API routes + provider orchestration
6. UI/UX + claims compliance
7. Tests + build
8. Submission packaging

Plus live verification: 9 screenshots via chrome-devtools MCP (real-data + replay mode at 1280/768/375px), real-data API smoke test against live TxLINE + Polymarket.

---

## Blocking Bugs (15)

### Data-Identity Bugs (4) — HIGHEST PRIORITY

#### BUG-1: `lib/config.ts` internally inconsistent — MATCH vs CONFIG.polymarket describe different matches
**Severity**: BLOCKING
**Location**: `lib/config.ts:3-13, 23-30`
**Description**: `CONFIG.txline.fixtureId` = 18257865 (France vs England, 2026-07-16) but `CONFIG.polymarket.eventSlug/marketSlug` = `fifwc-eng-arg-2026-07-15` (England vs Argentina, 2026-07-15). `MATCH` = England vs France. Three identity systems disagree.
**Impact**: Default-invocation `RealDataProvider` fetches TxLINE for France-England and Polymarket for England-Argentina. Equivalence always fails. Dashboard shows "unavailable" permanently. **Confirmed in live test**: `curl /api/snapshot?fixtureId=18257865&marketSlug=fifwc-eng-arg-2026-07-15-eng` returns all 5 equivalence checks failing.
**Fix**: Make CONFIG internally consistent — either update polymarket slugs to France-England, or remove hardcoded slugs and require the picker to pass them.

#### BUG-2: `RealDataProvider` derives draw/away slugs with broken regex (`-eng|draw|arg` only)
**Severity**: BLOCKING
**Location**: `lib/data/real-provider.ts:63-65`
**Description**: `this.eventSlug = this.homeMarketSlug.replace(/-(eng|draw|arg)$/, "")` only strips `-eng`, `-draw`, `-arg`. For France home (`-fra`), Spain (`-esp`), Brazil (`-bra`), etc., the regex doesn't match and `eventSlug` becomes the full market slug. Then `drawMarketSlug` = `…-fra-draw` (wrong) and `awayMarketSlug` = `…-away` (literal `-away`, not the team code). Polymarket uses FIFA codes: `…-fra`, `…-draw`, `…-eng`.
**Impact**: Draw and away outcomes are broken for every match except England-Argentina. Even home-only works only because the picker passes the correct home slug. **Confirmed**: `lib/polymarket/client.ts` has the correct `buildAwayMarketSlug` using `teamToFifaCode`, but `RealDataProvider` ignores it and invents `-away`.
**Fix**: Remove the regex. Pass all 3 market slugs from the picker (MatchEntry already carries them via `findPolymarketMatchForTeams`), or call `findPolymarketMatchForTeams` inside the provider.

#### BUG-3: Snapshot route error fallback hardcodes "England vs Argentina"
**Severity**: BLOCKING
**Location**: `app/api/snapshot/route.ts:66-78`
**Description**: The catch-block fallback `Snapshot` hardcodes `match.name: "England vs Argentina"`, `date: "2026-07-15"`, `homeTeam: "England"`, `awayTeam: "Argentina"`. This ignores the parsed query params (`homeTeam`, `awayTeam`, `kickoffUTC`). A user monitoring France vs England who hits a fetch error sees "England vs Argentina" in the header.
**Impact**: Fabricated match identity on error. Violates AGENTS.md #6 spirit ("never fabricate data to appear functional"). The alert is correctly suppressed, but the identity is wrong.
**Fix**: Use the parsed query params in the fallback, or delegate to `RealDataProvider.buildErrorSnapshot()` which already does this correctly.

#### BUG-4: `RealDataProvider` constructor doesn't accept draw/away market slugs
**Severity**: HIGH
**Location**: `lib/data/real-provider.ts:53-70`; `lib/data/index.ts:6-13`; `app/api/snapshot/route.ts:49-56`
**Description**: The picker (`MatchEntry`) carries all 3 correct slugs from `findPolymarketMatchForTeams`, but `CreateProviderArgs` only has `homeMarketSlug`. The draw/away slugs are thrown away at the `createProvider` boundary and re-derived with the broken regex (BUG-2).
**Impact**: Compounds BUG-2. Even with the picker producing correct slugs, draw/away outcomes can't reach Polymarket.
**Fix**: Add `drawMarketSlug` and `awayMarketSlug` to `CreateProviderArgs` and `RealDataProvider` constructor. Thread them through the snapshot route query params.

### Fail-Closed Safety Bugs (3)

#### BUG-5: Service level hardcoded to 12 — level-1 suppression unreachable
**Severity**: BLOCKING
**Location**: `lib/data/real-provider.ts:144`; `lib/txline/normalize.ts:132`
**Description**: `CONFIG.txline.serviceLevel` (hardcoded 12) is passed to `normalizeTxline` and flows to `evaluateAlert`. The TxLINE API response is never inspected for a service-level field. If the subscription drops to level 1 (60-second delay), the dashboard still reports `serviceLevel: 12, delayed: false` and alerts fire on delayed data.
**Impact**: Direct violation of `docs/safety.md:32-34` ("Level 1 is acceptable for integration testing, not for live alerts"). The `serviceLevel === 1` check in `engine.ts:73` is structurally unreachable.
**Fix**: Read the actual service level from the TxLINE API response at fetch time.

#### BUG-6: `isBookEmpty` uses AND-logic instead of OR-logic
**Severity**: BLOCKING
**Location**: `lib/polymarket/normalize.ts:82-87`
**Description**: `return !hasBids && !hasAsks` — only true when BOTH empty. `docs/safety.md:43-44` requires suppressing if asks empty OR bids empty. At kickoff (`clearBookOnStart`), one side may empty temporarily. A half-empty book returns `bookEmpty: false`, the dashboard shows "live"/"stale" instead of "unavailable/resetting", and the gap is suppressed via the wrong path (null-gap, not book-empty).
**Impact**: Violates `docs/safety.md:86-91` (kickoff behavior — "must produce 'market unavailable/resetting'"). The alert IS suppressed (fail-closed), but the displayed status and reason are wrong.
**Fix**: `return !hasBids || !hasAsks;`

#### BUG-7: GameState=6 (cancelled) not checked in snapshot path
**Severity**: BLOCKING
**Location**: `lib/data/real-provider.ts` (no check); `lib/gap/engine.ts` (no gameState input)
**Description**: `docs/safety.md:45` requires suppressing alerts when `GameState` is 6 (cancelled). The only check is in `matches-provider.ts:12` (filters the match LIST). Once a match is selected, `RealDataProvider.getSnapshot()` never inspects `fixture.gameState`. A match cancelled mid-session can still produce alerts.
**Impact**: Violates AGENTS.md #6 and safety.md. False alerts from a cancelled match.
**Fix**: Add `gameState` to `AlertInput`, pass `fixture.gameState === 6` from the provider, add a suppression branch in `engine.ts`.

### TxLINE Normalization Bugs (4)

#### BUG-8: `MarketPeriod: null` misclassified as regulation time
**Severity**: BLOCKING
**Location**: `lib/txline/normalize.ts:46`
**Description**: `isRegulationTime1X2` returns `true` when `MarketPeriod` is `null`/`undefined`/`""`. `docs/match-picker-handoff.md:333` explicitly states: "MarketPeriod: null = full match (NOT regulation)." A full-match odds row includes extra time and is NOT equivalent to Polymarket's "first 90 minutes + stoppage time."
**Impact**: Compares non-equivalent contracts (full-match vs regulation-time). Violates AGENTS.md #5. The test at `txline.test.ts:131-133` encodes this bug as expected behavior.
**Fix**: Require an explicit regulation-time `MarketPeriod` value; reject `null`/`undefined`/`""`.

#### BUG-9: `StartTime` normalized to string, breaks date math
**Severity**: BLOCKING
**Location**: `lib/txline/client.ts:64`; `lib/txline/types.ts:22`
**Description**: The real API returns `StartTime` as a Unix-ms number (`1784408400000`). `normalizeFixtureFields` does `String(...)`, producing `"1784408400000"`. Then `extractFixtureDate` does `fixture.startTime.slice(0, 10)` → `"1784408400"` (garbage, not a date). The tests use ISO strings (`"2026-07-15T19:00:00Z"`), masking the bug.
**Impact**: In production, `matchDate` becomes `"1784408400"` and the contract-equivalence date check always fails. The displayed match date is corrupt.
**Fix**: Type `startTime: number`, normalize via `Number(...)`, have `extractFixtureDate` do `new Date(startTime).toISOString().slice(0,10)`.

#### BUG-10: `validateDistribution` is dead code — never called in normalizeTxline
**Severity**: BLOCKING
**Location**: `lib/txline/normalize.ts:83-96` (defined), `128-158` (never called)
**Description**: ARCHITECTURE.md:170 requires "Verify three-way probabilities form a plausible distribution." `validateDistribution` implements this but `normalizeTxline` never invokes it. A malformed odds row (partial feed, suspended market) with Pct summing to 0.40 would pass and produce garbage probabilities.
**Impact**: Garbage probabilities can flow to the gap engine and produce false alerts or false suppressions.
**Fix**: Call `validateDistribution(regRow.pct)` in `normalizeTxline` after selecting `regRow`.

#### BUG-11: `fetchPolymarketData` falls back to `tokens[0]` assuming index 0 is YES
**Severity**: BLOCKING
**Location**: `lib/polymarket/client.ts:83-90`
**Description**: When no "Yes" label is found, the code falls through to `else if (tokens[0]) { yesTokenId = tokens[0]; }`, blindly selecting token at index 0. `docs/polymarket-api.md:54-66` explicitly forbids this. The downstream `normalizePolymarket` prefers this `yesTokenId` over its own (correct) `extractYesToken` result.
**Impact**: For markets where YES is not at index 0, the gap engine fetches the NO token's book. Silent wrong-data bug.
**Fix**: Delete the `else if (tokens[0])` branch. If no "Yes"/"England" label is found, set `yesTokenId = null` (fail closed).

### UI/UX Bugs (4)

#### BUG-12: Missing row of 7 state badges (StatusStrip replaces required badge row)
**Severity**: HIGH (design non-conformance)
**Location**: `app/page.tsx:802-861`
**Description**: SPEC.md and HANDOFF.md require a "Row of 7 badges (Loading, Live, Stale, No alert, Alert, Unavailable, Error) each with a lucide icon + text label. Active state highlighted with cobalt underline. Inactive states at 50% opacity." The implementation renders a `StatusStrip` with 2 text rows ("Data feed" / "Gap monitor") using derived enums — NOT 7 badges, NOT with lucide icons, NOT with cobalt underlines.
**Impact**: Direct contradiction of the approved Stitch design. The single largest visual deviation.
**Fix**: Replace `StatusStrip` with a `StateBadgeRow` rendering 7 badges.

#### BUG-13: Main match headline uses sans font, not serif
**Severity**: HIGH (typography violation)
**Location**: `app/page.tsx:454`
**Description**: DESIGN.md requires "Headlines → Source Serif 4". The main `h1` uses `font-sans` (Source Sans 3), not `font-serif`. Only the "Session alerts" subheadings correctly use `font-serif`.
**Fix**: Change `font-sans` to `font-serif` on the `h1` at page.tsx:454.

#### BUG-14: Mobile text below 14px minimum
**Severity**: MEDIUM-HIGH (accessibility)
**Location**: `app/page.tsx` — ~21 occurrences of `text-xs` (12px) without mobile upgrade
**Description**: HANDOFF.md §Mobile requires "All text legible (min 14px body)." ~21 `text-xs` (12px) labels render on mobile, including the compliance-critical footer disclaimers.
**Fix**: Bump mobile body/label text to `text-sm` (14px) minimum.

#### BUG-15: Hydration error in replay mode
**Severity**: MEDIUM (React hydration mismatch)
**Location**: `app/page.tsx` — ReplayBanner causes server/client HTML mismatch
**Description**: Console error: "Hydration failed because the server rendered HTML didn't match the client." The ReplayBanner renders differently on server vs client (likely due to `isReplay` being computed from `searchParams` which differs between SSR and client hydration).
**Impact**: React regenerates the tree on client — causes a flash and potential SEO/accessibility issues. Not a data bug but a real console error visible to judges.
**Fix**: Ensure `isReplay` is computed consistently on both server and client, or use `useEffect` to set it after hydration.

---

## Submission-Blocking Gaps (7)

| # | Gap | Impact | Fix effort |
|---|---|---|---|
| S-1 | README references non-existent `docs/txline-activation.md` | Judges hit dead link | 5 min — point to `/activate` or `npm run txline:activate` |
| S-2 | `.env.example` missing `DATA_SOURCE` and `MOCK_SCENARIO` | Judges can't configure mock/replay from env alone | 5 min — add 2 lines |
| S-3 | No LICENSE file | Hackathon eligibility risk | 5 min — add MIT LICENSE |
| S-4 | No demo video or running-app screenshots | Judges can't see app without deploying | 30 min — record `/?demo=replay` |
| S-5 | Approved claims.md description not surfaced anywhere user-visible | Submission description not discoverable | 10 min — add to README or SUBMISSION.md |
| S-6 | README project structure is stale (says `src/` but actual is `lib/`) | Confuses judges exploring the repo | 10 min — update structure |
| S-7 | `lib/config.ts` MATCH (England/France) contradicts SPEC.md (England/Argentina) | Judges comparing dashboard to SPEC see a different match | 5 min — align config to SPEC or document the difference |

---

## Non-Blocking Issues (20 highlights — full list in agent reports)

| # | Issue | Location | Notes |
|---|---|---|---|
| N-1 | `FIFA_TEAM_CODES` fallback `key.slice(0,3)` wrong for multi-word teams | `polymarket/client.ts:151` | "United States" → "uni" not "usa" (table saves it, but fallback is broken) |
| N-2 | `extractYesToken` hardcodes `"england"` label match | `polymarket/normalize.ts:22` | Non-England matches with team-name labels fail token selection |
| N-3 | Equivalence team matching doesn't strip accents | `contract/equivalence.ts:23-26` | "Côte d'Ivoire" vs "Cote d'Ivoire" fails. Polymarket client DOES strip accents for slugs — asymmetric |
| N-4 | `bookHash` uses timestamp, not `book.hash` field | `real-provider.ts:190-192` | `ClobBook.hash` exists but is never read. Dedup keyed on (messageId, timestamp) |
| N-5 | Provider cache has no eviction | `data/index.ts:15` | Unbounded Map growth in long-running server |
| N-6 | `state-machine.ts` `transition()` is dead code in production | `gap/state-machine.ts` | `evaluateAlert` has an inline state machine. Tested function ≠ production function |
| N-7 | `delayedMaxAgeMs` (120s) configured but never used | `config.ts:7` | Level-1 freshness always uses 30s |
| N-8 | `route.test.ts` required by ARCHITECTURE.md doesn't exist | ARCHITECTURE.md:312 | No end-to-end route test |
| N-9 | Real-provider dedup branch has no test | `real-provider.ts:216-223` | `lastDedupeKey` comparison untested |
| N-10 | `axios` is an unused dependency | `package.json:19` | Grep finds zero imports |
| N-11 | `lucide-react` in devDependencies but used in production code | `package.json:32` | Should be in `dependencies` — breaks `npm install --production` |
| N-12 | `@coral-xyz/anchor` + `tweetnacl` in deps but only used by activation script | `package.json:15,23` | Should be in devDependencies |
| N-13 | `txline-provider.ts` is dead code | `data/txline-provider.ts` | Not imported anywhere. Stub class that always throws |
| N-14 | Dashboard doesn't display specific equivalence failure reasons | `page.tsx:623-627` | `equivalence.failures[]` is populated but not rendered. Generic "Contract equivalence checks failed" shown |
| N-15 | Health route is liveness-only, not readiness | `api/health/route.ts` | Returns "ok" without probing TxLINE/Polymarket |
| N-16 | No polling backoff on persistent error | `page.tsx:355` | Continues hitting API every 3s even if down |
| N-17 | Activate page uses rounded corners (`borderRadius: 4`) | `activate-client.tsx:480,534,543` | Violates "sharp 0px corners" design system |
| N-18 | Header hardcodes "19:00 UTC" regardless of selected match | `page.tsx:458` | Countdown uses correct time, but subtitle is stale |
| N-19 | Replay session alert says "England vs France" while match is "England vs Argentina" | `page.tsx` session alerts | Confirmed in live screenshot — mock/replay identity mismatch |
| N-20 | Two `isRegulationTime1X2` functions with different logic | `txline/normalize.ts:31` vs `contract/equivalence.ts:43` | Row selection uses permissive version, validation uses strict version |

---

## AGENTS.md 10 Constraints Compliance

| # | Constraint | Compliant? | Evidence |
|---|---|---|---|
| 1 | Never claim gap is arbitrage/guaranteed profit/verified truth | **YES** | All uses are negating disclaimers. "Not an arbitrage guarantee." appears in every gap explanation |
| 2 | Never add automated trading/wallet/order placement | **YES** | All Polymarket calls are GET. Wallet only in `/activate` (TxLINE subscription, not trading) |
| 3 | Never add an LLM/agent loop | **YES** | Gap engine is deterministic math. No LLM imports. `buildExplanation` is a hardcoded template |
| 4 | Never hardcode fees/probabilities/market mappings | **PARTIAL** | Fee is dynamic ✓. But `FIFA_TEAM_CODES` table, `MATCH` constant, `CONFIG.polymarket` slugs, `extractYesToken` "england" hardcode, and `-eng\|draw\|arg` regex are all hardcoded mappings |
| 5 | Never compare non-equivalent contracts | **PARTIAL** | Equivalence checker exists and works ✓. But BUG-8 (`MarketPeriod: null` = full match) and BUG-11 (`tokens[0]` fallback) can feed non-equivalent data past the check |
| 6 | Never suppress or fabricate alerts — fail closed | **PARTIAL** | Framework is fail-closed ✓. But BUG-5 (service level), BUG-6 (book empty), BUG-7 (GameState=6) are unenforced. BUG-3 fabricates match identity on error |
| 7 | Never commit secrets/API keys/private keys | **YES** | No secrets in git. `.env.local` and `keypair.json` gitignored. `.env.example` has empty values |
| 8 | Never expose raw TxLINE API responses through a public proxy | **YES** | Routes return normalized `Snapshot` only. No raw `OddsPayload` or `Pct` arrays |
| 9 | Never badge probability as "verified" unless deterministically recomputed | **YES** | No "verified" badging anywhere. UI uses "TxLINE Consensus", not "TxLINE Verified" |
| 10 | Never describe Polymarket quote as "executable" from Brazil | **YES** | UI uses "top-of-book quote" consistently. `grep "executable"` returns zero hits in app/ |

---

## Claims Compliance (docs/claims.md)

**PASS** — Every forbidden term is either absent or used only in negating disclaimers.

| Forbidden term | Found? | Context |
|---|---|---|
| "arbitrage" | Yes (3 hits) | All negating: "Not an arbitrage guarantee." |
| "guaranteed profit" | Yes (1 hit) | Negating disclaimer only |
| "verified truth" | Yes (1 hit) | Negating disclaimer only |
| "executable price" | No | — |
| "AI agent" | No | — |
| "trustless settlement" | No | — |
| "oracle replacement" | No | — |
| "not gambling" | No | — |

Required terms all present and correctly used: "top-of-book quote", "best ask", "consensus probability", "consensus gap".

---

## Footer Disclaimers (verbatim check)

**PASS** — Both lines are character-for-character identical to HANDOFF.md and SPEC.md:
1. "Read-only monitor. Not a trading bot. Not a settlement oracle. The consensus gap is not arbitrage, guaranteed profit, or verified truth."
2. "TxLINE proof verifies data provenance, not signal correctness."

---

## Fail-Closed Rules Compliance (docs/safety.md)

| Rule | Enforced? | Test? | Notes |
|---|---|---|---|
| TxLINE stale > 30s | YES | YES | |
| Polymarket stale > 10s | YES | YES | |
| Cross-source skew > 15s | YES | YES | |
| Pct = "NA" or malformed | YES (indirect) | PARTIAL | Null cascade, no end-to-end alert test |
| Book empty (asks OR bids) | **NO (BUG-6)** | PARTIAL | AND-logic, should be OR |
| Market closed/inactive/not-accepting | YES | YES | |
| GameState = 6 (cancelled) | **NO (BUG-7)** | NO | Only filtered in match list, not snapshot path |
| Contract equivalence | YES | YES | |
| Service level 1 | **NO (BUG-5)** | PARTIAL | Check exists but serviceLevel hardcoded to 12 |
| Duplicate MessageId | YES | PARTIAL | Real-provider dedup branch untested |

---

## Test Coverage Gaps

**Baseline**: 189/189 tests pass across 10 files. No skipped tests, no TODOs, no wrong assertions.

**Critical missing tests** (bugs that would be caught):
1. `route.test.ts` — required by ARCHITECTURE.md, does not exist. End-to-end route untested.
2. Half-empty book (asks empty, bids present) — would catch BUG-6
3. GameState=6 in snapshot path — would catch BUG-7
4. Real-provider dedup branch (`lastDedupeKey` comparison) — untested
5. Accent-stripping in equivalence — would catch N-3
6. Slug derivation for non-England-Argentina matches — would catch BUG-2
7. `extractYesToken` with non-England team labels — would catch N-2
8. `normalizeTxline` orchestrator end-to-end — would catch BUG-8, BUG-10
9. `StartTime` as number (not ISO string) — would catch BUG-9
10. Per-fixture state reset on match switch — untested

---

## Live Verification Results

### Screenshots (9 captured, in `/tmp/opencode/wce-screenshots/`)
| Screenshot | State | Viewport |
|---|---|---|
| `real-data-desktop-1280.png` | Real data, France vs England, unavailable | 1280px |
| `real-france-unavailable-desktop-1280.png` | Real data, unavailable, all checks × | 1280px |
| `real-france-unavailable-tablet-768.png` | Same, tablet | 768px |
| `real-france-unavailable-mobile-375.png` | Same, mobile | 375px |
| `real-spain-loading-desktop-1280.png` | Spain vs Argentina, loading | 1280px |
| `real-spain-loading-tablet-768.png` | Same, tablet | 768px |
| `real-spain-loading-mobile-375.png` | Same, mobile | 375px |
| `replay-alert-desktop-1280.png` | Replay mode, alert firing, all checks ✓ | 1280px |
| `replay-alert-tablet-768.png` | Same, tablet | 768px |
| `replay-alert-mobile-375.png` | Same, mobile | 375px |

### Real-data API smoke test (DATA_SOURCE=real, live TxLINE + Polymarket)
- `/api/health` → `{"status":"ok"}` ✓
- `/api/matches` → 2 World Cup fixtures (France vs England, Spain vs Argentina) with correct Polymarket slugs ✓
- `/api/snapshot` (default, no params) → status "unavailable", equivalence all failing (confirms BUG-1: default CONFIG mixes France-England fixtureId with England-Argentina slug)
- `/api/snapshot?fixtureId=18257865&marketSlug=fifwc-eng-arg-2026-07-15-eng` → all 5 equivalence checks fail (wrong slug for this fixture)
- `/api/snapshot?fixtureId=18257865&marketSlug=fifwc-fra-eng-2026-07-18-fra` → marketState passes, but teams/date/rules/token still fail. Real data flows (TxLINE 55.8%, Polymarket 56.0% best ask, gap = -0.00165 ≈ 0) but equivalence rejects. `feeRate: null` (fee fetch failed for this market).
- **Conclusion**: Real data IS flowing from both sources. The equivalence layer is correctly fail-closed (no false alerts). But the equivalence checks are too strict or the normalization is producing mismatched metadata, so the dashboard never reaches "live" status for France vs England.

### Console errors
- **Hydration error in replay mode** (BUG-15): "Hydration failed because the server rendered HTML didn't match the client." ReplayBanner causes SSR/client mismatch.
- No other console errors.

### Visual observations
- **Replay mode works well**: England vs Argentina, +6.0 pp gap, alert firing, all 4 verification checks ✓, "REPLAY MODE — SIMULATED HISTORICAL DATA. NOT LIVE." banner visible.
- **Replay session alert identity mismatch** (N-19): Session alert table shows "England vs France" while the match is "England vs Argentina" — mock/replay identity inconsistency.
- **Real-data mode shows stale TxLINE** (71s ago) — data is flowing but marked stale. Polymarket shows live (0s ago).
- **Spain vs Argentina** gets stuck in loading state — likely no TxLINE odds for that fixture, or the fixture ID isn't resolving.

---

## Build & Deploy Assessment

| Item | Status | Notes |
|---|---|---|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm run test` | PASS (189/189) | |
| `npm run build` | PASS | Standalone output, Next 16 Turbopack, no warnings |
| Dockerfile | Correct | Multi-stage, node:22-alpine, non-root user, standalone |
| fly.toml | Correct | Region gru, health check on /api/health, min 1 machine |
| /api/health | Works | Liveness only (not readiness) |
| Mock mode | Works | 6 scenarios, no credentials needed |
| Replay mode | Works | `?demo=replay`, correctly labeled, deterministic alert |
| Real mode | Partially works | Data flows but equivalence fails for France-England |

**Judge deploy experience**: `fly deploy` with no env vars → app boots in mock mode → dashboard renders. But README doesn't tell judges they're in mock mode, and `?demo=replay` (the demo path) is undocumented in the README.

---

## Submission Checklist (Go/No-Go)

- [ ] **NO-GO** — Fix BUG-1 (config identity mismatch) — highest priority
- [ ] **NO-GO** — Fix BUG-2 (slug derivation regex) — breaks all non-England-Argentina matches
- [ ] **NO-GO** — Fix BUG-3 (hardcoded error fallback)
- [ ] **NO-GO** — Fix BUG-5 (service level hardcoded) — safety bypass
- [ ] **NO-GO** — Fix BUG-6 (isBookEmpty AND→OR) — safety violation
- [ ] **NO-GO** — Fix BUG-7 (GameState=6 not checked) — safety violation
- [ ] **NO-GO** — Fix BUG-8 (MarketPeriod:null = full match, not regulation) — compares non-equivalent contracts
- [ ] **NO-GO** — Fix BUG-9 (StartTime string vs number) — corrupts match date in production
- [ ] **NO-GO** — Fix BUG-11 (tokens[0] fallback) — wrong token selection
- [ ] **NO-GO** — Fix S-1 (README broken link)
- [ ] **NO-GO** — Fix S-2 (.env.example missing DATA_SOURCE, MOCK_SCENARIO)
- [ ] **NO-GO** — Fix S-3 (no LICENSE)
- [ ] **NO-GO** — Fix S-7 (config contradicts SPEC)
- [ ] **RECOMMENDED** — Fix BUG-12 (missing 7 state badges) — design non-conformance
- [ ] **RECOMMENDED** — Fix BUG-13 (headline font sans→serif)
- [ ] **RECOMMENDED** — Fix BUG-15 (hydration error in replay)
- [ ] **RECOMMENDED** — Fix S-4 (record demo video)
- [ ] **RECOMMENDED** — Fix S-5 (surface claims.md description)
- [ ] **RECOMMENDED** — Add missing tests (route.test.ts, half-empty book, GameState=6, slug derivation)

**Minimum viable submission**: Fix BUG-1, BUG-2, BUG-3, BUG-5, BUG-6, BUG-7, BUG-8, BUG-9, BUG-11 (safety + data-identity) + S-1, S-2, S-3, S-7 (packaging). Then record a demo video (S-4).

---

## Recommended Fix Order

1. **BUG-1** (config consistency) — unblock everything else
2. **BUG-9** (StartTime number) — fixes match date for equivalence
3. **BUG-8** (MarketPeriod:null) — fixes row selection for regulation-time
4. **BUG-2 + BUG-4** (slug derivation + constructor params) — fixes draw/away outcomes
5. **BUG-3** (error fallback) — fixes fabricated identity
6. **BUG-5, BUG-6, BUG-7** (fail-closed safety) — unblock safety compliance
7. **BUG-11** (tokens[0] fallback) — fixes token selection
8. **BUG-10** (validateDistribution dead code) — closes validation gap
9. **BUG-15** (hydration error) — fixes console error visible to judges
10. **S-1 through S-7** (submission packaging) — judge readiness
11. **BUG-12, BUG-13, BUG-14** (visual fidelity) — design conformance
12. **Missing tests** — regression protection

---

## Reports from 8 Subagents (attached)

The full detailed reports from each agent are available in the conversation log. Key findings by agent:

1. **Data-identity audit** — 4 blocking bugs (BUG-1 through BUG-4), 4 suspected issues
2. **Gap engine & safety** — 3 blocking bugs (BUG-5, BUG-6, BUG-7), 9 non-blocking
3. **TxLINE client** — 4 blocking bugs (BUG-8, BUG-9, BUG-10, + BUG-5 confirmed), 9 non-blocking
4. **Polymarket client** — 3 blocking bugs (BUG-11, BUG-6 confirmed, BUG-2 confirmed), 7 non-blocking
5. **API routes + provider** — 3 blocking bugs (BUG-2 confirmed, BUG-3 confirmed, race condition), 6 non-blocking
6. **UI/UX + claims** — 4 blocking bugs (BUG-12, BUG-13, BUG-14, activate page), 8 non-blocking. Claims: PASS
7. **Tests + build** — 189/189 pass, 8 missing test categories, build PASS, 3 dependency issues
8. **Submission packaging** — 5 blocking gaps (S-1 through S-5), secrets clean, constraints mostly compliant

---

*Review conducted in worktree `/tmp/opencode/world-cup-edge-review` on branch `review/end-to-end-audit`. No code changes, no commits. This document is not committed.*