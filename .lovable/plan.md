# Guest menu: make the Filters panel actually filter

## What's wrong today

The Filters panel mixes two different things and only half of it works:

- The dietary row works, but only one option can be chosen at a time, and the menu updates behind the still-open panel, so it looks like nothing happened.
- The allergen section underneath looks like a set of filter buttons but is only a read-only glossary — tapping it does nothing. That's the "nonsense" part.
- There is no feedback: no count of matching dishes, no way to clear everything, no visible summary of what's currently on.

## What it becomes

One clear panel with three parts:

1. **Dietary** — Vegetarian, Vegan, Gluten free, Halal. Multiple can be on at once; a dish must match all of them.
2. **Avoid an allergen** — the 14 allergen chips become real filters. Turning one on hides every dish containing it. Multiple can be on at once.
3. **Allergen guide** — the full-name glossary moves to the bottom under its own heading, clearly a reference, not a control. The safety note stays.

Behaviour:

- A live line at the bottom of the panel: "12 dishes match" (or "No dishes match" with a hint to remove a filter).
- Sticky footer with **Clear all** and a primary **Apply** that closes the panel and shows the filtered menu.
- Choices are held as a draft while the panel is open, so the menu doesn't shuffle underneath; Apply commits them.
- The toolbar Filters button shows the number of active filters and stays highlighted while any are on.
- If a filter hides everything in a category, that category disappears from the menu and the category strip, as it does today.

## Technical notes

All in `public/hap/app.js` and `public/hap/styles.css`; no routing, data-shape, or business-logic change.

- `ui.dietFilter` (single string) becomes `ui.dietFilters` (array) plus a new `ui.avoidAllergens` (array of codes), with `ui.filterDraft` holding the in-panel state. A small migration keeps an existing saved single value working.
- `dietMatches(i)` becomes `itemPassesFilters(i)`: every selected diet present in `itemDiets(i)`, and no selected allergen present in `itemAllergens(i)`. `visibleItemsOf` / `visibleCategories` call it unchanged.
- `filtersSheet()` re-rendered with three labelled sections, chips as `aria-pressed` toggles, live match count, and a sticky action row.
- New actions: `diet-toggle`, `allergen-toggle`, `filters-clear`, `filters-apply`. The old `diet-filter` action stays as an alias so nothing else breaks.
- Analytics keeps emitting `filter_diet` and `filter_allergen` per toggle-on, so Insights ("Filters used") keeps working without change.
- Styles: reuse `.filter-chip` (already 44px, focus-visible), add an "avoid" on-state, keep `.allergen-grid` for the glossary only, add the sticky footer row.
- Guest strings added to the EN/SQ/IT/EL `UI_STRINGS` tables: avoid-allergen heading, match count, Clear all, Apply, no-match hint.

## Verification

Playwright at 320 / 390 / 430px on `/menu/sofra`: multi-select works, allergen exclusion removes the right dishes (e.g. avoiding Milk drops Burrata and Tiramisu), count matches the rendered dishes, Apply closes and the toolbar shows the active count, Clear all restores the full menu, empty-result state reads correctly, no clipping, no horizontal overflow, zero console errors. Regression pass on the admin item editor, which uses the same allergen/diet lists.
