# FUTURE-FIXES.md — Tier B & C (Post-Hackathon)

**Context**: These bugs were identified during the end-to-end review (see `REVIEW.md`) but are NOT in scope for Tier A (the minimum viable hackathon submission). They should be fixed after the hackathon.

**Status legend**: BLOCKING = should fix before any production use. HIGH = should fix soon. MEDIUM = nice to have. LOW = cosmetic.

---

## Tier B: All blocking + visual + packaging (post-hackathon, ~6-8 hours)

### Visual fidelity (BUG-12, BUG-13, BUG-14)

#### BUG-12: Missing row of 7 state badges
**Severity**: HIGH (design non-conformance)
**Location**: `app/page.tsx:802-861` (`StatusStrip`)
**Description**: SPEC.md and HANDOFF.md require a row of 7 badges (Loading, Live, Stale, No alert, Alert, Unavailable, Error) each with a lucide icon + text label. Active state highlighted with cobalt underline. Inactive at 50% opacity. Current implementation renders a `StatusStrip` with 2 text rows instead.
**Fix**: Replace `StatusStrip` with a `StateBadgeRow` component rendering 7 badges. Each badge: lucide icon (Clock/Activity/AlertTriangle/Circle/WifiOff/XCircle/CheckCircle) + text label. Apply `border-b-2 border-primary` to active badge(s). Apply `opacity-50` to inactive.

#### BUG-13: Main match headline uses sans font, not serif
**Severity**: HIGH (typography)
**Location**: `app/page.tsx:454`
**Description**: DESIGN.md requires "Headlines → Source Serif 4". The `h1` uses `font-sans` (Source Sans 3).
**Fix**: Change `font-sans` to `font-serif` on the `h1` at page.tsx:454. One-line change.

#### BUG-14: Mobile text below 14px minimum
**Severity**: MEDIUM-HIGH (accessibility)
**Location**: `app/page.tsx` — ~21 occurrences of `text-xs` (12px)
**Description**: HANDOFF.md §Mobile requires "min 14px body". ~21 `text-xs` labels render at 12px on mobile, including footer disclaimers.
**Fix**: Bump mobile text to `text-sm` (14px) minimum. Use `text-sm md:text-xs` where desktop genuinely wants smaller text. At minimum, fix the footer disclaimers and all status labels.

### Submission packaging (S-4, S-5, S-6)

#### S-4: Record demo video
**Severity**: MEDIUM (hackathon)
**Description**: No demo video exists. M11.5 requires "demo video". Replay mode (`?demo=replay`) is the demo path and works.
**Fix**: Record a 60-90s screencast of `/?demo=replay` showing: replay banner, match picker, gap value, TxLINE/Polymarket columns, verification checks, alert firing. Capture screenshots of all 6 `MOCK_SCENARIO` states per HANDOFF.md:117-122.

#### S-5: Surface approved claims.md description
**Severity**: MEDIUM (submission)
**Description**: The approved description from docs/claims.md is not used anywhere user-visible.
**Fix**: Add to README.md opening paragraph or create `SUBMISSION.md` with the verbatim description: "World Cup Edge is a read-only consensus-gap monitor that compares TxLINE's cryptographically anchored sports data against Polymarket's live prediction market quotes. It identifies moments where the consensus probability and market price diverge, adjusted for fees, with full source provenance and contract verification. No trading. No AI. Deterministic analysis."

#### S-6: Fix README project structure
**Severity**: LOW (cosmetic)
**Description**: README shows `src/lib/...` but actual layout is `lib/...` (no `src/` directory).
**Fix**: Update README project structure section to match actual layout. Add mention of match picker, outcome switcher, replay mode, Fly.io deploy, `DATA_SOURCE`/`MOCK_SCENARIO` env vars.

### Additional blocking bugs (BUG-2 draw/away slugs — if not fully resolved by Tier A)

If Tier A's BUG-1 SOTA approach (remove hardcoded slugs, pass all 3 from picker) is correctly implemented, BUG-2 and BUG-4 are fully resolved. Verify after Tier A:
- `RealDataProvider` constructor accepts `drawMarketSlug` and `awayMarketSlug`
- `app/page.tsx` `doPoll` passes `drawMarketSlug`, `awayMarketSlug`, `eventSlug` in query params
- `app/api/snapshot/route.ts` parses and forwards all 3 slugs
- No regex `/-(eng|draw|arg)$/` anywhere in the codebase

