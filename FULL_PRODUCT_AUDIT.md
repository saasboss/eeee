# Hap — Full Product Audit

Date: 2026-08-27
Scope: the whole product as it exists in this repository — the prototype application in `public/hap/` (`app.js` 1821 lines, `ops.js` 553 lines, `styles.css` 704 lines) and the TanStack Start shell in `src/` that serves it.
Method: code reading plus headless-browser inspection of the running app at desktop (1280px) and mobile (390px) across `/`, `/preview`, `/admin` and every admin tab/subpage, `/super` and every tab, `/menu/{slug}`, and invalid URLs.

Every finding uses: **Current behaviour → Problem → Risk → Recommendation → Why → Priority → Effort**. Anything not verified by running or reading code is marked **ASSUMPTION**.

---

## 0. Executive summary

Hap is one prototype application rendering HTML strings into a fixed 430px phone frame, embedded in an iframe by seven thin React routes. It looks like three products (public guest menu, restaurant admin, platform control) but is one client-side state machine with no authentication, no tenancy, and no backend. The screens themselves are, on the whole, well-conceived; the structure underneath them is what will force a rewrite.

The five things that matter most:

1. **Roles are a variable, not a boundary.** `state.role` is flipped by a sheet (`app.js:1326`, handler `app.js:1585`) with no check. `/super/*` is reachable by typing the URL. Nothing in the product is protected.
2. **Crossing a route boundary reloads the iframe and destroys in-app state.** `/admin` → `/admin/menu` are different React route files, so the frame remounts. Verified in the browser.
3. **No URL identifies which restaurant is being edited.** One `localStorage` blob (`hapPrototypeV4`, `app.js:4`) holds a single restaurant; `?slug=` only swaps a display name. Every screen built from here inherits the assumption of one implicit restaurant.
4. **Preview is modelled as a third top-level mode** (`switch-mode`, `app.js:592-593`) peer to Admin, which is why "which restaurant am I" and "am I previewing" feel like the same class of decision. They are not.
5. **Accessibility is below a shippable floor.** `outline:0` on inputs with no `:focus-visible` replacement (`styles.css:81,95,100,446`), touch targets at 31–32px (`.mini-icon`, `.item-action`), and a 13-step tour overlay that blocks every deep link on first load — including superadmin routes.

Recommended direction: **three applications sharing a component library, not three modes of one app**; **tenancy in the URL now**; **preview demoted from a mode to an action**; and an explicit decision about which screens are worth porting when this leaves prototype form.

---

## 1. Product model as built

| Layer | Reality |
| --- | --- |
| Routes (`src/routes/`) | `index.tsx`, `preview.tsx`, `admin.index.tsx`, `admin.$.tsx`, `super.index.tsx`, `super.$.tsx`, `menu.$slug.tsx`. Each sets SEO metadata and renders `<HapApp path=... />`. No data loading, no auth, no guards. |
| Bridge (`src/components/hap-app.tsx`) | Iframe with `?p=<path>`; `postMessage` in both directions to keep browser URL and in-app screen in sync. |
| App (`public/hap/app.js`) | `applyPath` / `currentPath` (`app.js:16-35`) map paths onto `state.mode`, `state.role`, `state.adminTab`, `state.adminSubpage`. Everything renders through template strings and a single delegated click handler. |
| Platform console (`public/hap/ops.js`) | Superadmin screens plus its own copy of plan constants and seeded platform metrics. |
| Data | One `localStorage` key, one restaurant, a hardcoded list of five platform restaurants (`src/lib/hap-routes.ts:25-33`). |

**Problem** The mental model in the code (`mode` × `role` × `tab` × `subpage`) is four dimensions where the product has two: *who you are* and *what screen you're on*.
**Risk** Every new screen must be threaded through four state fields and two path maps that already disagree (see 4.3).
**Recommendation** Collapse to `app` (guest | admin | control) × `route`. Role stops being state; it becomes which application you loaded.
**Why** It removes an entire class of impossible-state bugs and makes URLs authoritative.
**Priority** P1 · **Effort** Medium (within the prototype) / High (as part of the rewrite).

