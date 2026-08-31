# Design system: palettes, clean default template, real previews, fewer knobs

## Critique of the previous prompt (what was wrong with it)

1. **Too vague on data.** "Add a PALETTES table" without naming the state migration path, the dead keys already in state (`backgroundIntensity`, `cards`, `radius`), or the consumers (`header-*`, `typography-*`, `images-*`, `category-*` CSS at styles.css:161, 316–319, 928–929) — an agent could add palettes and leave the old single-hex path live in parallel.
2. **Vague on the shared-emit point.** It didn't name the three places palette variables must be injected (`renderPublicMenu` app.js:1923, `templatePreview` app.js:1640, `promoPreview` app.js:2190), which is the entire correctness argument of the feature.
3. **Missed selection mechanics.** The template row uses in-place selection (`selectTemplateCard` app.js:1659, `.template-dots` app.js:1672); the prompt didn't say palettes/backgrounds must reuse it, inviting full re-renders that break scroll and drop focus.
4. **No dark-mode spec.** `.public-root` has a hardcoded dark override (styles.css:98); palette × dark is a 2D matrix and was unaddressed.
5. **No accessibility spec beyond one contrast sentence** — no `:focus-visible`, no `aria-pressed` on new rows, no reduced-motion for snap scrolling.
6. **Batching ignored mutation hotspots.** Four batches still collided on the appearance render block; batching must be by file region, not by topic.
7. **Verification too weak** — didn't cover state migration of existing saved restaurants, the onboarding tour step `data-tour="template"`, or the QR preview surface.

## Verified current state

- Default state (app.js:700): `appearance:{template:'modern', brand:'#8a543c', background:'paper', backgroundIntensity:'low', cards:'soft', images:'soft', radius:'medium', categoryBar:'pill', promotionStyle:'framed', typography:'mixed', header:'compact', mode:'light'}`. `backgroundIntensity` and `cards` have no consumers (dead keys); `radius` is consumed only via `radius-low/high` (app.js:1923).
- Single-hex brand swatches hardcoded at app.js:1693; colour input at same line.
- Palette variables today: only `--menu-brand`/`--brand` set inline; `--menu-bg/surface/text/muted/line` are one fixed cream set at styles.css:98 with a fixed dark override on the same line.
- Template ids and aliases: `modern/editorial/noir/street/grid`, `TEMPLATE_ALIASES` app.js:399. Consumers of micro-knob classes: styles.css:161, 316–319, 928–929.
- Design screen render block: app.js:1686–1699. Background cards are flat `div`s (app.js:1695); template cards use the real `templatePreview()` (app.js:1635–1654).

---

# Prompt for the implementing agent

Work in `public/hap/app.js` and `public/hap/styles.css` only. No new dependencies, no build step, no changes to `data.js`/`services.js`/`ops.js` or TanStack routes. Batches below are split by file region so one file is never edited twice in one batch. Run ONE headless-browser verification per batch end, not per edit.

## Batch 1 — Palette engine (app.js data + helpers)

1. Replace the `templates` array (app.js:391–397) with objects: `{id, name, sub, defaultPalette, palettes:[…paletteIds], defaults:{header, categoryBar, images, typography, radius}}`. Convert all destructuring `[id,name,sub]` consumers (app.js:1686, 1692, 2556) to object access in the same edit.
2. Add `PALETTES` (10 entries, ids: `terra, ember, olive, coast, indigo, plum, forest, slate, noir-gold, clay-sand`): each `{id, name, light:{brand, accent, bg, surface, text, muted, line}, dark:{…same 7}}`. `accent` is the supporting secondary (used for kickers, borders, offer strip) — never equal to `brand`. No single-hue palettes; every entry must be primary + tinted companion.
3. State: add `appearance.palette` (default `terra`), keep `brand` as a derived mirror of the palette's `light.brand` for backwards compat with any code reading `a.brand`. In the load/normalize path (near app.js:929), map old states: if no `palette`, infer the closest palette from `brand`; if a `palette` exists and `brand` ≠ its primary, the owner's custom colour wins via a `palette:'custom'` sentinel.
4. One helper `paletteVars(a, dark)` returning the inline-style fragment `--menu-brand:…;--menu-accent:…;--menu-bg:…;--menu-surface:…;--menu-text:…;--menu-muted:…;--menu-line:…`. It must be the ONLY place palette values enter markup.
5. Wire `paletteVars` into all three emit points: `renderPublicMenu` (app.js:1923), `templatePreview` (app.js:1640), `promoPreview` (app.js:2190) — replacing the current `--menu-brand` fragment in each.
6. Custom colour input stays: derive `accent/bg/surface/muted/line` from the picked hex via `color-mix()` in `paletteVars` when `palette==='custom'`, so custom never yields a flat one-colour theme.

