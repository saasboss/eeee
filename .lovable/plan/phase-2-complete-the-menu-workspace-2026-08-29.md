# Phase 2 — Complete the Menu Workspace

Make Menu the strongest surface in the Hap restaurant admin. Frontend only: all state stays in the existing `localStorage` prototype store. No backend, no redesign of Overview / Promote / Insights / Settings.

## Verified current state

- The admin is the vanilla-JS app in `public/hap/app.js` (2122 lines), embedded by `src/components/hap-app.tsx`; `public/hap/ops.js` holds settings/superadmin data.
- **The whole app renders inside a fixed phone frame**: `.phone-app { max-width: 430px }` in `public/hap/styles.css:57`. There is no desktop layout anywhere in the product today.
- The data model is `state.categories[] -> items[]`. There is **no menu layer**, so multi-menu support has to be introduced with a state migration (current `version: 13`).
- Items have `name, ingredients, price, image, status, allergens, dietary, spice, promotion`. `price` is a single integer in minor units; there are **no variants**.
- `status` already uses `available | soldout | hidden` — the intended model. But the Menu page also carries overlapping controls: a "Quick actions" grid with *Mark sold out* and *Update prices*, plus per-row availability actions.
- Categories are rendered as expandable cards with up/down arrow reordering (`renderAdminCategory`); there is no rename/hide/delete/description/image surface.
- Menu QR already lives at `/admin/menu/qr` from Phase 1.

## Decisions taken

- **Desktop**: the restaurant admin breaks out of the phone frame at >=1024px into a real full-width app. The guest preview panel keeps a phone frame, because that is what guests actually see. Public menu and Superadmin are untouched.
- **Menus**: demo data seeds three menus (Main Menu, Breakfast, Drinks) so the selector and cross-menu moves are visible immediately; deleting down to one menu hides all menu-selection UI.
- **Scale testing**: a dev-only scale switcher in the existing prototype bar regenerates mock data (5 / 50 / 150 / 300 items across 5 / 12 / 20 categories). Never visible to a restaurant user.

## Information model

```text
Business
 └ Menu            id, name, currency, order, visible
    └ Category     id, name, description?, image?, hidden, order, promotion?
       └ Item      id, name, ingredients, photo, status, order,
                   price OR variants[{name, price}], allergens, dietary, spice
```

One menu → selector hidden entirely, header just says "Menu". Two or more → a menu selector in the header (segmented on desktop, dropdown on mobile) with Add / Rename / Delete menu.

## Desktop workspace (>=1024px)

```text
┌────────────┬──────────────────────────────┬───────────────┐
│ Categories │ Item workspace               │ Live preview  │
│ rail       │ search · filters · bulk bar  │ (collapsible, │
│ reorder    │ item rows, dense             │  phone frame) │
│ + Add      │ + Add item                   │  [toggle]     │
└────────────┴──────────────────────────────┴───────────────┘
```

- Rail is fixed ~260px, workspace takes the remaining space, preview is ~380px and **collapsed by default** so the management area stays large. A single Preview toggle in the header opens it.
- Between 700px and 1024px: rail + workspace, no preview panel.

## Mobile workflow (<1024px)

Stacked and one-handed: menu selector → search → filter chips → category chips (navigation) → item list → sticky bottom action bar (Add item · Select · Preview). No side-by-side panels. Category *management* is a dedicated "Manage categories" screen, not the chips.

## Categories

New "Manage categories" surface (sheet on mobile, rail context on desktop) with: Add, Rename, Edit description/image, Hide/show, Reorder, Promote shortcut, Delete (confirm, with item-count warning and "move items to…" choice). Reorder is an explicit **Reorder mode** with visible drag handles plus keyboard-accessible up/down — no hidden long-press.

## Items

Row actions: edit, duplicate, delete, change/remove photo, move category, quick availability. List-level: search, filters, reorder mode, multi-select.

**Item editor** — default fields only: Photo, Name, Description, Price (or Variants), Category, Status. Everything else moves behind a "More details" disclosure: variants setup, dietary, allergens, spice, translation status, advanced visibility. Prices use a structured control: numeric input + currency read from the menu config, never free text.

**Variants**: a toggle between "Single price" and "Variants". Variants are a small ordered list of `{name, price}` (Small / Medium / Large, Glass / Bottle). The public menu and preview render a from-price when variants exist.

## Status model cleanup

One model: **Available · Sold out · Hidden**. Removed or merged:

- The Menu "Quick actions" grid goes away — *Mark sold out* is replaced by multi-select bulk actions, *Update prices* by inline editing in the item row, *Promote* stays as a row action, *QR code* stays in the header (Phase 1 already put it there).
- Any separate Restock / Hide buttons collapse into a single status control.
- Quick availability changes apply immediately with an Undo toast: `Sea Bass marked sold out · Undo`.

## Bulk actions

Selection mode reveals a bottom action bar: Mark available · Mark sold out · Hide · Move to category · Delete (confirm). Nothing else.

## States implemented

loading (skeleton), empty menu (`Your menu is empty` + `Add first item` / `Import menu`), empty category, no search results, error with retry, unsaved changes in the editor, saved confirmation, disabled control with reason, and a no-permission state for a viewer role.

## Technical notes

- `public/hap/app.js`: add `state.menus[]` + `state.activeMenuId`, move `categories` under the active menu, and write a `migrateV13toV14` alongside the existing migration chain so saved prototypes upgrade instead of resetting. Every current reader of `state.categories` (`allItems`, `getItem`, preview, promotions, analytics, translations, superadmin) routes through new `activeMenu()` / `allCategories()` helpers.
- `adminMenu()` splits into `adminMenuDesktop()` and `adminMenuMobile()` chosen by a width check, sharing the same row/editor renderers.
- `public/hap/styles.css`: add a `>=1024px` block that releases `.phone-app` from `max-width:430px` when the admin shell is active, and add the three-pane grid. The preview panel keeps its own phone frame.
- Item lists render windowed above ~120 rows so 300 items stay smooth; search/filter is debounced.
- Scale switcher lives in `prototypeBar()`, writes generated data through the same migration-safe shape.
- `src/lib/hap-routes.ts` and `src/routes/admin.$.tsx` need no new routes — Menu keeps `/admin/menu` and `/admin/menu/qr`.

## Deliverable

A report at completion covering: workflows implemented, controls removed or merged, scale issues found (5 / 50 / 150 / 300 items; 5 / 20 categories), mobile issues found, desktop issues found. Phase 3 is not started.
