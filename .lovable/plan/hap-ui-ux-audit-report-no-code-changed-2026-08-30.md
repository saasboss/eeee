# Hap — UI/UX Audit Report (no code changed)

Everything below was verified by reading `public/hap/app.js` (2216 lines), `public/hap/styles.css` (830 lines) and by driving the running app in a headless browser. The whole product is one vanilla-JS app in `public/hap/`, mounted in an iframe by `src/components/hap-app.tsx`. React routes are only shells, so every issue here lives in the prototype files.

## Your reported issues

### 1. Price rendered twice on promoted cards
- **Where:** `renderPublicItem()` — `app.js:1493-1506`; `priceColumn()` `app.js:1485-1491`; CSS `.promo-style-offer .promo-offer-strip` `styles.css:751-755`.
- **What:** For promotion style `offer`, the card renders `priceColumn()` (top-right: `950 Lek` + `≈ €9.69`) **and** a footer `promo-offer-strip` containing `<s>was</s> <strong>menuPrice</strong>` (bottom-right). Two prices, same value.
- **Also in your screenshot:** the `ribbon` style overlaps the price. `.promo-style-ribbon .promo-ribbon` is `position:absolute; top:0; right:0; 112px` (`styles.css:758-759`) and the price column occupies exactly that corner — measured overflow 130px of content in a 112px box. The diagonal ribbon prints over `1,250 Lek / 950 Lek`.
- **Why it matters:** the price is the single most important number on a menu; duplicating and occluding it destroys trust.
- **Fix:** one price per card. For `offer`, keep the strip as the only price surface (drop `priceColumn`, or keep the column and reduce the strip to terms only) — pick one and apply it in `renderPublicItem`. For `ribbon`, reserve the corner: add `padding-top` to the price column (or shift the price block below the ribbon band) so the two never share space.

### 2. Item detail sheet has no photo
- **Where:** `itemDetailsSheet()` — `app.js:1589-1606`.
- **What:** the sheet renders title, price block, ingredients, diet tags and allergens. `i.image` is never used, even though every seeded item has one.
- **Why:** the guest taps a dish to see it bigger; the modal currently shows less than the card.
- **Fix:** add a hero `<img class="detail-hero" src="${i.image}" alt="${tr.name}">` as the first child of `.detail-sheet`, with a CSS rule (16:9, `object-fit:cover`, sheet radius) and a graceful fallback when `image` is empty.

### 3. No language selection on the public menu
- **Where:** `app.js:2163-2167` (public boot), `postRender()` `app.js:1720`, `languageSheet()` `app.js:1562-1564`, `tItem`/`tCategory` `app.js:213-224`.
- **What:** a language picker exists and auto-opens — but only when `state.mode==='preview'` **and** `state.preview.languageConfirmed` is false. The public boot path explicitly sets `state.preview.languageConfirmed = true`, so a real guest at `/menu/:slug` **never** gets the picker. The only entry point is a small unlabeled globe icon over the banner (`app.js:1417`).
- **Second defect:** translation coverage is real but thin — `item.i18n[CODE]` / `category.i18n[CODE]` only translate dish name and ingredients. Every piece of UI chrome ("Search the menu", "Filters", "See details", "Sold out", "Contains", "items", allergen and diet labels) is hardcoded English. Choosing Shqip today still shows an English interface.
- **Third defect:** the guest's language choice is written into the same shared `localStorage` state as the restaurant's data (`state.preview.language` + `save()`), so guest actions mutate the owner's prototype state.
- **Fix (proposed):**
  1. Remove the forced `languageConfirmed = true` on the public path; show the picker on first load, remembering the choice in a separate guest-scoped key (`hap.guest.lang`) so it never writes restaurant state.
  2. Keep a persistent floating language chip (flag/code + label) in the sticky toolbar, not just an icon on the banner.
  3. Add a lightweight UI string table — `const UI_STRINGS = { EN:{...}, SQ:{...}, IT:{...}, EL:{...} }` with a `t('key')` helper — rather than pulling in i18next. The app has no build step or React runtime; a ~60-key JSON map keyed by the existing language codes is smaller, has zero dependencies, and matches the `i18n` shape already used for content. Seed EN/SQ/IT/EL, fall back to EN for any missing key.
  4. Restrict the picker to languages the restaurant actually published (`state.restaurant.languages`) instead of the 23-language catalog.

