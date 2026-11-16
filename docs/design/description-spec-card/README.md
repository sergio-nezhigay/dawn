# Description spec card (PR #112, I6): approved design and what's actually on the dev theme

Reference material for fixing PR sergio-nezhigay/dawn#112. Spec lines in product descriptions
("Label: value") should render as the approved **variant C: striped card**. On the dev theme
(#188186001724, 2026-11-16) they look noticeably different.

These are docs only, not theme files. Delete this folder before merging if it shouldn't live in `main`.

## Files

| Folder | What it is |
|---|---|
| `approved/desk-C.png`, `approved/mob-C.png` | **The approved design**, variant C, at the 652px desktop column and a 358px phone. |
| `approved/shapes-desktop.png`, `approved/shapes-mobile.png` | Variant C mocked on 8 real description formats (RAM, CPU, PSU, LED, USB-COM, charger, splitter, caddy). |
| `approved/compare-*.png`, `approved/desk-[A-E].png`, `approved/mob-[A-E].png` | All 5 variants offered. A is the old look; C was chosen. |
| `before/real-*.png` | The description block before the PR. |
| `dev-actual/*.webp` | Full-page screenshots of the dev theme with the PR code (1440 and 390 wide): Hynix RAM, Intel i5-4570, Vinga ASUS 65W PSU, LED switch. |
| `mockups/variants.html`, `mockups/shapes.html` | HTML/CSS source of the mockups. The `.C` rules (and `.narrow` for phone) are the design spec. Open them in a browser; `?w=358` sets the phone width. |

## Approved design (from `mockups/variants.html`)
- One card: `border: 1px solid var(--ui-line); border-radius: 12px; overflow: hidden`, with no gaps between rows.
- Rows: a grid with label column `minmax(0, 19rem)` and value `1fr`, `gap: 2rem`, `padding: .9rem 1.4rem`, `letter-spacing: .02rem`.
  - Odd rows have `background: var(--ui-tint)`.
  - On phone the label column is `minmax(0, 42%)`, with `gap: 1.2rem` and `padding: .9rem 1.2rem`.
- Label `color: var(--ui-muted)`; value `font-weight: 600` (clearly bold).

## Differences seen on the dev theme (to be confirmed with DevTools)
1. **Gaps between rows on `<p>` descriptions (Hynix, CPU).** The rule
   `.description__text:not(.description--rich) p { margin: 0 0 1rem }` is more specific than
   `.description__text .description__spec { margin: 0 }`. So each `<p>` row keeps a 1rem bottom
   margin, and the card splits into separate stripes.
2. **Values aren't bold.** Values render at regular weight, and only the supplier's inline `<b>` bits
   ("Гб", "мм", "ГГц") are bold. Either something overrides `.description__value { font-weight: 600 }`,
   or the body font has no 600 face loaded (`layout/theme.liquid` loads only regular and bold).
3. **Weak card frame.** The PR builds the frame from per-row side borders and first/last-row radii, not
   from one wrapper with `overflow: hidden`. With the gaps from point 1, the frame falls apart.
4. **Stripes barely visible** compared with the mockup.

## Fixed (2026-11-16, checked on the dev theme at 1440 and 390 on all 6 test pages)
1. Gaps: confirmed. The reset rule now skips spec rows (`p:not(.description__spec)`), so `<p>` rows sit flush (measured gap 0).
2. Bold: on Windows 600 already looked semibold, but the mockup font (Arial) has no 600 face, so the approved image is 700. Values now use 700, and supplier `<b>`/`<strong>` inside a value inherit that weight.
3. Frame: whole once the gaps were gone. Corner radii are now set per corner, so the extra single-row rule was dropped.
4. Stripes: even rows were transparent over the #fafafa dotted page. Rows are now white, with odd rows `--ui-tint`.
Columns already matched (190px desktop, 42% phone). The Waveshare rich description computes identically before and after.
Known limits: stripe order counts across a whole container, so a second spec group in the same block may start white. A short bold lead-in with a colon in prose becomes a one-row card.
