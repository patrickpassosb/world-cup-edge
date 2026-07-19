# World Cup Edge — Hackathon Submission

This document contains everything needed to submit to the three Superteam Earn listings:
- Trading Tools and Agents (TxODDS, global, 16k USDT)
- World Cup Hackathon Brasil (Superteam Brasil, BR, 2,000 USDG)
- World Cup Hackathon Brasil - Solana House Demo Day (Superteam Brasil, BR, private, 1,200 USDG)

All three listings close July 19, 2026 at 23:59 UTC.

---

## Project Description (Portuguese — for Brasil listings)

> Um dashboard que avisa traders de mercados de previsão quando o preço da Copa no Polymarket está fora do consenso das casas de apostas profissionais. Os dados esportivos têm prova criptográfica na Solana.

## Project Description (English — for global Trading Tools and Agents track)

> A dashboard that alerts prediction-market traders when Polymarket's World Cup price is out of line with sharp sports-book consensus. The sports data is cryptographically proven on Solana.

---

## Technical Documentation

**Core idea.** World Cup Edge is a read-only consensus-gap monitor for prediction-market traders. It pulls cryptographically anchored sports probabilities from TxLINE's Solana-anchored `txoracle` program, fetches the matching top-of-book quote from Polymarket's CLOB, and deterministically emits an alert when the two probabilities diverge beyond a configurable threshold. There is no LLM, no wallet connection for trading, and no order placement — the gap engine is pure arithmetic, and every alert fails closed on stale or mismatched data.

**Technical highlights.**
- Next.js 14 App Router + TypeScript + Tailwind/shadcn; Vitest for tests (277 passing); no database (session state in localStorage).
- Two-step TxLINE credential model: a 30-day guest JWT plus an on-chain-activated API token, both required on every data request.
- On-chain subscription via the `subscribe(12, 4)` instruction on the `txoracle` program (service level 12 = real-time World Cup, 4-week duration), paid for with 0 TxL tokens on the free tier.
- Deterministic equivalence checks: market slug match, event-membership check, CLOB `asset_id`/`conditionId` round-trip verification, and regulation-time 1X2 selection from `superOddsType`/`marketPeriod` — any mismatch suppresses alerts.
- Polymarket fees fetched dynamically per market (never hardcoded); best bid/ask computed as extrema of the `/book` response, not assumed from index 0.

**TxLINE endpoints used.**
- `POST /auth/guest/start` — obtain a 30-day guest JWT (no auth).
- `POST /api/token/activate` — exchange a signed activation message (`{txSig, walletSignature, leagues:[]}`, `Authorization: Bearer ${jwt}`) for the API token.
- `GET /api/fixtures/snapshot` — list fixtures (`Authorization: Bearer ${jwt}`, `X-Api-Token`).
- `GET /api/odds/snapshot/{fixtureId}` — fetch the anchored odds payload for one fixture (same headers).

**Polymarket endpoints used (read-only, no auth).**
- `GET https://gamma-api.polymarket.com/events?slug={slug}` — resolve an event by slug.
- `GET https://gamma-api.polymarket.com/markets?slug={slug}` — resolve a market by slug.
- `GET https://gamma-api.polymarket.com/events?active=true&closed=false&limit={n}` — discover active soccer events.
- `GET https://clob.polymarket.com/book?token_id={tokenId}` — top-of-book bids/asks for the YES token.
- `GET https://clob.polymarket.com/clob-markets/{conditionId}` — taker/maker fee configuration for fee-aware gap math.

**On-chain program integration.**
- Program: `txoracle` (Anchor, v1.5.6). Mainnet program ID `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` (devnet `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`).
- Instruction invoked: `subscribe(service_level_id: u16, weeks: u8)` — discriminator `[254,28,191,138,156,179,183,53]`, called with `(12, 4)` against the `pricing_matrix` and `token_treasury_v2` PDAs and the TxL token mint `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL` (Token-2022 program). The returned tx signature is Ed25519-signed by the wallet and sent to `/api/token/activate` to mint the API token. The app is read-only after activation; no other on-chain instruction is called.

---

## TxLINE API Feedback

**What worked well.** The single normalized JSON schema across competitions is the strongest part of the TxLINE API — we integrated fixtures and odds once and the same code path handles every World Cup match without per-competition tweaks. Cryptographic anchoring on Solana via the `txoracle` program gives the data a verifiable provenance story that no other sports-data provider offers. The free tier (service level 12, real-time, zero TxL cost) made it possible to build a real-time tool without upfront capital. The `fixtures/snapshot` and `odds/snapshot/{fixtureId}` endpoints return exactly the fields we needed (MessageId for dedup, superOddsType + marketPeriod for regulation-time selection, serviceLevel for freshness gating) in a stable, well-documented shape.

