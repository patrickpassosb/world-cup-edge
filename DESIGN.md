# Design System - World Cup Edge

## Direction

Editorial Light — print-inspired broadsheet aesthetic. Approved via Google Stitch (project 836184704891813075, screen b4e47514ae3345468b91e56284daae73). Not a betting site, not a crypto dashboard, not a casino.

## Density

Comfortable on desktop (1280px). Compact and ordered on tablet (768px). Single-column stack on mobile (375px).

## Surface

One primary workspace with aligned data columns. Not a grid of generic cards. Hairline dividers separate sections, not boxes.

## Type mood

Precise, editorial. Monospace numerals for all financial data.

### Font stack

| Role | Font | Weights |
|---|---|---|
| Headlines | Source Serif 4 | 400, 600, 700 |
| Body / labels | Source Sans 3 | 400, 600, 700 |
| Numerals / data | JetBrains Mono | 400, 500, 700 |

Loaded via `next/font/google` in `app/layout.tsx`. CSS variables: `--font-source-serif-4`, `--font-source-sans-3`, `--font-jetbrains-mono`.

## Motion

Subtle live-data updates only. No bounce, no decorative animation. Skeleton loading (pulse), not spinner.

## Color

Single accent + grayscale. No neon green, no crypto-purple gradients, no glowing cards.

### Tokens (Tailwind classes in `app/globals.css`)

| Token | Value | Usage |
|---|---|---|
| `surface` | `#faf7f2` | Page background (warm off-white) |
| `on-surface` | `#1f1f1f` | Primary text (charcoal) |
| `on-surface-variant` | `#444748` | Secondary text |
| `primary` | `#1e40af` | Cobalt accent — gap value, active states only |
| `outline-variant` | `#e5e7eb` | Hairline dividers |
| `outline` | `#747878` | Borders |
| `stale` | `#8a6d00` | Stale indicator (non-color cue required too) |
| `alert` | `#b45309` | Alert indicator (non-color cue required too) |
| `success` | `#15803d` | Verified check (non-color cue required too) |
| `error` | `#ba1a1a` | Error indicator (non-color cue required too) |

## Information hierarchy

1. Match identity and countdown
2. One dominant consensus-gap result (cobalt, largest mono numeral)
3. TxLINE and Polymarket values side by side (desktop/tablet), stacked (mobile)
4. Source freshness indicators (separate, not combined)
5. Plain-language explanation of any alert
6. Session alert history (below the fold)

## States

All must be designed and implemented:

- Loading (skeleton, not spinner)
- Live (fresh data, normal display)
- Stale (last good values, clearly marked — amber + clock icon)
- No alert (gap below threshold, calm display)
- Alert (gap exceeds threshold, prominent but not alarming — amber accent on gap + alert icon)
- Unavailable (source disconnected or market closed — "Unavailable" with reason + wifi-off icon)
- Error (fetch failure, retry action — error icon + retry button)

## Accessibility

- WCAG AA contrast for all text
- Non-color status cues (lucide-react icons + text labels, not color alone)
- Keyboard navigation
- Mobile-responsive at 375px, 768px, 1280px

## Shape

Sharp 0px corners on all elements. No rounded corners. Print-inspired architectural feel.

## Elevation

Flat. Zero shadows, zero blurs, zero gradients. Depth via typography weight and hairline dividers only.

## Avoid

- Casino styling
- Neon green or crypto-purple gradients
- Glowing cards
- Card-grid clutter
- AI chat panels
- Fake charts or sparklines
- Red/green as the only status signal
- Claims of guaranteed profit or verified truth
- Wallet connection UI
- "AI agent" branding
- "executable" for Polymarket (use "top-of-book quote")

## Stitch references

All design HTML + PNG screenshots in `design/stitch-previews/`:
- `editorial-light.html` / `.png` — desktop 1280px (approved direction)
- `tablet-768.html` / `.png` — tablet 768px
- `mobile-375.html` / `.png` — mobile 375px