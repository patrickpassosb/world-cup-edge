# Safety Rules

Fail-closed states and alert suppression rules. Every rule here exists because a specific failure mode would produce a false alert or an unsafe claim.

## Prime directive

When in doubt, suppress. A missed real opportunity is recoverable. A false alert from bad data destroys trust.

## Per-source freshness

### TxLINE

- Record the source timestamp (`Ts` field) and the local receive time
- If `Ts` age exceeds `maxAgeMs` (30 seconds for level 12, 120 seconds for level 1), mark stale
- Stale data: display last good values with a "stale" indicator, suppress all alerts
- If `Pct` is `"NA"` or arrays are malformed, mark unavailable

### Polymarket

- Record the book timestamp/seq and the local receive time
- If age exceeds `maxAgeMs` (10 seconds), mark stale
- Stale data: display last good values with a "stale" indicator, suppress all alerts
- If book is empty (no asks or no bids), mark unavailable

### Cross-source skew

- If the difference between TxLINE `Ts` and Polymarket book timestamp exceeds `maxSourceSkewMs` (15 seconds), suppress alerts
- Display both timestamps so the user can see the skew

## Service level

- If TxLINE is on service level 1 (60-second delay), suppress all alerts
- Display "60-second delayed" prominently
- Level 1 is acceptable for integration testing, not for live alerts

## Market state

Suppress all alerts if ANY of these are true:

- Polymarket market `active` is false
- Polymarket market `closed` is true
- Polymarket market `acceptingOrders` is false
- Polymarket book `asks` array is empty (no liquidity to buy)
- Polymarket book `bids` array is empty (no liquidity to sell)
- TxLINE `GameState` is 6 (cancelled)

## Contract equivalence

Suppress all alerts if ANY of these fail:

- TxLINE `SuperOddsType` does not match regulation-time 1X2
- TxLINE `MarketPeriod` does not confirm regulation time
- Polymarket resolution wording does not confirm regulation time (90 minutes + stoppage)
- Teams do not match (England and Argentina on both sides)
- Match date does not match (July 15, 2026)
- Selected token does not correspond to the England YES outcome

## Alert logic

### Threshold

- Initial threshold: 5 percentage points (0.05)
- `gapAfterFee` must exceed threshold (strictly greater, not equal)
- Threshold is configurable in `config.ts`

### Consecutive samples

- Gap must exceed threshold for 2 consecutive poll cycles
- If the first sample qualifies but the second doesn't, reset the counter
- This prevents transient spikes from producing alerts

### Cooldown

- After an alert fires, suppress new alerts for 60 seconds
- Cooldown is per-market, not global
- During cooldown, continue calculating and displaying the gap, but don't emit new alerts

### Deduplication

- Use TxLINE `MessageId` + Polymarket book hash as a unique key
- If the same `MessageId` and book state produce another alert, suppress it
- This prevents re-alerting when the data hasn't actually changed

## Kickoff behavior

Polymarket has `clearBookOnStart: true`. At kickoff:

1. The book may empty temporarily
2. This must produce "market unavailable/resetting" in the dashboard
3. Do NOT interpret an empty book as an extreme gap
4. Resume normal processing when the book repopulates

## What "fail closed" means

- No alert is ever emitted from invalid, stale, or mismatched data
- The dashboard always shows the current state honestly
- Last good values may be displayed but are clearly marked stale
- The user can always see WHY alerts are suppressed (specific reason)
- The system never fabricates data or alerts to appear functional

## Testing safety

Every fail-closed condition must have a corresponding test:

| Condition | Test |
|---|---|
| TxLINE stale | Set `Ts` to 5 minutes ago, verify no alert |
| Polymarket stale | Set book timestamp to 5 minutes ago, verify no alert |
| Cross-source skew | Set timestamps 30 seconds apart, verify no alert |
| Empty book | Return empty asks/bids, verify no alert and "unavailable" status |
| Market closed | Set `closed=true`, verify no alert |
| Contract mismatch | Change team name, verify no alert and "mismatch" status |
| Level 1 delay | Set service level to 1, verify no alert and "delayed" display |
| Duplicate message | Send same `MessageId` twice, verify only one alert |
| Consecutive samples | Qualify first sample, disqualify second, verify no alert |
| Cooldown | Fire alert, immediately qualify again, verify suppressed |