---

## 2. Routing and navigation

### 2.1 Iframe reload on route change (verified)
**Current** `/admin` and `/admin/menu` are separate route files, so React unmounts one `HapApp` and mounts another; the iframe reloads and re-reads `localStorage`.
**Problem** Unsaved sheet state, scroll position, search text and open modals are lost on any cross-file navigation.
**Risk** Users lose work; it reads as a bug, not a design.
**Recommendation** Short term: render one `HapApp` from a shared layout route (`admin.tsx` with `<Outlet />`) so the frame persists. Long term: drop the iframe.
**Why** The iframe exists only because the prototype is not React; it costs state, focus, deep-link scroll and back-button fidelity.
**Priority** P0 · **Effort** Low (layout route) / High (de-iframe).

### 2.2 `/admin/analytics` is defined twice and one path is unreachable
**Current** `insights` tab maps to `/admin/analytics` (`app.js:12`) and the `analytics` subpage maps to the same path (`app.js:13`); `applyPath` explicitly excludes the subpage (`app.js:32`, `sub!=='analytics'`).
**Problem** Dead entry, and the More-list row that opens the subpage produces a URL that resolves to a different screen.
**Recommendation** Delete the `analytics` subpage entry; keep the tab.
**Priority** P2 · **Effort** Low.

### 2.3 No tenancy in any admin URL
**Current** `/admin/menu` never says whose menu. `/menu/$slug` accepts a slug but only renames the header.
**Risk** The single largest structural debt. Real accounts, impersonation, support links and multi-venue owners all require it, and retrofitting it touches every screen.
**Recommendation** Adopt now: `/r/$restaurant/menu`, `/r/$restaurant/promotions`, …; public `/m/$slug`; platform `/control/*`.
**Priority** P1 · **Effort** Medium now, High later.

### 2.4 Preview as a top-level mode
**Current** A segmented control toggles Admin ↔ Preview (`app.js:592-593`); `/preview` is a peer route.
**Problem** Preview is a *view of your own menu*, not a workspace.
**Recommendation** Replace with an action inside admin: "View public menu" (opens the real `/m/$slug`) and an in-page device frame for design work.
**Priority** P1 · **Effort** Low.

### 2.5 Back-button and deep-link behaviour
**Current** In-app navigation posts `hap:navigate` and calls `router.navigate({ replace: false })`, so history grows correctly; but sheets and modals are not routed, so Back from an open sheet leaves the page instead of closing the sheet.
**Recommendation** Route sheets (`?sheet=add-item`) or intercept Back to close the topmost overlay.
**Priority** P2 · **Effort** Medium.

---

## 3. Roles, access and security

### 3.1 Role switching is an unauthenticated UI control
**Current** `set-role` (`app.js:1585`) writes `state.role` and re-renders. Exposed in the top bar and in More.
**Risk** In this prototype the data is fake, so the exposure is presentational — but the *interaction model* teaches the team that platform control is one tap from restaurant admin. Ship that shape with real data and it is a privilege-escalation design.
**Recommendation** Delete the workspace switcher from restaurant admin. Platform staff sign in separately and land on `/control/*`. Keep an explicit, logged "open as this restaurant" impersonation in the other direction only.
**Priority** P0 (as a design decision) · **Effort** Low.

### 3.2 `/super/*` is publicly enterable
**Current** Typing the URL renders the console. `robots: noindex` is set (`super.$.tsx:32`) — that is the only protection.
**Recommendation** Gate the whole control subtree behind auth before any real data exists.
**Priority** P0 · **Effort** Medium (needs auth).

### 3.3 No authentication anywhere
No login, no session, no user identity; "Staff" is a list with no effect. **P0** to introduce before real data · **Effort** High.

---

## 4. Screens: defects found

