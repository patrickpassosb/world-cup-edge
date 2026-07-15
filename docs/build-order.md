# Build Order

Milestone-ordered implementation plan. Do not skip milestones or reorder them. Each milestone has a gate: if the gate fails, stop and fix before proceeding.

## Milestone 1: TxLINE activation

**Output:** Mainnet service level 12 JWT and API token, stored in `.env.local`
**Time box:** 1-2 hours

1. Create or use a mainnet Solana wallet with a small SOL balance
2. Load the mainnet IDL/types from TxLINE docs
3. Verify service-level-12 exists in the pricing matrix
4. Call `subscribe(12, 4)` on the Txoracle program
5. Sign the activation message: `${txSig}::${jwt}`
6. `POST /api/token/activate` with the signed message
7. Store JWT and API token in `.env.local`
8. Test: `GET /api/fixtures/snapshot` returns fixtures

**Gate:** Fixture snapshot request succeeds with valid auth headers. If activation fails, stop. UI work does not mitigate this blocker.

## Milestone 2: Raw-data gate

**Output:** Documented odds payload structure for fixture 18241006
**Time box:** 1 hour

1. Print the complete odds response for `GET /api/odds/snapshot/18241006`
2. Identify the regulation-time 1X2 row (inspect `SuperOddsType` and `MarketPeriod`)
3. Document the observed `SuperOddsType`, `MarketPeriod`, labels, and units
4. Identify which position in `PriceNames`/`Pct` arrays corresponds to England
5. Verify the three probabilities form a plausible distribution
6. Record how suspension or missing data is encoded

**Gate:** A real odds payload is printed, inspected, and documented. The England probability is identified with confidence. If the payload structure doesn't match expectations, update `docs/txline-api.md` before proceeding.

## Milestone 3: Polymarket contract gate

**Output:** Verified Polymarket market rules, YES token, book, and fee
**Time box:** 1 hour

1. Fetch the event: `GET https://gamma-api.polymarket.com/events?slug=fifwc-eng-arg-2026-07-15`
2. Verify teams, date, start time in the event metadata
3. Fetch the England market: `GET https://gamma-api.polymarket.com/markets?slug=fifwc-eng-arg-2026-07-15-eng`
4. Verify resolution wording confirms regulation time
5. Pair `outcomes` with `clobTokenIds`, select the YES token
6. Fetch the book: `GET https://clob.polymarket.com/book?token_id={yesTokenId}`
7. Calculate best bid (max) and best ask (min) from the real response
8. Fetch and document the fee rate from the market config
9. Verify `active`, `closed`, `acceptingOrders` flags

**Gate:** All runtime equivalence checks pass against live data. The YES token ID and fee rate are documented. If the market cannot be confirmed as regulation-time, stop.

## Milestone 4: Headless vertical slice

**Output:** Server route returning normalized JSON
**Time box:** 1.5-2 hours

1. Scaffold Next.js project (if not done)
2. Implement `src/lib/txline/client.ts` (auth, fixtures, odds snapshot)
3. Implement `src/lib/txline/normalize.ts` (Pct conversion, label mapping, validation)
4. Implement `src/lib/polymarket/client.ts` (Gamma, CLOB book, fee fetch)
5. Implement `src/lib/polymarket/normalize.ts` (token pairing, best bid/ask)
6. Implement `src/lib/contract/equivalence.ts` (runtime checks)
7. Implement `src/lib/gap/engine.ts` (gross gap, fee-adjusted gap, alert logic)
8. Implement `src/app/api/snapshot/route.ts` (orchestrates everything)
9. Exercise the route repeatedly with `curl localhost:3000/api/snapshot`

**Gate:** The route returns a valid JSON object with probability, best ask, gap, fee, freshness, and status. No dashboard work until this is stable.

## Milestone 5: Fail-closed behavior

**Output:** All invalid states suppress alerts correctly
**Time box:** 1.5-2 hours

