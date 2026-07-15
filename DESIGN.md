# Design System - World Cup Edge

## Direction

Sports intelligence workstation, not a betting site or crypto dashboard.

## Density

Comfortable on desktop. Compact and ordered on mobile.

## Surface

One primary workspace with aligned data columns. Not a grid of generic cards.

## Type mood

Precise, editorial, monospace numerals for all financial data.

## Motion

Subtle live-data updates only. No bounce, no decorative animation.

## Color

Single accent + grayscale. No neon green, no crypto-purple gradients, no glowing cards.

## Information hierarchy

1. Match identity and countdown
2. One dominant consensus-gap result
3. TxLINE and Polymarket values side by side
4. Source freshness indicators (separate, not combined)
5. Plain-language explanation of any alert
6. Session alert history (below the fold)

## States

All must be designed and implemented:

- Loading (skeleton, not spinner)
- Live (fresh data, normal display)
- Stale (last good values, clearly marked)
- No alert (gap below threshold, calm display)
- Alert (gap exceeds threshold, prominent but not alarming)
- Unavailable (source disconnected or market closed)
- Error (fetch failure, retry action)

## Accessibility

- WCAG AA contrast for all text
- Non-color status cues (icons, text labels)
- Keyboard navigation
- Mobile-responsive at 375px, 768px, 1280px

## Avoid

- Casino styling
- Neon green or crypto-purple gradients
- Glowing cards
- Card-grid clutter
- AI chat panels
- Fake charts
- Red/green as the only status signal
- Claims of guaranteed profit or verified truth