## Batch 2 — Default template + per-template theming (styles.css)

1. Rework `modern` (Aria) into the clean universal default: warm-neutral surfaces, one restrained serif/sans pair, works with and without dish photos, no decorative gimmick. It must be the best template, not the plainest — this is what a new admin ships untouched.
2. Give each of the other four templates its own default palette (from `template.defaultPalette`) and delete the fixed cream override at styles.css:98 in favour of palette-driven variables; keep `.dark-menu`/dark handling but sourced from `palette.dark`.
3. Fold the micro-knob CSS (styles.css:161, 316–319, 928–929) into each template's own rules using the template's `defaults`; then delete the standalone `header-*`, `typography-*`, `images-*`, `radius-*`, `category-*` class blocks and stop emitting those classes in `renderPublicMenu`.
4. Keep `TEMPLATE_ALIASES` intact; verify old saved template ids still resolve.
5. Contrast budget, checked not assumed: body text ≥ 4.5:1 on surface, price/accent ≥ 3:1, in light and dark, for every palette × template combo. Log a contrast table to the console during verification; any failure = adjust the palette, not the rule.

## Batch 3 — Design screen rebuild (rewrite app.js:1686–1699 as one block)

1. Sections become: **Template** (existing live `templatePreview` cards, unchanged) → **Palette** (snap row of pair swatches — brand + accent in one chip, name under it, check on the active one, page dots reusing the `.template-dots` pattern) → **Background** (new `backgroundPreview(id)`: a scaled real `.public-root` mini-page with `bg-<id>` and the current palette applied, mirroring `templatePreview`) → light/dark.
2. Delete the Header / Category bar / Images / Typography groups from the render. The state keys remain and are set from `template.defaults` on template switch.
3. Palette and background taps use in-place selection like `selectTemplateCard` (app.js:1659): toggle classes, update dots, persist via `save()`, toast — no `render()` call. The in-place handler must also live-update the background cards when the palette changes (they render the palette).
4. Accessibility: `aria-pressed` on every picker button, visible `:focus-visible` ring, `prefers-reduced-motion` honoured on the snap rows.
5. The onboarding tour step `data-tour="template"` (app.js:637, 1475) must still land correctly — keep the attribute on the template group.

## Batch 4 — Friction reducers (reuse the Menu tab component + pager helper)

1. **Settings** (`/admin/settings`): one screen, three tabs — Restaurant / Team / Billing — replacing the settings rows that only navigate.
2. **Insights**: tabs Traffic / Dishes / Guests + a horizontal date-range chip row.
3. **Overview**: a 4-action command row (Add dish, New promotion, Share QR, Preview menu) directly under the header.
4. **Items**: sticky horizontal category chip strip; inline quick actions (price edit, 86 toggle, hide) without opening a sheet; a 2-column compact grid toggle for scanning long menus.

## Batch 5 — One verification pass (headless browser)

At `/menu/sofra` and `/r/sofra/admin/menu/design`, 320/390/430 px:
- Every template × its default palette × light/dark renders; zero console errors; zero horizontal overflow.
- Palette switch updates public menu, background previews and promo preview identically (screenshot diff of the three surfaces).
- Background cards show visibly different real patterns (not flat fills).
- A saved old-shape state (single `brand`, no `palette`, legacy template alias like `classy`) loads without error and migrates.
- Contrast table printed; `data-tour="template"` present; picker taps don't reset scroll position.

## Hard constraints

- No full `render()` on picker taps. No new dependencies. No `*.client.*` modules. Business logic, data seeds, QR generation and promotions logic untouched. Every palette value must come through `paletteVars`; grep for stray `--menu-brand:` literals after Batch 1 and eliminate them.
