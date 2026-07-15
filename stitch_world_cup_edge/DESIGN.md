---
name: Editorial Light Sports Monitor
colors:
  surface: '#f7f9fd'
  surface-dim: '#d8dade'
  surface-bright: '#f7f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f8'
  surface-container: '#eceef2'
  surface-container-high: '#e6e8ec'
  surface-container-highest: '#e0e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#444748'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eff1f5'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#060607'
  on-primary: '#ffffff'
  primary-container: '#1f1f1f'
  on-primary-container: '#888686'
  inverse-primary: '#c8c6c5'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#060605'
  on-tertiary: '#ffffff'
  tertiary-container: '#1f1f1c'
  on-tertiary-container: '#888682'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1b1b1c'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#e5e2dd'
  tertiary-fixed-dim: '#c8c6c2'
  on-tertiary-fixed: '#1c1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#f7f9fd'
  on-background: '#191c1f'
  surface-variant: '#e0e2e6'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-main:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
spacing:
  baseline: 4px
  gutter: 24px
  margin-edge: 32px
  column-gap: 16px
  row-padding: 12px
---

## Brand & Style
The design system adopts a sophisticated "Editorial Light" aesthetic, drawing inspiration from the prestigious heritage of print journalism and broadsheet sports sections. It prioritizes clarity, data density, and intellectual authority over decorative flair. The target audience includes analysts and enthusiasts who require high-performance data monitoring within a calm, distraction-free environment.

The visual style is strictly **Minimalist** and **Print-inspired**. It rejects modern UI conventions like shadows, rounded corners, and depth gradients in favor of a purely flat, columnar architecture. The emotional response is one of focused professionalism, reliability, and archival quality.

## Colors
The palette is restricted to mimic the ink-on-paper experience. 
- **Surface (#FAF7F2):** A warm off-white that reduces eye strain compared to pure white, serving as the canvas for all data.
- **Text (#1F1F1F):** A deep charcoal for high-legibility body text and headers, ensuring WCAG AA compliance.
- **Accent (#1E40AF):** A disciplined Cobalt Blue. This is a functional color, used exclusively to highlight the "consensus-gap" value or high-priority delta markers.
- **Dividers (#E5E7EB):** Hairline grays used for structural definition without adding visual weight.

Non-color cues (such as weight changes or symbols) must accompany any status changes to ensure full accessibility.

## Typography
The typography system uses a tri-font strategy to delineate content types:
- **Source Serif 4:** Used for editorial headlines and section titles. It provides the "newspaper" authority and an elegant, traditional feel.
- **Source Sans 3:** Used for descriptive text, labels, and UI controls. It is chosen for its high legibility and neutral character.
- **JetBrains Mono:** Used for all numerical data, scores, and timestamps. The monospaced nature ensures that columns of numbers align perfectly for quick scanning and comparison.

Hierarchy is established through scale and weight rather than color. All data-heavy views should prioritize the tabular alignment of JetBrains Mono.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy inspired by editorial typesetting. 
- **Grid:** A 12-column grid system for desktop, collapsing to 4 columns for mobile. 
- **Columnar Layout:** Avoid cards. Use vertical hairline dividers and generous white space to separate content streams. 
- **Rhythm:** All vertical spacing is based on a 4px baseline. Components and rows should utilize increments of 4px to maintain a tight, mathematical rigor.
- **Responsive:** On mobile, side-by-side columns reflow into a single-column stack, but tabular data remains horizontal with independent scrolling if necessary to preserve monospaced alignment.

## Elevation & Depth
This design system utilizes **zero shadows** and **zero elevation**. There is no "Z-axis" in this interface. 
Depth is conveyed solely through:
- **Tonal Layering:** Slight shifts in background color for header bars (using the Divider color at low opacity).
- **Hairline Borders:** 1px solid lines (#E5E7EB) define the boundaries of data sets and headers.
- **Rule Lines:** Horizontal lines of varying thickness (0.5pt to 2pt) signify the importance of content breaks, similar to a physical newspaper.

## Shapes
The shape language is strictly **Sharp (0px)**. Every element—including buttons, input fields, and selection indicators—must have 90-degree corners. This reinforces the "printed matter" aesthetic and ensures the grid remains perfectly rigid.

## Components
- **Buttons:** Rectangular with 1px charcoal borders. Primary buttons use a solid charcoal fill with off-white text. Secondary buttons use a transparent background with a 1px border. No hover shadows; use a color inversion or weight change on hover.
- **Data Rows:** No containing cards. Rows are separated by 1px hairline dividers. Use alternating row "zebra" striping only when data density is extremely high, using a 5% tint of the primary color.
- **Consensus-Gap Value:** This specific data point is highlighted using the Cobalt Blue (#1E40AF) for the text, often paired with a bold weight in JetBrains Mono.
- **Input Fields:** Bottom-border only or a full 1px charcoal border. Use Source Sans 3 for placeholder text.
- **Chips/Tags:** Sharp-edged rectangles. Use the Label-Caps typography style.
- **Checkboxes/Radios:** Square-only. Use a simple "X" or solid fill for the selected state to maintain the print look.
- **Status Indicators:** Avoid red/green for "up/down" where possible. Use typographic symbols (arrows, plus/minus) or weight changes to ensure accessibility for color-blind users.