| # | Location | Finding | P | Effort |
| --- | --- | --- | --- | --- |
| 4.1 | `app.js:1395-1398` | Rows in the restaurant detail sheet look clickable (chevrons, hover) but have no action. | P2 | Low |
| 4.2 | `app.js:882` | `data-tour="appearance"` has no matching tour step — orphan anchor. | P3 | Low |
| 4.3 | `app.js:12-13`, `:32` | Duplicate `/admin/analytics` (see 2.2). | P2 | Low |
| 4.4 | `app.js:1015-1026`, handler `:1544` | Every billing control is a `billing-placeholder` toast: change plan, manage subscription, update payment method, each invoice row. | P1 | Medium |
| 4.5 | `disable-promo`, `remove-rate`, item delete | Destructive actions with no confirmation and no undo. | P1 | Low |
| 4.6 | Add/edit item, settings forms | Validation is name-only; price accepts negatives and blanks; no inline field errors. | P1 | Medium |
| 4.7 | Tour (`app.js:324`) | 13-step overlay runs on first load of *any* deep link, including `/super/*`, blocking the UI. | P1 | Low |
| 4.8 | `ops.js` | Platform metrics (MRR, churn, API latency) are seeded constants, not derived from records; plan constants are duplicated from `app.js` and can drift. | P2 | Medium |
| 4.9 | Notifications, password reset, export buttons | Stubbed without saying so. | P2 | Low |

**Recommendation pattern for 4.4/4.9** Anything not implemented should be a visibly labelled "Coming soon" block, never a live-looking button that toasts. Fake affordances destroy trust in demos with real prospects faster than a missing feature does.

---

## 5. Accessibility

| Finding | Evidence | P | Effort |
| --- | --- | --- | --- |
| Focus is invisible: `outline:0` on inputs and controls with no `:focus-visible` replacement | `styles.css:81, 95, 100, 446` | P0 | Low |
| Touch targets below 44px: `.mini-icon` 32px, `.item-action` 31px | `styles.css` | P1 | Low |
| Sheets and modals have no focus trap and no Escape-to-close | `app.js` sheet shell | P1 | Medium |
| Toggles are styled buttons without `role="switch"` / `aria-checked` | throughout | P2 | Low |
| Toasts are not announced (`aria-live` missing) | `toast-layer` | P2 | Low |
| Icon-only buttons: some have `aria-label`, many do not | mixed | P2 | Low |
| Contrast of `--muted` text on `--surface` needs measurement | **ASSUMPTION — verify with a contrast checker** | P2 | Low |

A single `:focus-visible` rule plus two size bumps clears the first two rows in under an hour. There is no reason to carry them.

---

## 6. Responsiveness

**Current** One breakpoint at 700px; above it the app is a 430px phone frame centred on a grey field. Verified at 1280px.
**Problem** Restaurant admin is plausibly phone-first (an owner editing a dish between services). The **Superadmin console is not** — tables of restaurants, users and plans inside a 430px column is the wrong instrument for a desk job.
**Recommendation** Keep admin phone-first with a comfortable tablet/desktop widening (content max-width ~720px, not a device frame). Give `/control/*` a real desktop layout with tables, filters and bulk actions.
**Why** The phone frame is a prototype presentation device that has quietly become the product's layout system.
**Priority** P1 · **Effort** Medium (admin) / High (control).

---

## 7. Data and state

- Single `localStorage` blob; no server, no sync, no multi-device, no audit trail.
- One restaurant object; five platform restaurants hardcoded in TS (`hap-routes.ts:25-33`) and not connected to the app's own state — the two lists can disagree.
- Migrations are ad-hoc version bumps that have previously stripped fields.

**Recommendation** When the backend lands (Lovable Cloud): `restaurants`, `menu_categories`, `menu_items`, `promotions`, `subscriptions`, `user_roles` (roles in their own table — never on a profile row), plus RLS scoped to restaurant membership. Until then, stop adding fields to the blob that will not survive the move.
**Priority** P1 · **Effort** High.

---

## 8. Maintainability

3,078 lines of string-templated HTML with a single delegated click handler and inline styles interleaved into markup. It is fast to prototype in and cannot be reviewed, tested, or safely refactored. Two files already duplicate plan constants.

**Position:** the prototype is the risk, not the individual screens. Do not invest in polish that is scheduled for demolition.

