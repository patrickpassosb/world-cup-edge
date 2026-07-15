# HANDOFF — Vision Model Visual Polish

This document is for a vision-capable model to recursively polish the World Cup Edge dashboard until it matches the approved Stitch design at 100% visual fidelity.

## Context

The app was built structurally by a non-vision model (GLM-5.2). It passes typecheck, lint, and 83 tests. The structural work is complete — this handoff is for visual fidelity only: spacing, typography, color accuracy, alignment, and state badge styling.

## What to compare

### Running app
```bash
cd /home/patrickpassos/GitHub/work/world-cup-edge
npm run dev
# App runs at http://localhost:3000
```

### Design references (approved Stitch output)

| Breakpoint | Design HTML | Design PNG |
|---|---|---|
| Desktop 1280px | `design/stitch-previews/editorial-light.html` | `design/stitch-previews/editorial-light.png` |
| Tablet 768px | `design/stitch-previews/tablet-768.html` | `design/stitch-previews/tablet-768.png` |
| Mobile 375px | `design/stitch-previews/mobile-375.html` | `design/stitch-previews/mobile-375.png` |

Open the PNG files to see the target visual. Open the HTML files in a browser to inspect exact classes/colors/spacing.

### Approved Stitch screen (source of truth)
- Stitch project ID: `836184704891813075`
- Screen ID: `b4e47514ae3345468b91e56284daae73`
- Design system: Editorial Light (warm off-white #faf7f2, charcoal #1f1f1f, cobalt #1e40af)

## How to screenshot the running app

Use the chrome-devtools MCP (configured in `opencode.json`):

```
chrome-devtools MCP tools can navigate to http://localhost:3000,
screenshot at 1280px / 768px / 375px viewport widths,
and return the screenshot for visual comparison.
```

Alternatively, use headless Chrome:
```bash
google-chrome --headless --disable-gpu --no-sandbox --window-size=1280,1800 \
  --screenshot=/tmp/app-desktop.png "http://localhost:3000"
```

## Visual checklist — compare running app to design PNG

### Desktop (1280px)
1. **Header**: Match title "England vs Argentina" in serif, large. Subtitle with date/time/rules. Countdown timer in mono.
2. **Focal point**: "+4.2 pp" gap value in cobalt (#1e40af), JetBrains Mono, largest numeral on the page. Label below. Plain-language explanation.
3. **Two columns**: TxLINE (left) and Polymarket (right) side-by-side, separated by hairline divider. NOT stacked cards.
4. **TxLINE column**: 54.8% in mono, "England to win (regulation time)", freshness "live · 11s ago" with dot icon, verification checklist with 4 checkmarks.
5. **Polymarket column**: 50.6% labeled "best ask" (NOT "executable"), "England YES · top-of-book quote", freshness "live · 4s ago", "+3.7 pp" labeled "Gap after fee".
6. **Seven state badges**: Row of 7 badges (Loading, Live, Stale, No alert, Alert, Unavailable, Error) each with a lucide icon + text label. Active state (Live + No alert) highlighted with cobalt underline. Inactive states at 50% opacity.
7. **Session alerts**: Title "Session alerts", example row or empty state "No alerts generated this session."
8. **Footer**: Two disclaimer lines in muted text, verbatim:
   - "Read-only monitor. Not a trading bot. Not a settlement oracle. The consensus gap is not arbitrage, guaranteed profit, or verified truth."
   - "TxLINE proof verifies data provenance, not signal correctness."
9. **Overall**: Warm off-white background, charcoal text, hairline dividers, zero shadows, sharp 0px corners, flat design.

### Tablet (768px)
- Same content, tighter margins. Columns stay side-by-side if they fit, otherwise stack with hairline divider.

### Mobile (375px)
- Columns stack vertically (TxLINE on top, Polymarket below, hairline divider between).
- Serif headline slightly smaller.
- State badges wrap to 2-3 rows.
- All text legible (min 14px body).

## What to fix (likely discrepancies)

The non-vision model built from the HTML source, so structure is correct. Likely issues:
1. **Spacing rhythm**: gaps between sections may not match the design's vertical rhythm. The design uses 4px baseline grid, 16px/32px section spacing.
2. **Font sizes**: headline and gap value sizes may need adjustment to match the design's hierarchy exactly.
3. **Color accuracy**: verify cobalt is exactly #1e40af, surface is #faf7f2, dividers are #e5e7eb.
4. **State badge styling**: the design shows active badges with a cobalt bottom border; verify this matches.
5. **Skeleton loading**: the loading state should use pulse animation on gray placeholders matching the layout shape, not a spinner.
6. **Column balance**: the two columns should be visually balanced — equal width, aligned baselines.

## What NOT to change

1. **Compliance text**: The footer disclaimers must remain verbatim. Do not rephrase.
2. **"top-of-book quote" / "best ask"**: Never change to "executable" or "price".
3. **Data values**: Do not change the mock values (54.8%, 50.6%, +4.2 pp, +3.7 pp) — these match the design.
4. **No trading/wallet/AI**: Do not add wallet connection, trading buttons, or AI chat panels.
5. **No casino styling**: No neon green, no crypto-purple, no gradients, no glows.
6. **File structure**: Do not rename or restructure files. Only edit CSS/classes in `app/page.tsx` and `app/globals.css`.
7. **Gap engine logic**: The deterministic calculation in `lib/gap/engine.ts` is correct and tested. Do not change the math.

## Design tokens (already in app/globals.css)

```
--color-surface: #faf7f2
--color-on-surface: #1f1f1f
--color-on-surface-variant: #444748
--color-primary: #1e40af (cobalt — gap value, active states only)
--color-outline-variant: #e5e7eb (hairlines)
--color-stale: #8a6d00
--color-alert: #b45309
--color-success: #15803d
--color-error: #ba1a1a
```

## Verification after changes

After each visual fix:
1. Run `npm run typecheck && npm run lint && npm run test` — all must still pass.
2. Re-screenshot the app and compare to the design PNG.
3. Repeat until visual match is achieved.

## How to switch mock scenarios (for testing all 7 states)

```bash
MOCK_SCENARIO=live         npm run dev   # normal display, no alert
MOCK_SCENARIO=alert       npm run dev   # gap exceeds threshold, alert fires
MOCK_SCENARIO=stale       npm run dev   # stale data, amber indicators
MOCK_SCENARIO=unavailable npm run dev   # source unavailable
MOCK_SCENARIO=error       npm run dev   # fetch error, retry button
MOCK_SCENARIO=loading     npm run dev   # skeleton loading state
```

Each scenario exercises a different visual state. Screenshot all six to verify each state renders correctly.