If any of these are missing, implement them per FIX-SPEC.md BUG-2.

---

## Tier C: Non-blocking issues (production quality, ~12-16 hours total)

### Data quality

#### N-2: `extractYesToken` hardcodes "england" label match
**Severity**: HIGH
**Location**: `lib/polymarket/normalize.ts:22`
**Description**: `l.toLowerCase().includes("england")` is hardcoded. Non-England matches with team-name labels fail token selection.
**Fix**: Remove the `includes("england")` branch. Rely solely on `"yes"` / `"true"` for binary YES/NO markets. If Polymarket uses team-name labels (e.g., `["France", "No"]`), the function should match against the expected team name passed as a parameter.

#### N-3: Equivalence team matching doesn't strip accents
**Severity**: HIGH
**Location**: `lib/contract/equivalence.ts:23-26`
**Description**: `normalizeTeam` only does `trim().toLowerCase().replace(/\s+/g," ")`. Does NOT strip diacritics. "Côte d'Ivoire" (TxLINE) vs "Cote d'Ivoire" (Polymarket, accent-stripped) fails equivalence.
**Fix**: Add `.normalize("NFD").replace(/[\u0300-\u036f]/g,"")` to `normalizeTeam`. Add a test with accented team names.

#### N-4: `bookHash` uses timestamp, not `book.hash`
**Severity**: MEDIUM
**Location**: `lib/data/real-provider.ts:190-192`
**Description**: `ClobBook.hash` field exists but is never read. Dedup keys on `(messageId, bookTimestamp)` instead of `(messageId, bookHash)`.
**Fix**: Use `book.hash` (or compute a content hash from `bids`+`asks`) for `bookSeq`/`bookHash`.

#### N-5: Provider cache has no eviction
**Severity**: LOW
**Location**: `lib/data/index.ts:15`
**Description**: Module-level `Map<string, RealDataProvider>` grows unbounded.
**Fix**: Add an LRU cap (e.g., 20 entries) or clear entries when their match is deselected.

#### N-6: `state-machine.ts` `transition()` is dead code in production
**Severity**: LOW
**Location**: `lib/gap/state-machine.ts`
**Description**: `evaluateAlert` has an inline state machine. `transition()` is only used by tests. If they drift, tests pass while production breaks.
**Fix**: Either remove `state-machine.ts` or refactor `evaluateAlert` to delegate to `transition()`.

#### N-7: `delayedMaxAgeMs` (120s) configured but never used
**Severity**: MEDIUM
**Location**: `lib/config.ts:7`
**Description**: Level-1 freshness always uses 30s, never 120s.
**Fix**: Once BUG-5 (service level from API) is implemented, branch freshness calc on service level: `maxAgeMs = serviceLevel === 1 ? CONFIG.txline.delayedMaxAgeMs : CONFIG.txline.maxAgeMs`.

### Testing

#### N-8: `route.test.ts` required by ARCHITECTURE.md doesn't exist
**Severity**: MEDIUM
**Description**: No end-to-end route test. The route's error fallback, param parsing, and replay branching are untested.
**Fix**: Add `tests/route.test.ts` that mocks `createProvider` and tests the route handler directly.

#### N-9: Real-provider dedup branch has no test
**Severity**: MEDIUM
**Description**: `real-provider.ts:216-223` (`lastDedupeKey` comparison) is untested.
**Fix**: Add a test that instantiates `RealDataProvider`, calls `getSnapshot()` twice with the same data, and verifies the second alert is suppressed by dedup (not cooldown).

#### N-10: No test for accent-stripping in equivalence
**Severity**: MEDIUM
**Fix**: Add test with "Côte d'Ivoire" vs "Cote d'Ivoire" asserting equivalence passes.

#### N-11: No test for PascalCase→camelCase normalization
**Severity**: LOW
**Fix**: Add tests that feed raw PascalCase API responses to `normalizeFixtureFields` and `normalizeOddsFields`.

### Dependencies

#### N-12: `axios` is unused
**Severity**: LOW
**Location**: `package.json:19`
**Fix**: Remove `axios` from dependencies. Grep confirms zero imports.