| Screen | Verdict when porting |
| --- | --- |
| Public menu (categories, item detail, filters) | **Port as-is** — the interaction design is the strongest part of the product. |
| Admin menu editor | **Port with changes** — keep the layout, rebuild forms with real validation. |
| Design/appearance | **Port as-is.** |
| Promotions | **Port with changes** — needs scheduling and confirmation. |
| Home dashboard | **Rebuild** — half its numbers are hardcoded. |
| Analytics | **Rebuild** on real events. |
| Billing | **Rebuild** or remove until there is a payment provider. |
| Superadmin console | **Rebuild** for desktop. |
| Onboarding tour | **Remove**; replace with an empty-state-driven checklist. |

---

## 9. SEO and metadata

Good: every route has a distinct `head()` with title, description, `og:*` and `twitter:card`; `/super/*` is `noindex`.
Gaps: no `og:image` anywhere (no absolute hero URL exists yet — correct to omit, revisit when brand art lands); no canonical tags; `/menu/$slug` has no JSON-LD (`Restaurant` + `Menu` schema is directly applicable and would be a real acquisition advantage); all content is inside an iframe, so **crawlers see an empty shell** — the single most important SEO fact about this product.
**Priority** P1 for the public menu (de-iframe or SSR it) · **Effort** High.

---

## 10. What I considered and rejected (anti-overbuild)

- **Multi-venue business switcher UI** — no customer has two venues yet; tenancy in URLs is enough groundwork.
- **Granular permission editor** — three fixed roles cover every real request today.
- **Audit-log UI** — record the events server-side now, build the screen when support asks for it twice.
- **Notification centre** — toasts suffice; a centre implies a delivery system that does not exist.
- **Multi-currency beyond the two present** — no demand signal.
- **Automated billing** — until a provider is chosen, manual subscription grants in the control console are honest and cheaper.

---

## Deliverable A — Route tree (current → proposed)

```text
current                         proposed
/                               /                      marketing / entry
/preview                        (removed — action in admin)
/admin                          /r/$restaurant
/admin/menu                     /r/$restaurant/menu
/admin/promotions               /r/$restaurant/promotions
/admin/design                   /r/$restaurant/design
/admin/qr                       /r/$restaurant/qr
/admin/analytics                /r/$restaurant/analytics
/admin/settings                 /r/$restaurant/settings
/admin/billing                  /r/$restaurant/billing
/admin/staff                    /r/$restaurant/staff
/admin/appearance               (merged into /design)
/admin/more                     (kept, phone only)
/super                          /control
/super/restaurants              /control/restaurants
/super/users                    /control/users
/super/plans                    /control/plans
/super/settings                 /control/settings
/menu/$slug                     /m/$slug               SSR, no iframe
```

## Deliverable B — Screen inventory

| Screen | Action |
| --- | --- |
| Landing | Keep |
| Guest menu | Keep · Move to SSR |
| Guest preview | **Remove** (becomes an action) |
| Admin home | Modify (real data) |
| Menu editor | Keep · Modify (validation, confirm, undo) |
| Promotions | Modify (scheduling, confirm) |
| Design | Merge with Appearance |
| Appearance | **Merge** into Design |
| QR | Keep |
| Analytics (tab) | Modify (real events) |
| Analytics (subpage) | **Remove** (duplicate) |
| Settings | Keep |
| Billing | Modify → honest read-out |
| Staff | Modify (make roles mean something) |
| More | Keep · Rename "Account" |
| Workspace switcher | **Remove** |
| Control: overview / restaurants / users / plans / settings | Modify (derive metrics; desktop layout) |
| **Add** | Auth / sign-in, per-restaurant translations screen, impersonation entry in control |

## Deliverable C — Role access matrix (target)

| Screen | Guest | Staff | Owner | Platform |
| --- | --- | --- | --- | --- |
| `/m/$slug` | ✅ | ✅ | ✅ | ✅ |
| `/r/$id/menu`, `/promotions`, `/design`, `/qr` | ✕ | ✅ | ✅ | via impersonation |
| `/r/$id/analytics`, `/settings`, `/staff` | ✕ | ✕ | ✅ | via impersonation |
| `/r/$id/billing` | ✕ | ✕ | ✅ | ✅ |
| `/control/*` | ✕ | ✕ | ✕ | ✅ |

