# Polymarket API Reference

Compiled from official docs at https://docs.polymarket.com and live API observations.

## Overview

Polymarket has two APIs for read-only market data:

1. **Gamma API** - market discovery, event/market metadata, outcome/token pairing
2. **CLOB API** - order book, best bid/ask, fee configuration

Neither requires authentication for read-only access.

## Gamma API

Base URL: `https://gamma-api.polymarket.com`

### Fetch event by slug

```bash
curl "https://gamma-api.polymarket.com/events?slug=fifwc-eng-arg-2026-07-15"
```

Or:
```bash
curl "https://gamma-api.polymarket.com/events/slug/fifwc-eng-arg-2026-07-15"
```

### Fetch market by slug

```bash
curl "https://gamma-api.polymarket.com/markets?slug=fifwc-eng-arg-2026-07-15-eng"
```

### Key response fields

Event response:
- `slug`: event slug
- `title`: event title
- `markets`: array of market objects

Market object:
- `conditionId`: condition ID (hex string)
- `slug`: market slug
- `outcomes`: array of outcome labels (e.g., `["Yes", "No"]`)
- `clobTokenIds`: array of token IDs (positional match with `outcomes`)
- `active`: boolean
- `closed`: boolean
- `acceptingOrders`: boolean
- `bestBid`, `bestAsk`: from Gamma (use CLOB for execution-quality data)
- `outcomePrices`: array of prices (use CLOB book for real quotes)
- `startDate`, `endDate`: market timing

### Token pairing (CRITICAL)

`outcomes` and `clobTokenIds` are positional arrays. Do NOT assume index 0 is "Yes" or "England."

Example:
```json
{
  "outcomes": ["Yes", "No"],
  "clobTokenIds": ["12345...", "67890..."]
}
```

You must verify the label at each index before selecting a token ID.

For the England market, the YES token corresponds to England winning. Verify by checking:
1. The outcome label matches "Yes" or "England"
2. The event description mentions England
3. The market question confirms regulation-time resolution

### Fetch all active markets

```bash
curl "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100"
```

### Filter by tags (sports)

```bash
curl "https://gamma-api.polymarket.com/events?tag_id=100381&limit=10&active=true&closed=false"
```

### Pagination

All list endpoints are paginated with `limit` and `offset`:
```bash
curl "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&offset=0"
curl "https://gamma-api.polymarket.com/events?active=true&closed=false&limit=50&offset=50"
```

## CLOB API

Base URL: `https://clob.polymarket.com`

### Fetch order book

```bash
curl "https://clob.polymarket.com/book?token_id={tokenId}"
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

### Best bid/ask extraction

- **Best bid = maximum bid price** (highest price someone will pay)
- **Best ask = minimum ask price** (lowest price someone will sell for)

Do NOT assume array index 0 is the best price. Sort or reduce to find the extrema.

```typescript
const bestBid = Math.max(...book.bids.map(b => parseFloat(b.price)));
const bestAsk = Math.min(...book.asks.map(a => parseFloat(a.price)));
```

Handle empty arrays: if `bids` or `asks` is empty, that side has no liquidity. Display "no liquidity" and suppress alerts.

### Price semantics warning

The `/price` endpoint has order-side semantics:
- `side=BUY` returns the best bid (what buyers are offering)
- `side=SELL` returns the best ask (what sellers are asking)

This is OPPOSITE the intuitive "price to buy" interpretation. Use the `/book` endpoint directly and calculate extrema to avoid confusion.

## Fee configuration

Polymarket sports taker fees are enabled with a rate (observed: `0.05`). The fee rate is per-market and must be fetched dynamically from the market configuration.

Fee calculation per share:
```
feePerShare = feeRate * price * (1 - price)
```

For a share at price $0.39 with feeRate 0.05:
```
feePerShare = 0.05 * 0.39 * (1 - 0.39) = 0.05 * 0.39 * 0.61 = 0.0119
```

Do not hardcode the fee rate. Fetch it from the market config.

## Known event for July 15

| Field | Value |
|---|---|
| Event slug | `fifwc-eng-arg-2026-07-15` |
| England market slug | `fifwc-eng-arg-2026-07-15-eng` |
| Resolution | England winning in the first 90 minutes plus stoppage time (excludes extra time) |
| Market structure | Three binary markets (England, Draw, Argentina) inside a negative-risk event |

**This information was observed on July 14, 2026. Always re-verify at runtime via the Gamma API before calculating anything.**

## Brazil geoblock

Polymarket geoblocks Brazil for order placement. The market may be marked as restricted. Public read-only market-data access (Gamma API, CLOB book) works from Brazil.

Never describe the displayed quote as "executable" from Brazil. Use "top-of-book quote."

## Kickoff behavior

Polymarket has `clearBookOnStart: true` for sports markets. At kickoff, the order book may temporarily empty or reset. This must produce "market unavailable/resetting" in the dashboard, not an extreme signal.

## Rate limits

No documented rate limits for read-only access. Be reasonable: poll every 2-5 seconds, not every 100ms.

## Documentation links

- Gamma API docs: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
- CLOB API docs: https://docs.polymarket.com/developers/CLOB
- Full docs index: https://docs.polymarket.com/llms.txt
