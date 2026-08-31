# Hap — reconciling the Codex plan with what is actually in this project

## What I checked first

The pasted plan says frontend phases 0–13 are complete. That is not true of the code
in this project. I read the files before writing this:

- `public/hap/app.js` is 2354 lines, `ops.js` 548, `styles.css` 830 — one prototype
  app, exactly as the audit described.
- No `FRONTEND_VERIFICATION_REPORT.md` and no `FRONTEND_BACKEND_HANDOFF.md` exist.
- There is no service/domain layer: `src/lib/` holds only `hap-routes.ts`,
  `download.ts` and error helpers. No Business / Restaurant / Promotion entities.
- Storage is still one blob, `hapPrototypeV4`, holding one restaurant. The v14
  migration that exists is only "menus + category description/hidden + item
  variants" — not a tenancy model.
- Routes are `/`, `/preview`, `/admin`, `/admin/*`, `/super`, `/super/*`,
  `/menu/$slug`. There are no restaurant-scoped admin URLs.
- `switch-mode` (the role-flipping sheet) is still in `app.js`. No impersonation, no
  no-permission states, no scheduled promotions, no `UI_STRINGS`/translation table.

What *is* genuinely done, from the two archived plans in `.lovable/plan/`: the
information architecture lock (Overview / Menu / Promote / Insights / Settings,
legacy redirects, Control tabs), the menu workspace with variants and bulk controls,
and audit fix steps 0–3 (guest prefs on their own key, `itemPriceLabel`, overflow
lock, scroll retention).

So the Codex document is best treated as a **specification of what still needs
building**, not a record. Below is that specification re-sequenced against the real
starting point, with the cheap correctness work first and the structural work only
where it actually unblocks something.

## Sequence

### 1. Finish the open audit work (small, already scoped)

- Language layer: `UI_STRINGS` table (EN/SQ/IT/EL) + `t(key)` with EN fallback;
  replace hardcoded guest chrome (search, filters, see details, sold out, contains,
  allergen/diet labels, "Recommended", the `≈` prefix); locale-aware number
  formatting instead of `en-GB`; persistent language chip limited to published
  languages.
- Polish: one "New promotion" CTA; confirm or undo on every destructive action;
  real alt text and keyboard handling on promo/style cards; empty states for zero
  categories and zero items; stop counting owner preview sessions as guest events.

### 2. Kill the role variable (the audit's #1 finding)

- Remove the `switch-mode` sheet from reachable UI. Which application you are in
  becomes a property of the URL, not of `state.role`.
- `/super/*` stops being reachable from restaurant admin.
- Add explicit no-permission rendering as a first-class state so restricted views
  have somewhere to land.

### 3. Tenancy in the URL

- Restaurant-scoped admin routes: `/r/$slug/admin/...`, with `/admin/...` kept as a
  redirect to the current restaurant so existing links and QR codes stay valid.
- Storage keyed per restaurant instead of one global blob, with a migration that
  moves the existing `hapPrototypeV4` data in as the first restaurant, losing
  nothing.
- Public menu identity stays independent of the restaurant display name.

### 4. Demote Preview from a mode to an action

- Remove `/preview` as a top-level mode; replace it with a single global "View
  Menu" action that opens the real public menu for the current restaurant.

### 5. Data/service boundary (only after 2–4)

- Introduce plain-JS service interfaces plus a mock implementation for the entities
  the UI actually uses: Restaurant, Menu, Category, Item, ItemVariant, Promotion,
  Settings, Currency, Team, Activity, Insight, Subscription.
- Model loading, failure, empty and no-permission responses at the boundary rather
  than per screen.
- No backend connection. No React/TypeScript rewrite of the prototype.

### 6. Feature completion, in product order

- **Promote:** Active / Scheduled / Past lifecycle, scheduling (Now, Until Closing,
  Schedule, Custom), pause/resume/end, strong-promotion conflict prevention.
- **Insights:** fixed event taxonomy, honest metrics only, no revenue or conversion
  claims, genuine empty state.
- **QR:** stable identity per public menu, PNG/SVG/PDF, share/copy fallbacks.
- **Settings:** currency conversions, translation health, appearance presets, team
  and permissions, truthful billing.
- **Control:** attention filters, users and memberships, billing, audited
  impersonation with banner and exit, remove direct superadmin menu editing.

### 7. Gate

- 390px and 320px passes, light and dark, keyboard and focus, contrast, 44px touch
  targets, text scaling, reduced motion.
- Scale fixtures at 5 / 50 / 150 / 300 items and 5 / 20 categories.
- Then, and only then, the handoff document that Codex's Phase 13 describes.

## Technical notes

- All prototype work stays in `public/hap/app.js`, `ops.js` and `styles.css`. The
  TanStack routes stay thin shells around `<HapApp path=... />`; only step 3 adds
  route files.
- Every storage change ships with a forward migration off `hapPrototypeV4`; guest
  preferences stay on their separate `hap.guest.v1` key.
- Verification after each step is a headless-browser pass over admin, the public
  menu and Control, checking console errors, price rendering, scroll retention and
  horizontal overflow — the same method as the audit.
- No backend, no Cloud, no payment provider in any of the above.

## How I would run it

One step per `continue`, each ending with a short report of what changed and what is
still open — matching the stop-gate protocol in the pasted plan.
