# Hap — where the sequence actually stands, and finishing Step 4 + Step 5

## What I verified in the code just now

- **Step 1 (audit finish): done.** `UI_STRINGS` + `t()` live at `app.js:230-331`, guest chrome and locale-aware formatting are in.
- **Step 2 (kill the role variable): done.** No `switch-mode`, `roleSheet` or `set-role` anywhere. `ACCESS_KEYS` / `access()` / `canAccess()` (`app.js:110-115`) and `noPermissionPage()` (`app.js:121`) exist and are wired into both the tab renderer (`app.js:1283`) and the sub-page renderer (`app.js:1408`).
- **The three "still open" items from the last batch are closed.** `.proto-view-menu` has CSS (`styles.css:566-568`), the unused `isAdmin` const is gone, `startGuestSession('public')` now runs in the public-menu context (`app.js:2493`).
- **Step 3 (tenancy): done.** `src/routes/r.$slug.admin.*` exist, `/admin/*` redirects, storage is per-restaurant on `hap.restaurant.<slug>.v1` with `migrateLegacy()` off `hapPrototypeV4` (`data.js:19-53`).
- **Step 4: mostly done, one leftover.** The prototype bar has a single "View menu" action (`app.js:1013`, `openPublicMenu()` at `app.js:99`), but `/preview` still exists as a top-level route (`src/routes/preview.tsx`) rendering `<HapApp path="/preview" />`.
- **Step 5 (service boundary): not started.** `data.js` is only a localStorage driver plus guest prefs — no entity services, no loading/failure/empty/no-permission response model.
- **Step 6 onwards: not started** (no scheduled promotions, no promotion lifecycle, no impersonation).

So: through Step 4, minus the `/preview` removal. This plan closes that and delivers Step 5.

## Step 4 leftover — retire `/preview`

- Replace `src/routes/preview.tsx` with a redirect to the public menu of the default restaurant (`/menu/sofra`), keeping the URL alive for old bookmarks instead of 404ing.
- Remove the `/preview` branch from the prototype app's own router in `app.js` so preview stops being a mode; anything reaching it lands on the public menu.
- Confirm nothing else links to `/preview` (prototype bar, admin nav, tour).

## Step 5 — data/service boundary

New file `public/hap/services.js`, loaded before `app.js`, exposing `window.HapServices`.

- **Entities covered:** Restaurant, Menu, Category, Item, ItemVariant, Promotion, Settings, Currency, Team, Activity, Insight, Subscription.
- **Uniform response envelope** so screens stop inventing their own states:
  `{ status: 'ok' | 'loading' | 'empty' | 'denied' | 'error', data, error }`.
  `denied` is produced by the boundary from `canAccess()`, not re-checked per screen.
- **Mock implementation** reads and writes through the existing `Data.restaurants` store, so behaviour and persistence are unchanged — this is a boundary, not a rewrite.
- **Adoption:** point the read paths the admin screens already use at the service functions, leaving render code otherwise intact. No React/TypeScript port, no backend, no Cloud.

## Verification

One headless-browser pass at the end of the batch covering `/r/sofra/admin`, `/menu/sofra`, `/preview` (should redirect) and `/super` — checking console errors, price rendering, scroll retention and horizontal overflow.

## Working style going forward

Recorded as a project rule: batch independent reads and edits into single messages, verify once per batch rather than per file, and avoid re-reading files already known — minimum tool calls for the same result.
