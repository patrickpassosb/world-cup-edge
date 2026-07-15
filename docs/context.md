# Context

Links between this repository and the research that produced it.

## Origin

This project was planned in Patrick Passos's Obsidian vault:

```
~/Documentos/obsidian-vault/Hackathons/World Cup Hackathon Brasil 2026/
```

The vault folder contains the full research history: demand evidence, problem analysis, competitive analysis, tech stack notes, trader outreach list, and conversation logs. This repo contains the implementation.

## Hackathon

- **Name:** World Cup Hackathon Brasil (TxODDS x Solana)
- **Organizers:** Superteam Brasil + TxODDS
- **Build window:** June 24 - July 18, 2026
- **In-person day:** Saturday July 18, Solana House SP, Sao Paulo
- **Final submission:** July 18, 2026, 23:59
- **Track:** Trading Tools and Agents ($16K global) + Brasil local listing ($2K USDG)
- **Luma:** https://luma.com/0gkcww39
- **Superteam Earn:** https://superteam.fun/earn/listing/world-cup-hackathon-brasil

## Key research files in the vault

| Vault file | What's in it |
|---|---|
| `world-cup-hackathon-brasil.md` | Main note with hackathon overview and decision status |
| `Demand Evidence.md` | 33+ research findings with URLs, quotes, sources |
| `Problem Analysis.md` | 5 real problems mapped to evidence |
| `Project Options.md` | 3 project options + A+B hybrid comparison |
| `Competitive Analysis.md` | Does the A+B hybrid exist? (No — the gap is real) |
| `Tech Stack.md` | Original full architecture (this repo simplifies it) |
| `TxLINE API Reference.md` | Original technical reference (this repo's docs/txline-api.md supersedes) |
| `Trader Outreach.md` | 5 reachable traders to validate with |
| `Conversation Log.md` | Full decision conversation history |

## Patrick's context

- Brazil-based technical builder
- Solana skill level: 2.5/5 (some exposure, never shipped a real Solana app)
- Prior relevant build: Kraken DaD (visual trading-strategy platform, solo, agent on live trading data with validation)
- Does NOT want to build a gambling product
- Open to prediction markets (different from gambling)
- Goal: build something people want, win the hackathon, build Solana credibility
- Active startup: Listo (resale/shipping marketplace)

## Market size (TAM/SAM/SOM)

Sourced from public data, July 2026:

| Metric | Value | Source |
|---|---|---|
| Combined Kalshi + Polymarket monthly volume (April 2026) | ~$24B | Pew Research / The Block |
| Monthly unique wallets on prediction markets (Feb 2026) | 840,000 | TRM Labs |
| Sports share of Kalshi volume | 80% | Pew Research |
| Sports share of Polymarket volume | 39% | Pew Research |
| Sports prediction market 24h volume (July 14, 2026) | $772.7M | DeFi Rate |
| World Cup projected volume (US) | $2.5B | DeFi Rate forecast |
| Kalshi annualized revenue (June 2026) | $3.5B | Sacra |
| Kalshi valuation (May 2026) | $22B | Sacra |

### TAM

~840K-2M prediction-market participants. At $20-50/month for analytics tools, theoretical ceiling is ~$200M-$1.2B/year. This is an estimate, not observed spending.

### SAM

Serious sports traders using tools frequently. Assuming 5-10% of participants at $29-49/month: ~$15M-$118M/year. Needs validation.

### SOM

Realistic first business: 500 paying users at $29/month = ~$174K ARR. The hackathon target is much smaller: 5 real testers and repeated use during a live match.

## Business model (future, not hackathon scope)

Freemium SaaS:
- Free: delayed dashboard, limited alerts
- Pro (~$29-49/month): real-time monitoring, custom thresholds, more markets, notifications
- API/team (~$199/month): webhooks, historical data, integrations

Billing is not part of the hackathon MVP.

## Decisions made during planning

1. Build the A+B hybrid (AI agent + on-chain proof) — but simplified to a deterministic consensus-gap monitor for the first version
2. Target: Trading Tools and Agents track
3. First test: England vs Argentina, July 15, 19:00 UTC
4. Market venue: Polymarket (largest trader audience, clearest demand evidence)
5. No LLM in the first version (LLM explains alerts later, never invents them)
6. No wallet, no trading, no billing in the first version
7. Design via Google Stitch (three variants, select one, implement)
8. Validate with active traders while building
