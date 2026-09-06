# Featured category block — editorial contrast redesign

Redesign the promoted-category block on the public menu ("FEATURED TONIGHT / Desserts / 2 items" on a tinted panel). Current problems (screenshot-verified at 390px): clay-red text on a clay-tint background ("red on red"), a floating centred pill kicker, and a weak title row with no hierarchy. Dish cards are liked and stay untouched. Direction chosen by the user from rendered prototypes: **Sophisticated Editorial Contrast**.

## Design (from the chosen prototype)

- **Kicker**: remove the pill. "FEATURED TONIGHT" becomes small (≈10px), letter-spaced (≈0.2em) uppercase text, centred and flanked by two hairline rules that stretch to fill the row.
- **Title row**: larger serif category title on the left, small muted uppercase item count on the right (baseline-aligned — keeps the approved title-left/count-right layout), with a hairline rule underneath the row.
- **Colour harmony**: no more same-colour text on same-colour tint. Title and kicker use the menu's main text colour (`--menu-text`); the tint colour only appears as a subtle accent (hairlines, kicker text in dark mode-safe muted tone, panel tint itself). Contrast must pass WCAG AA in every tint and template.
- **Panel**: keep the tinted rounded panel; soften the tint slightly so white dish cards pop, keep radius and padding rhythm (8px grid).

## Changes (CSS + minimal markup, one pass)

`public/hap/app.js` — `categoryHead()` (app.js:2192):
- Wrap the kicker in a flanked-rule structure: `<span class="category-kicker"><i></i>Featured tonight<i></i></span>` where the `<i>` elements render the hairlines (or use CSS ::before/::after — preferred, no markup change beyond classes).
- No other markup changes; the title-left/count-right row stays.

`public/hap/styles.css`:
- `.category-kicker`: remove pill background/radius; small-caps letter-spaced text with `::before`/`::after` flex hairlines (`background: color-mix(in srgb, var(--menu-text) 20%, transparent)`), centred, gap 12px.
- `.menu-category.is-featured .menu-category-head h2`: colour `var(--menu-text)` instead of `var(--menu-brand)` / per-tint colours; slightly larger size/weight for hierarchy.
- `.menu-category.is-featured .category-head-row`: hairline bottom border (`1px`, tint at ~18% or text at ~12%), padding-bottom 12px.
- `.category-count`: stays small/muted, uppercase, letter-spacing, right-aligned on the title baseline.
- Per-tint rules (`tint-sage`, `tint-sand`, `tint-clay`, `tint-night`): keep distinct panel tints, but replace same-hue title/kicker text with harmonised values — title/kicker always `--menu-text`-based; per-tint accent only in hairlines and (optionally) kicker text at a darkened, AA-passing shade.
- Slightly reduce panel tint saturation (e.g. clay 11% → ~8–9%) so cards and text read clearly.
- Non-featured category headers (`template-*` overrides, admin headers, `.promo-summary`) stay unchanged except sharing the same kicker/hairline base where the class is shared.

## Applies everywhere the block renders

The same markup/styles serve the public `/menu/:slug`, the in-app Design preview, and the Promote sheet preview (`promo-preview`) — one change, three surfaces stay in sync.

## Out of scope

- Dish cards, prices, offer strip, other category headers, admin screens.
- No data, routing, or template-structure changes. No new dependencies.

## Verification (Playwright, headless)

- `/menu/sofra` at 320 / 390 / 430px, all five templates (switch via Menu › Design): kicker hairlines render, title left / count right on one baseline, hairline rule under the row, no text clipping or horizontal overflow, zero console errors.
- Featured block checked in all four tints (clay, sage, sand, night): text/panel contrast visibly distinct (no same-hue text on tint), AA contrast for title and kicker.
- Promote sheet preview and Menu › Design preview match the public menu rendering.
- Non-featured categories visually unchanged.
- ≥700px: framed phone presentation intact, no regression.

## Rollback

Revert the `categoryHead()` kicker markup and the `.is-featured` / `.category-kicker` CSS block.
