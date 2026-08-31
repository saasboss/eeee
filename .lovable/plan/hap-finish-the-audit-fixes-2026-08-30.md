# Hap — finish the audit fixes

Confirmed current state: `public/hap/app.js` (2247 lines) already has guest-pref boot (`loadGuestPrefs()` called at line 2192), variant form parsing (`formVariants`, validation, `saveEditItemForm` persistence) and the variant click handlers (`item-price-mode`, `variant-add`, `variant-remove` — they call `syncVariantDraft`). Neither `loadGuestPrefs()` nor `syncVariantDraft()` is defined anywhere in the file, so those paths throw today. The skeleton double-render is gone and the empty-category "Add item" guard is in. No `styles.css` changes from the audit have landed.

## Step 0 — Unbreak the app (first)

- Add `syncVariantDraft(item, form)`: read `formVariants(form)` plus the single-price field and the current price mode, write them onto the item draft so re-renders during variant editing don't lose typed values.
- Add `loadGuestPrefs()` / `saveGuestPrefs()` on a separate `hap.guest.v1` localStorage key holding only `{ language, displayCurrency }`. Route guest-side language/currency writes to it instead of the shared `hapPrototypeV4` blob (audit #16, guest-scoped `save()` branch).

## Step 1 — Guest menu correctness

- **#1 one price per card:** in `renderPublicItem`, for `offer` style keep the offer strip as the only price surface; for `ribbon` reserve the top-right corner so the ribbon never prints over the price.
- **#2 detail hero:** add a 16:9 `object-fit:cover` hero image at the top of `itemDetailsSheet()`, with a fallback when `image` is empty.
- **#8 centred section titles:** stack kicker + `<h2>` + item count centred in `.menu-category-head`; centre the framed notch and filled inline label; mirror in `promoPreview` and `promoteCategorySheet`.
- **#13 legibility floors:** raise the smallest public-menu type to a 12px floor (8/9/9.5/10.5px rules), raise ingredient-text contrast, and grow `.mini-icon` hit areas toward 44px.

## Step 2 — Variant UI (completes the half-built feature)

- Edit-item sheet: Single price / Variants mode toggle plus editable variant rows (name + price, add/remove) wired to the existing handlers.
- Detail sheet: list variants with their prices instead of a bare "from" figure.
- **#10:** replace raw `money(i.price)` with `itemPriceLabel(i)` in `renderAdminItem`, `itemActionsSheet`, `promoChooserSheet` and `bulkPriceSheet` so variant dishes stop showing 0 Lek.

## Step 3 — Interaction quality

- **#7 overflow lock:** `overflow-x:hidden; overscroll-behavior:contain` on `.sheet`; `overscroll-behavior-x:contain; touch-action:pan-x` on `.preset-scroll`; `overflow:hidden` on `.promo-preview`; `min-width:0` on `.menu-product` children.
- **#6 scroll safety net:** capture `.content-scroll` / `.sheet` `scrollTop` in `render()` and restore it in `postRender()`, so filter/toggle/promo-temp taps no longer jump to the top.

## Step 4 — Language and strings

- Add a `UI_STRINGS` table (EN/SQ/IT/EL) with a `t(key)` helper, fall back to EN, and replace the hardcoded guest chrome (search, filters, see details, sold out, contains, items, allergen/diet labels, "Recommended", "Offer available now", the `≈` prefix, `billed in Albanian Lek`).
- Locale-aware number formatting instead of hardcoded `en-GB`.
- Persistent language chip in the sticky toolbar; picker limited to the restaurant's published languages.

## Step 5 — Polish

- **#5** single "New promotion" CTA on the Promote surface.
- **#11** every destructive action gets `showConfirm` or a `toastUndo`.
- **#12** meaningful alt text on admin/promo/bulk/hero images; keydown handler on `.promo-style-card`.
- **#14** empty-menu states for zero categories and zero items in the promo chooser.
- **#17** stop counting owner preview sessions and item views as guest analytics.

## Notes

All work stays inside `public/hap/app.js` and `public/hap/styles.css`; the React routes remain thin shells. Verification: drive the admin, preview and `/menu/:slug` screens in a headless browser after each step, checking for console errors, price rendering, scroll retention and horizontal overflow.
