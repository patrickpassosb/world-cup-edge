# Fixture Mapping

How TxLINE fixture 18241006 maps to the Polymarket event and market.

## The match

| Field | Value |
|---|---|
| Match | England vs Argentina |
| Stage | FIFA World Cup 2026 Semi-finals |
| Date | July 15, 2026 |
| Kickoff | 19:00 UTC (16:00 BRT) |
| Venue | Neutral (World Cup) |

## TxLINE side

| Field | Value |
|---|---|
| Fixture ID | `18241006` |
| API endpoint | `GET /api/odds/snapshot/18241006` |
| Expected market | Regulation-time 1X2 (home/draw/away) |
| Outcome of interest | England win (regulation time) |
| Probability field | `Pct` array, index matching "England" in `PriceNames` |
| Deduplication | `MessageId` field |

### Unknown until first real payload inspection

- Exact `SuperOddsType` value for regulation-time 1X2
- Exact `MarketPeriod` value for regulation time
- Whether "England" appears as `Participant1` or `Participant2`
- Exact label in `PriceNames` (could be "England", "ENG", etc.)
- Position in `PriceNames`/`Prices`/`Pct` arrays

**The raw-data gate milestone prints the full odds payload and documents these values before any UI work.**

## Polymarket side

| Field | Value |
|---|---|
| Event slug | `fifwc-eng-arg-2026-07-15` |
| Market slug | `fifwc-eng-arg-2026-07-15-eng` |
| Gamma endpoint | `GET https://gamma-api.polymarket.com/events?slug=fifwc-eng-arg-2026-07-15` |
| Resolution | England winning in the first 90 minutes plus stoppage time (excludes extra time) |
| Market structure | Binary YES/NO market inside a negative-risk event |

### Token selection

The event contains multiple markets (England, Draw, Argentina). Each market has `outcomes` and `clobTokenIds` arrays.

For the England market:
1. Fetch the market by slug: `GET https://gamma-api.polymarket.com/markets?slug=fifwc-eng-arg-2026-07-15-eng`
2. Read `outcomes` and `clobTokenIds`
3. Find the index where `outcomes[i]` is "Yes" (or "England")
4. Select `clobTokenIds[i]` as the YES token ID
5. Fetch the book: `GET https://clob.polymarket.com/book?token_id={yesTokenId}`

### Runtime verification checks

Before any gap calculation, verify:

1. Event title or description mentions "England" and "Argentina"
2. Event start date is July 15, 2026
3. Market resolution wording confirms regulation time (90 minutes + stoppage)
4. Market `active` is true
5. Market `closed` is false
6. Market `acceptingOrders` is true
7. Outcome label at selected index is "Yes" or "England"
8. Token ID is a valid non-empty string
9. Book has non-empty `asks` array (for best ask)
10. Fee rate is fetched and is a valid number

If any check fails, suppress all alerts and display the specific failure reason.

## Equivalence

The comparison is valid ONLY when:

- TxLINE market is regulation-time 1X2 (not full-time, not extra-time, not qualification)
- Polymarket market resolves on England winning in regulation time (90 minutes + stoppage)
- Both refer to the same match on the same date

A regulation-time 1X2 "England win" is equivalent to a Polymarket "England YES (regulation time)" contract.

**Do not compare:**
- TxLINE regulation-time probability with Polymarket "advance to final" market
- TxLINE full-time probability with Polymarket regulation-time market
- Any cross-match comparison

## Other matches (future expansion, not for July 15)

| Date | Fixture ID | Match | TxLINE | Polymarket slug (estimated) |
|---|---|---|---|---|
| July 14 | 18237038 | France vs Spain | `GET /api/odds/snapshot/18237038` | TBD (search Gamma API) |

To map future fixtures:
1. Get fixture ID from TxLINE schedule
2. Search Polymarket Gamma API for the event by team names
3. Verify date and resolution wording
4. Document the mapping in this file
