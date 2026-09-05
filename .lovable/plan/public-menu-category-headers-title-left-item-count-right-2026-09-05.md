# Public menu category headers — title left, item count right

Small, one-surface change: the category headers on the public menu (e.g. "Popular · 2 items") switch from the centred stacked layout to a single row — category name on the left, item count on the right — in every template.

## Scope

- `public/hap/app.js` — `categoryHead()` (app.js:2191): render the header as one flex row containing `<h2>` (left) and `.category-count` (right, end-aligned, baseline-aligned with the title). The promo kicker pill, when present, stays as a small centred row above the title/count row so featured categories keep their hierarchy.
- `public/hap/styles.css` — replace the centred stacked header block (`styles.css:905-911`):
  - `.menu-category-head` / `.category-head-inner`: `flex-direction:row; justify-content:space-between; align-items:baseline; text-align:left`.
  - Keep the fixed min-height and gap-before-cards rhythm from the earlier menu-polish pass so header rules still never collide.
  - Update the per-template overrides that force centering — `template-modern` (113-115), `template-editorial` (125-126), `template-noir` (135-136), `template-street` (146-147), `template-grid` (155) — so the title sits left and count right in each, while each template keeps its own typography (Noir letter-spacing, Street rotated chip, Editorial italic + bottom rule).
  - Count style stays `10px / muted`, white-space nowrap, aligned to the title baseline.

## What stays unchanged

- All five templates' fonts, colours, rules and kicker styling.
- Admin Menu screen headers (`category-admin`), featured-panel tinting, offer strip, Kiosk pager — untouched.
- No behaviour or data changes; CSS + one markup-order change in `categoryHead()` only.

## Verification

One Playwright pass on `/menu/sofra` in all five templates (switch via Menu › Design) at 320 / 390 / 430 px:

- Title left, count right on one row in every template; featured category shows kicker pill centred above the row.
- No horizontal overflow, no console errors.
- Header rule (Editorial) spans the content column without touching card borders.

## Rollback

Revert the `categoryHead()` line and the header CSS block.