**Where we hit friction.** Three things stood out. (1) The on-chain activation flow requires a Token-2022 ATA for the TxL mint, which most wallets don't auto-create — we had to build a custom browser activation flow (`/activate` page) that constructs the `subscribe` instruction with the raw 8-byte discriminator because the Anchor browser bundle didn't play cleanly with our Next.js build. A reference frontend or a one-click activation endpoint would dramatically reduce onboarding friction. (2) The `marketPeriod: null` field on `participant_result` rows was ambiguous — we initially treated null as "missing data" and suppressed alerts, but live API inspection revealed that null is the correct marker for regulation-time 1X2 markets (vs `"ft"`, `"ht"`, `"et"`, etc. for other periods). Documenting this explicitly in the World Cup docs would save every builder the same investigation. (3) Pre-match consensus updates arrive roughly once per minute, which is fine for a desktop monitor but means our 30s freshness threshold marks data as "stale" during the pre-match window. A documented expected update cadence per service level (and per match phase) would help builders set `maxAgeMs` correctly instead of guessing.

---

## Demo Video Script (≤5 min, for recording reference)

Open these tabs in your browser before recording:
- `https://world-cup-edge.fly.dev/`
- `https://world-cup-edge.fly.dev/?demo=replay`
- `https://world-cup-edge.fly.dev/activate`

Aim for ~3:30, well under the 5:00 limit.

| Time | Section | What to show / say |
|---|---|---|
| 0:00–0:20 | Hook | Open `https://world-cup-edge.fly.dev/`. "Prediction markets and sports-data feeds rarely agree in real time. World Cup Edge shows you exactly when they don't — deterministically, with no AI in the loop." |
| 0:20–0:50 | The problem | Point at the focal gap number. "This is the consensus gap: TxLINE's Solana-anchored probability minus Polymarket's top-of-book quote. When they diverge beyond a threshold, we fire an alert. Not an arbitrage guarantee — a deterministic gap signal." |
| 0:50–1:30 | Live mode | Show the current match (Spain vs Argentina or whatever is live). Walk through the match picker, outcome picker (home/draw/away), the two-column TxLINE vs Polymarket view. Point at the freshness indicators. Explain: "Right now the gap is showing but alerts are suppressed because pre-match consensus updates arrive roughly once a minute, exceeding our 30s freshness threshold. This is fail-closed by design." |
| 1:30–2:30 | Replay mode (alert) | Switch to `https://world-cup-edge.fly.dev/?demo=replay`. "To demonstrate the alerting state, here's replay mode — a deterministic historical scenario." Show the alert badge, the threshold warning, the session alerts log. Explain the state machine: IDLE → SAMPLING → ALERTING → COOLDOWN. |
| 2:30–3:10 | TxLINE backend | Open `https://world-cup-edge.fly.dev/activate`. "TxLINE credentials are activated on-chain. We call the `subscribe(12, 4)` instruction on the `txoracle` program on Solana mainnet — service level 12 is real-time World Cup, 4 weeks duration. The wallet signs an activation message, we post it to TxLINE's `/api/token/activate` endpoint, and we get back an API token. From there every data request sends both the JWT and the API token." Mention the program ID `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA`. |
| 3:10–3:30 | Architecture + close | "Two sources, both read-only: TxLINE `odds/snapshot` for anchored probabilities, Polymarket `book` for top-of-book quotes. Dynamic fees from the CLOB. Equivalence checks run on every poll — teams, date, regulation-time 1X2, token label, market state, condition ID, asset ID. Any mismatch suppresses alerts. 277 tests, deterministic, no LLM, no wallet for trading. Repo link in the description." |

Record with Loom (easiest — browser extension, auto-uploads, gives you a share link). If Loom fails, OBS → upload to YouTube unlisted.

---

## Submission Checklist

- [ ] Demo video recorded (Loom/YouTube link)
- [ ] Repo URL: https://github.com/patrickpassosb/world-cup-edge
- [ ] Deploy URL: https://world-cup-edge.fly.dev/
- [ ] Technical docs pasted into form (from the "Technical Documentation" section above)
- [ ] TxLINE feedback pasted into form (from the "TxLINE API Feedback" section above)
- [ ] Submit to Trading Tools and Agents (global, 16k USDT) — use EN description
- [ ] Submit to World Cup Hackathon Brasil (BR, 2,000 USDG) — use PT description
- [ ] Submit to Solana House Demo Day (BR, private, 1,200 USDG) — use PT description

---

## Deadlines

All three listings close **July 19, 2026 at 23:59 UTC**.

Winner announcement dates (different from submission deadlines):
- Trading Tools and Agents: July 29, 2026
- World Cup Hackathon Brasil: July 26, 2026
- Solana House Demo Day: July 26, 2026

---

## Submission rules (from the listings)

- Teams of 1 to 3 people
- TxLINE must be the primary data source
- Must be a functional build — pitch deck, wireframe, or mockup is automatic disqualification
- Project must be new, built for this hackathon
- Deploy on mainnet or devnet, both valid
- Demo video is an absolute requirement — without video, submission does not pass initial screening