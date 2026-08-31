# Phase 1 — Lock Information Architecture

Restructure the Hap restaurant admin so every concept has exactly one home, the bottom navigation is the canonical five, and every screen is a real, deep-linkable URL. No backend, no visual redesign, no new features.

## Current state (verified)

- The admin UI is the standalone app in `public/hap/app.js`, embedded in an iframe by `src/components/hap-app.tsx` and kept in sync with TanStack routes over `postMessage`.
- Bottom nav today is: Home, Menu, QR, Insights, More — so QR is top-level and Promote is not.
- Paths today: `/admin`, `/admin/menu`, `/admin/promotions`, `/admin/design`, `/admin/qr`, `/admin/analytics`, `/admin/more`, plus flat sub-pages `/admin/appearance`, `/admin/staff`, `/admin/settings`, `/admin/billing`.
- Overview duplicates other pages: quick actions for QR and Design, a "Missing translations" count as a headline signal, and promotion info also owned by Promote.
- "More" contains a **Switch workspace** row into Superadmin, and the prototype top bar has a workspace-switch button — restaurant users can enter Hap Control.
- Settings (in `public/hap/ops.js`) has a **Payment methods** section listing Cash / Card "Visa, Mastercard" / Mobile wallet "Apple Pay and Google Pay" — unsupported claims.
- There is no separate Reports/Statistics page; Insights is already the only measurement surface.

## Target navigation

Overview · Menu · Promote · Insights · Settings

| Concept | Canonical home |
| --- | --- |
| Menu, categories, items, search, filters, availability, reorder, bulk, menu QR | Menu |
| All promotion management | Promote |
| All measured guest behaviour | Insights |
| Restaurant details, hours, currency, translation, appearance, team, billing, security, help | Settings |
| Status, actionable issues, add item / availability / new promotion shortcuts, visitor snapshot, active promotion | Overview |

## Route map

Canonical:

```text
/admin                        Overview
/admin/menu                   Menu
/admin/menu/qr                Menu QR (moved off top level)
/admin/promote                Promote
/admin/promote/new            New promotion
/admin/insights               Insights
/admin/settings               Settings hub
/admin/settings/restaurant    details, hours
/admin/settings/currency
/admin/settings/translation
/admin/settings/appearance    (was /admin/design + /admin/appearance)
/admin/settings/team          (was /admin/staff)
/admin/settings/billing
/admin/settings/security
/admin/settings/help
```

Old URLs redirect instead of 404: `/admin/promotions` → `/admin/promote`, `/admin/analytics` → `/admin/insights`, `/admin/qr` → `/admin/menu/qr`, `/admin/design` and `/admin/appearance` → `/admin/settings/appearance`, `/admin/staff` → `/admin/settings/team`, `/admin/more` → `/admin/settings`, `/admin/billing` → `/admin/settings/billing`.

Superadmin routes under `/super` stay exactly as they are — a separate product, reachable only by direct URL.

## Changes to make

**Navigation**
- Replace the five restaurant tabs with Overview / Menu / Promote / Insights / Settings; keep the existing bottom-nav component and styling.
- Fold today's "More" list into the Settings hub (Appearance, Team, Restaurant details, Billing, plus the existing prototype tools kept under a clearly labelled Prototype section).

**Overview cleanup**
- Remove the QR quick action, the Design quick action, and the "Missing translations" headline signal.
- Keep: live status, setup checklist, Add item, availability control, new-promotion shortcut, visitor snapshot, one active-promotion line (read-only, links into Promote).
- No duplicate "Edit menu" shortcut, since Menu is permanent navigation.

**Promote**
- Promote becomes a top-level tab with its own route; contextual "Promote" affordances on item/category rows stay as shortcuts that open the existing editor.

**QR**
- QR page moves under Menu as `/admin/menu/qr`, entered from a Menu header/action rather than the tab bar. The page itself is unchanged.

**Settings**
- Delete the Payment methods section (Cash / Card Visa-Mastercard / Apple Pay + Google Pay) and its toggle handler; remove placeholder permission rows.
- Group the existing settings screens under the routes above. Screens that do not exist yet as content (currency, translation, security, help) are wired only if the current settings page already contains those sections — no new speculative pages.

**Admin / Superadmin separation**
- Remove the "Switch workspace" row from the restaurant admin and the workspace-switch button in the prototype bar, plus the role sheet entry point from restaurant context.

**Preview**
- Keep one global Preview entry (the existing header/status Share-Preview path) and remove repeated per-page Preview buttons.

## Technical notes

- `public/hap/app.js`: rewrite `ADMIN_TAB_PATHS` / `ADMIN_SUBPAGE_PATHS`, `currentPath()` and `applyPath()` for the nested scheme, add legacy-path normalisation in `applyPath` so old URLs resolve to the new state, and update `adminNav()` tab list and the page dispatch map in `renderRestaurantAdmin()`.
- `src/lib/hap-routes.ts`: replace the flat `ADMIN_SCREENS` list with a matcher that accepts nested screens (`menu/qr`, `settings/appearance`, …) plus the legacy aliases.
- `src/routes/admin.$.tsx`: update the per-screen title/description map to the new screens; unknown screens keep the existing not-found page.
- `src/components/hap-app.tsx` bridge is unchanged — Back/Forward/Refresh/direct URL keep working because the iframe already syncs both directions.
- No route files are added per screen: `/admin` layout + `admin.$` splat already covers arbitrary depth.

## Deliverable

At the end: a report listing routes changed, routes removed/redirected, duplicate concepts removed, what was intentionally left unchanged, and any unresolved navigation issue. Phase 2 is not started.