### 4. White flash on every click
- **Where:** `render()` — `app.js:1031-1044`, called from ~60 branches of the click handler at `app.js:1833+`.
- **What:** every interaction does `app.innerHTML = ...`, destroying and rebuilding the entire screen (nav, header, images, everything). The browser paints the empty container for a frame → white flash. Two amplifiers: `admin-tab` deliberately renders a **skeleton** and then re-renders 180ms later (`app.js:1845`), and every `<img>` is recreated, so photos re-decode on each click.
- **Why:** it reads as a page reload; it's the single biggest "this isn't a real product" signal.
- **Fix:** stop full-document rebuilds for local state changes.
  - Short term: for toggles, filter chips, segment controls, promo-temp changes and category expand/collapse, mutate the affected node in place (`classList.toggle`, `el.textContent=`) instead of calling `render()`.
  - Structural: introduce a tiny keyed patch step — render into a detached container and morph, or at minimum re-render only the region that changed (`.admin-main`, `.sheet`) rather than `app`. Keep the nav and header nodes alive across renders.
  - Remove the artificial skeleton delay on tab switches; it adds a guaranteed blank frame with no loading behind it.

### 5. Two triggers for "New promotion"
- **Where:** `adminPromote()` `app.js:1141` (header `icon-btn` → `promo-chooser`) and `adminHome()` `app.js:1090` (quick-action card → same `promo-chooser`). On the Menu tab there is a third (`app.js:1114`).
- **What:** the header "+" and the brown card fire the identical action.
- **Fix:** keep exactly one primary CTA per surface. On Promote: drop the bare "+" icon and use one labelled full-width `+ New promotion` button under the header (or keep the icon on mobile only and drop the card). The Overview quick action can stay as a shortcut from a different page, but Promote itself must not offer two.

### 6. Every button scrolls the page to the top
- **Where:** same root cause as #4. `.content-scroll` (`styles.css:65`) is the scroll container; `render()` replaces it, so `scrollTop` resets to 0. No code saves or restores scroll position anywhere.
- **Affected actions (all call `render()`):** `promo-temp` (label / card design / tint / end date / intensity — `app.js:1873`), `menu-filter`, `diet-filter`, `toggle-category`, `appearance`, `brand-color`, `qr-style`, `toggle-open`, `toggle-hide-soldout`, `bulk-toggle`, `set-display-currency`, `auth-mode`, `toggle-hours`. The sheet body is rebuilt too, so picking a promo style also jumps the sheet back to its top — which is why the card-design gallery bounces away as you use it.
- **Fix:** (a) make these interactions local (toggle a class, no re-render) — this is the correct fix for promo-temp, filters and toggles; (b) as a safety net, capture `.content-scroll` / `.sheet` `scrollTop` before the rebuild in `render()` and restore it in `postRender()`; (c) confirm the "save on Save only" contract — the promote sheet already uses a `temp` object and only commits on `save-promotion`, so only the re-render needs fixing, not the data flow.

### 7. Horizontal drag / "swinging" on the Promote preview
- **Where:** `.preset-scroll` `styles.css:90`, used for the Label row in `promoteSheet()` (`app.js:1644`) and the kicker row in `promoteCategorySheet()` (`app.js:1660`); `.sheet` `styles.css:110`.
- **Measured:** inside the promote sheet, `.preset-scroll` is **1216px of content in a 396px box**. `.sheet` has `overflow-y:auto` but no `overflow-x:hidden` and no `overscroll-behavior`, so a horizontal drag inside the strip chains out to the sheet and then to the page, producing the rubber-band swing. `.promo-ribbon` also overflows its own box (130/112).
- **Fix:** add `overflow-x:hidden; overscroll-behavior:contain;` to `.sheet`; add `overscroll-behavior-x:contain; touch-action:pan-x;` to `.preset-scroll`; give `.promo-preview` `overflow:hidden` clipping for the ribbon; and set `min-width:0` on `.menu-product` grid children so nothing pushes the card wider than the phone column.

### 8. Section titles not centred
- **Where:** `.menu-category-head` `styles.css:103` — `display:flex; justify-content:space-between` puts the `<h2>` hard left and the item count hard right (`app.js:1439`). Promoted sections add a left-aligned `.category-kicker` above it. The `filled` promo label sits at `left:14px` and the framed notch at `left:14px` (`styles.css:740,747`) — your second screenshot's "CHEF'S PICK" pinned to the left edge.
- **Why:** headings drift between left, and centred elsewhere (e.g. `.promo-mini-label` is centred at `styles.css:89`), so the menu reads inconsistent.
- **Fix:** one rule for section headers — stack the kicker, the `<h2>` and the item count centred (`flex-direction:column; align-items:center; text-align:center`), and centre the promo notch/inline label with `left:50%; transform:translateX(-50%)`. Apply in `.menu-category-head`, `.category-kicker`, `.promo-style-framed .promo-notch`, `.promo-style-filled .promo-inline-label`, and mirror it in the two preview renderers (`promoPreview`, `promoteCategorySheet`) so the admin preview matches the guest menu.

## Additional issues found