## Deliverable D — Navigation model

Three entry points, no switching between them in the UI: guests arrive at `/m/$slug` from a QR code; restaurant users sign in and land on `/r/$restaurant`; platform staff sign in and land on `/control`. Within admin: bottom tab bar on phones (Home, Menu, Promote, Design, Account), sidebar above 900px. Within control: desktop sidebar plus data tables. Impersonation is the only cross-application path and shows a persistent banner with "Return to control".

## Deliverable E — Backlog

**P0** — focus-visible styles · stop the iframe reload between admin routes · gate `/control/*` behind auth · remove the workspace switcher from admin.
**P1** — auth + user_roles table · tenancy in URLs · confirmation + undo on destructive actions · real form validation · honest billing · suppress the tour on deep links · 44px touch targets · desktop layout for control · derive control metrics from records · SSR the public menu.
**P2** — sheet focus trap & Escape · route overlays for Back · remove the duplicate analytics path · fix the inert detail rows · dedupe plan constants · label stubs "Coming soon" · JSON-LD + canonicals.
**P3** — remove the orphan tour anchor · `aria-live` toasts · `role="switch"` toggles · contrast audit.

## Deliverable F — Dependency order

1. Accessibility and iframe-reload fixes (independent, ship immediately).
2. Auth + `user_roles` — unblocks the control gate and impersonation.
3. Backend schema + RLS — unblocks tenancy, real analytics, honest billing.
4. Tenancy in URLs — must land before more screens assume one restaurant.
5. Split into three shells; delete preview-as-mode; desktop control layout.
6. De-iframe and SSR the public menu (largest single piece; do it last, with the component library the previous steps produce).

---

## Status log — 2026-08-27 (implementation pass 1)

Already correct at audit time (do not redo): item delete confirms + undo (`app.js:1736`), the tour only auto-starts when the boot path is `/admin`, `#toast-layer` has `aria-live="polite"`.

Done in this pass:

- **Batch 1 — accessibility.** Removed every bare `outline:0` in `styles.css`; added a global `:focus-visible` ring plus `:focus-within` rings on `.search-field` / `.public-search`; expanded `.mini-icon` and `.item-action` hit areas to 44px with an `::after` overlay (visual size unchanged).
- **Batch 2 — no more iframe reload.** New layout routes `src/routes/admin.tsx` and `src/routes/super.tsx` mount a single `HapApp`; `admin.index/$` and `super.index/$` render `null` but keep `head()` metadata and the 404 checks. Verified: text typed in the admin search survives `/admin/menu` → `/admin/qr` → `/admin/menu`; `/admin/nope` and `/super/bogus` still show the 404 screens.
- **Batch 3 — dead ends and honest stubs.** Removed the `analytics` subpage (path map, dispatcher, "View insights" now opens the Insights tab) and the orphan `data-tour="appearance"`; restaurant-detail sheet rows no longer show chevrons on inert rows; billing's fake buttons, payment-method card and invoice rows are replaced by one "Coming soon — self-serve billing" block, and the `billing-placeholder` handler is deleted.
- **Batch 4 — destructive actions + validation.** `disable-promo` and `remove-rate` now go through `showConfirm()`. New `validateItemForm()` adds inline field errors for add/edit item (name required, price required, numeric, > 0); category add/rename use inline errors instead of toasts. `.field-error` styling added.
- **Batch 5 — overlays.** Tab focus trap added for the topmost overlay (confirm modal > sheet > special modal). Escape-to-close and `ui.lastFocus` restore already existed.

Still open (unchanged from the backlog): auth + `user_roles`, gating `/control/*`, tenancy in URLs (`/r/$restaurant/*`, `/m/$slug`), removing preview-as-mode, real backend schema + RLS, derived control metrics, desktop layout for control, SSR/de-iframe of the public menu, routing overlays for the Back button, deduping plan constants between `app.js` and `ops.js`, `role="switch"` on toggles, contrast audit, JSON-LD + canonicals.