1. Add stale data detection (per-source age thresholds)
2. Add cross-source timestamp skew check
3. Add empty book handling (expect at kickoff)
4. Add market-closed/not-active/not-accepting-orders handling
5. Add contract mismatch handling
6. Add delayed mode (service level 1) alert suppression
7. Add `MessageId` deduplication
8. Add consecutive sample confirmation (2 samples)
9. Add cooldown period (60 seconds)
10. Add alert threshold configuration (5 pp initial)

**Gate:** Every invalid state produces the correct suppressed response. No alert fires from stale, missing, or mismatched data.

## Milestone 6: Minimal tests

**Output:** Test suite covering normalization, mapping, fee, gap, and state machine
**Time box:** 1.5-2 hours

Tests to write (see ARCHITECTURE.md for the full list):

- Pct percentage-to-probability conversion and "NA"
- Positional alignment and length checks
- Three-way sum/invariant with rounding tolerance
- Team/selection mapping independent of nominal home venue
- Polymarket outcomes-to-token pairing
- CLOB best bid/ask as extrema
- Fee calculation
- Empty book at kickoff
- Out-of-order or duplicate TxLINE messages
- Cross-source timestamp skew
- Alert hysteresis, cooldown, and deduplication
- Runtime contract mismatch
- Level-1 delayed mode suppressing alerts

All test payloads must match observed real response shapes (with secrets removed).

**Gate:** All tests pass. Mocks match real payload shapes.

## Milestone 7: One-page dashboard

**Output:** Dashboard rendering the normalized server output
**Time box:** 1.5-2 hours (after design is approved)

1. Use the approved Stitch design (or hand-coded mockup if Stitch unavailable)
2. Render: match identity, countdown, gap result, comparison, freshness, verification, history
3. Poll `/api/snapshot` every 2-5 seconds from the client
4. Implement all 7 states: loading, live, stale, no-alert, alert, unavailable, error
5. Session alert history in browser state (localStorage or in-memory)
6. Mobile-responsive at 375px, 768px, 1280px

**Gate:** Dashboard renders correctly in all states. Polling works. No console errors.

## Milestone 8: Dress rehearsal

**Output:** Continuous pre-match run with screen recording
**Time box:** 1 hour

1. If July 14 France-Spain window is available, rehearse against fixture 18237038
2. Otherwise run continuously against England-Argentina pre-match data
3. Verify reconnects, no-cache behavior, clock calculations
4. Verify temporary missing data is handled gracefully
5. Record at least one pre-match working run as fallback evidence

**Gate:** At least 10 minutes of stable continuous operation with no false alerts.

## Milestone 9: July 15 live run

**Output:** Evidence from the live match

1. Start the local application by 15:00 BRT (18:00 UTC)
2. Confirm both sources and contract equivalence by 15:15 BRT
3. Start screen and log recording by 15:30 BRT
4. Expect temporary market suspension or book resets around 16:00 BRT (19:00 UTC)
5. Treat "no alert" as a valid result if the market is efficient
6. Do not modify mapping or edge logic during the match after capturing a working run

## Milestone 10: Trader outreach

**Output:** Feedback from 1-3 active traders

1. Send a working screenshot or local preview to 3 traders from the vault's Trader Outreach list
2. Describe the actual build: "TxLINE consensus vs Polymarket top-of-book monitor"
3. Ask:
   - Is this comparison part of your current workflow?
   - Would this save time or change what you investigate?
   - What minimum gap and freshness would matter?
   - Does source provenance matter, or is speed more important?
   - Would you use this for another match?
4. Record responses in the Obsidian vault

## Milestone 11: Post-live hackathon differentiation

**Output:** Odds validation, replay mode, and hackathon demo polish

1. Add odds-record validation using TxLINE's odds validation path
2. Determine whether displayed `Pct` can be recomputed from validated raw prices
3. Add a clearly labeled synthetic/replay mode for the hackathon demo
4. Add score-stat validation as a separately labeled provenance feature
5. Prepare the hackathon submission (description, demo video, repo)