### 9. Item variants exist in data but never render a price
- `defaultState()` seeds variant items (`app.js:490-500`: Caffè Latte, Espresso, Kallmet Red) with `price: 0` and a `variants[]` array. `priceColumn()` reads `itemPrice(i)` and prints a "from" label, but the **variant list is never shown** — not on the card, not in the detail sheet, not in the editor (`editItemSheet` `app.js:1615-1617` only has a single `price` field). Editing such an item silently destroys its variants. Guest sees "from 150 Lek" with no way to learn what the sizes cost.
- **Fix:** render variants in the detail sheet, and add a Single price / Variants toggle to the item editor before shipping the seeded data.

### 10. Admin item rows show the wrong price for variant items
- `renderAdminItem()` `app.js:1134` prints `money(i.price)` (raw field) instead of `itemPriceLabel(i)`, so the three variant dishes show **0 Lek** in the admin list, in `itemActionsSheet` (`app.js:1687`), in `promoChooserSheet` (`app.js:1668`) and in `bulkPriceSheet` (`app.js:1680`).

### 11. Destructive actions are inconsistently confirmed
- `deleteCategory()` (`app.js:2043`) and `reset-demo` use `showConfirm`. `deleteItem()` (`app.js:2076`) — check its path — and `end-promotion` (`app.js:2108`) fire immediately from a single tap in a sheet. `duplicateItem` gives no feedback beyond a re-render.
- **Fix:** every destructive action goes through `showConfirm` **or** an undo toast (`toastUndo` already exists at `app.js:354` and is barely used).

### 12. Alt text and icon-button labelling
- Decorative-but-meaningful images ship empty alt: `admin-item-img` (`app.js:1134`), promo row thumbnails (`app.js:1144`), bulk-list thumbnails (`app.js:1674`), the special modal hero (`app.js:1697`), the strong-promo card (`app.js:1421`), the restaurant avatar (`app.js:1419`). Public cards do it right (`app.js:1506`).
- The globe language button (`app.js:1417`) has `aria-label="Language"` but no visible label and a ~34px hit area.
- `role="button" tabindex="0"` on `.promo-style-card` (`app.js:1645`) has no keydown handler — keyboard users cannot select a promo design.

### 13. Tap targets and font scale below the 44px / 12px floor
- `.mini-icon` is 32×32 (`styles.css:83`) and there are five of them in every category row — below the 44px guideline and hard to hit on a phone.
- Font sizes bottom out at 8px (`.promo-notch`, `.promo-ribbon span`, `.tag`), 9px, 9.5px and 10.5px across the public menu. Ingredient text at 10.5px with `color:var(--menu-muted)` on a tinted surface is a likely contrast failure and is genuinely hard to read for the over-50 guest a restaurant menu must serve.

### 14. Loading and empty states are partial
- Present: no-search-results on the admin menu (`app.js:1119`), "Nothing is promoted" (`app.js:1146`), "No dishes match that filter" (`app.js:1423`).
- Missing: no state for a menu with **zero categories** — `open-add-item` does `state.categories[0].id` (`app.js:1858`) and `addItemSheet` does the same (`app.js:1619`), which throws on an empty menu. Same crash risk in `promoChooserSheet` with no items. No error state anywhere, and the only "loading" is the fake 180ms skeleton from #4.

### 15. Hardcoded values that should be dynamic
- The guest-facing strings listed in #3, plus: `"Recommended"` promo fallback (`app.js:1496`), `"Offer available now"` (`app.js:1504`), `"Something worth noticing — just for tonight."` (`app.js:1697`), the `≈` conversion prefix, `toLocaleString('en-GB')` (`app.js:1236`) hardcoding UK number formatting regardless of language, and `billed in Albanian Lek` (`app.js:1224`) hardcoded next to a dynamic price.

### 16. Guest and owner share one state blob
- Everything — appearance, menu, guest language, guest currency, analytics — lives under one `STORAGE_KEY` written by `save()` (`app.js:635`). A guest on `/menu/:slug` who changes language or display currency writes to that same record. It works in a prototype but it's the wrong seam, and it will make the eventual backend split painful. Worth separating guest-session state now.

### 17. Analytics tracking runs on the owner's own previews
- `startGuestSession('preview')` fires whenever the owner switches to preview mode (`app.js:1841`), and `track('item_view')` runs from the intersection observer (`app.js:1750`). Owner activity is being counted as guest traffic in the Insights numbers.

## Suggested fix order

1. Guest-menu correctness — #1 price duplication/occlusion, #2 missing photo, #8 centring, #13 contrast/size floor.
2. Interaction quality — #4 flash and #6 scroll-to-top (one shared root cause), #7 overflow lock.
3. Language — #3, which depends on the string table and on #16 guest state separation.
4. Data integrity — #9, #10, #14 crash paths, #11 confirmations.
5. Polish — #5 duplicate CTA, #12 a11y, #15 hardcoded strings, #17 analytics.

Nothing has been implemented. Tell me which numbers to take, and in what order.