#### N-13: `lucide-react` in devDependencies but used in production
**Severity**: MEDIUM
**Location**: `package.json:32`
**Description**: `app/page.tsx` imports from `lucide-react` (production code). It's in `devDependencies`. Works in dev, but `npm install --production` would miss it.
**Fix**: Move `lucide-react` to `dependencies`.

#### N-14: `@coral-xyz/anchor` + `tweetnacl` in deps but only used by activation script
**Severity**: LOW
**Fix**: Move to `devDependencies` (only used by `scripts/txline-activate.ts`).

### UI/UX

#### N-15: Dashboard doesn't display specific equivalence failure reasons
**Severity**: MEDIUM
**Location**: `app/page.tsx:623-627`
**Description**: `equivalence.failures[]` is populated but not rendered. Generic "Contract equivalence checks failed" shown.
**Fix**: Render `equivalence.failures` in the UI when `equivalence.passed === false`.

#### N-16: Health route is liveness-only, not readiness
**Severity**: LOW
**Location**: `app/api/health/route.ts`
**Fix**: Probe TxLINE and Polymarket reachability in the health check.

#### N-17: No polling backoff on persistent error
**Severity**: LOW
**Location**: `app/page.tsx:355`
**Fix**: Add exponential backoff (double interval up to 30s) when `displayState === "error"` for N consecutive polls.

#### N-18: Activate page uses rounded corners
**Severity**: LOW
**Location**: `app/activate/activate-client.tsx:480,534,543`
**Description**: `borderRadius: 4` violates "sharp 0px corners" design system.
**Fix**: Set `borderRadius: 0` or migrate to Tailwind classes with `rounded-none`.

#### N-19: Header hardcodes "19:00 UTC"
**Severity**: LOW
**Location**: `app/page.tsx:458`
**Fix**: Derive time from `selectedMatch.kickoffUTC`.

#### N-20: Replay session alert shows "England vs France" while match is "England vs Argentina"
**Severity**: MEDIUM
**Location**: `app/page.tsx` session alerts section
**Description**: Mock provider uses `MATCH` (England vs France after S-7 fix: England vs Argentina) while replay uses `REPLAY_MATCH` (England vs Argentina). After S-7, these should align. Verify post-fix.
**Fix**: After S-7 aligns MATCH to England vs Argentina, verify the session alert identity matches. If not, thread the match name from the snapshot into the session alert.

#### N-21: Two `isRegulationTime1X2` functions with different logic
**Severity**: LOW
**Location**: `lib/txline/normalize.ts:31` vs `lib/contract/equivalence.ts:43`
**Fix**: Consolidate into one function or document the asymmetry.

### Architecture

#### N-22: `txline-provider.ts` is dead code
**Severity**: TRIVIAL
**Location**: `lib/data/txline-provider.ts`
**Fix**: Delete the file. Not imported anywhere.

#### N-23: `FIFA_TEAM_CODES` fallback `key.slice(0,3)` wrong for multi-word teams
**Severity**: LOW
**Location**: `lib/polymarket/client.ts:151`
**Fix**: For multi-word keys, take the first letter of each significant word (e.g., "United States" → "us" → pad, or use a different strategy).

#### N-24: `fetchMarket` falls back to `event.markets[0]`
**Severity**: MEDIUM
**Location**: `lib/polymarket/client.ts:43`
**Description**: If the requested slug isn't found, returns the first market (might be a different team's market).
**Fix**: Return `null` if the specific slug isn't found.

### Data identity (verified during Tier A review)

#### BUG-8: `MarketPeriod: null` verified — no change needed
**Severity**: NONE (verified)
**Location**: `lib/txline/normalize.ts:46`
**Description**: Verified against the live TxLINE API on 2026-07-18 for fixture 18257865. The odds snapshot returns 27 rows. The regulation-time `1X2_PARTICIPANT_RESULT` row is the one with `MarketPeriod: null` (the row with `MarketPeriod: "half=1"` is the first-half market). `null` IS the regulation-time marker for this API — rejecting it would break the only working row selector. The handoff doc (`docs/match-picker-handoff.md:333`) is correct that `null` means "full match"; for a 1X2 market, "full match" = regulation time (90-min result). No code change. Document here for future maintainers.

---

*These fixes are documented for future work. They are NOT required for the hackathon submission. See `FIX-SPEC.md` for the Tier A fixes that ARE in scope.*