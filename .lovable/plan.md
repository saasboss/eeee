# Phase 1 — UI/UX, IA and action-hierarchy audit

Scope: presentation, layout, navigation and action structure only. No business logic, data, auth, payments or dependency changes. All work lands in `public/hap/app.js` (markup only), `public/hap/ops.js` (markup only), `public/hap/styles.css`, and `src/lib/hap-routes.ts` / route titles where a label must match.

## 1. Route and screen inventory (verified in code)

| Route | Screen | Renderer |
| --- | --- | --- |
| `/` | Landing + demo + auth sheet | `landingPage()` |
| `/menu/$slug` | Public guest menu | `renderPreview()` |
| `/preview` | Legacy, redirects into the public menu | `pendingMenuRedirect` |
| `/r/$slug/admin` | Overview | `adminHome()` |
| `/r/$slug/admin/menu` | Menu › Items | `adminMenuItems()` |
| `/r/$slug/admin/menu/design` | Menu › Design | `appearancePage()` |
| `/r/$slug/admin/menu/promotions` | Menu › Promotions | `adminPromote()` |
| `/r/$slug/admin/menu/qr` | QR subpage | `adminQr()` |
| `/r/$slug/admin/insights` | Insights (Traffic/Dishes/Guests) | `analyticsPage()` |
| `/r/$slug/admin/settings` | Settings (Restaurant/Team/Billing) | `adminSettingsHub()` |
| `/r/$slug/admin/settings/restaurant\|team\|billing` | Same content as subpages | `renderAdminSubpage()` |
| `/super`, `/super/{restaurants,users,plans,settings}` | Platform control | `ops.js` |
| `/admin/*` | Legacy → tenant redirect | `admin.tsx` |

Bottom nav (restaurant): Overview · Menu · Insights · Settings. Structure is sound; the problems are duplication, action hierarchy and density, not the tab set.

## 2. Duplicate-action inventory (all verified)

| Action | Appears at | Recommendation |
| --- | --- | --- |
| Open QR | Overview command row, Menu header icon, Menu command row, checklist row | Keep Menu header icon + checklist. Drop from both command rows. |
| Promote / New promotion | Overview command row, Menu command row, Menu › Promotions primary button, category row `promote-category`, item row | Keep Promotions primary + row-level contextual. Drop from both command rows. |
| Preview public menu | Overview command row, Design hero "Preview", `share-menu` on status card | One global "View menu" in the page header, same slot on every admin screen. |
| Bulk availability / Bulk price | Overview "Quick actions" grid **and** Menu command row | Menu only — they act on menu data. |
| Menu design | Menu › Design tab **and** Settings › Appearance row | Tab only; keep the URL alias, delete the Settings row. |
| Settings | Overview header icon-btn + bottom-nav Settings | Drop the header icon. |
| Restaurant/Team/Billing | Settings tabs **and** identical standalone subpage routes | Subpage routes redirect into the tab; delete `renderAdminSubpage` duplicates. |
| Add item | Overview command row, Menu `add-chooser`, checklist, empty states | Keep; it is the one legitimately repeated primary. |

Two same-purpose surfaces compete on Overview: the `command-row` (4 buttons) and the "Quick actions" card grid (2 buttons). One must go — the card grid.

## 3. Proposed action hierarchy per screen

- **Overview** — Primary: Add dish. Secondary: Share menu (status card). Tertiary: checklist rows, service toggles. No command row, no quick-action grid. Signals link out; they never duplicate an action.
- **Menu › Items** — Primary: header `+` Add (Item / Category chooser — already the pattern). Secondary: search, filter chips, density toggle in one toolbar. Contextual: per-row price / 86 / hide / promote. Destructive: delete, inside the row menu with confirm. Command row removed; sold-out + price bulk actions move into the toolbar as a single "Bulk edit" split control.
- **Menu › Design** — Primary: View menu. Everything else is a picker; no competing buttons.
- **Menu › Promotions** — Primary: New promotion. Segment tabs are navigation, not actions. The static "How promotions read" list becomes collapsed help.
- **Insights** — No primary action. Range chips + tabs only; "Seed demo data" is a prototype affordance and moves behind Settings › Prototype tools.
- **Settings** — Primary: Save changes (sticky, enabled only when dirty). Team: Invite. Billing: read-only.
- **Public menu** — Primary: language/search; nothing else competes.

## 4. Findings by priority

**Critical**
1. Overview has two competing action clusters and 6 quick actions, 4 of which are owned by other screens. → Remove the quick-action grid and reduce the command row to nothing; Overview becomes status + checklist + signals. *Why:* it stops teaching two paths to the same job. *Risk:* low. *Accept:* every Overview action still reachable in ≤2 taps.
2. Settings duplicated as both tabs and subpage routes with a different chrome (`subHead` back-row vs page head). → One rendering; subpage paths select the tab. *Accept:* `/settings/team` opens Settings with Team active, no back-row.
3. Design reachable from two places with different labels ("Menu design" vs "Design"). → One label: **Design**, everywhere.

**High**
4. No global "View menu" affordance; it is spelled Preview / Share / View. → One header action `View menu`, same icon and label on all admin screens.
5. Menu screen stacks page head + command row + search + toolbar + category strip = ~5 control rows before any content on a 390px screen. → Collapse to header + search/toolbar row + category strip.
6. QR is a subpage with its own back-row inside a tabbed workspace — inconsistent chrome. → Same page-head pattern as its siblings, entered from the Menu header.
7. Destructive actions (delete item/category, reset demo data) need a uniform confirm dialog; `showConfirm` exists but is not used everywhere.
8. Touch targets: `.mini-icon` category actions are ~31–32px. → 40px minimum.

**Medium**
9. Terminology drift: Promote / Promotions / Promotion; Staff / Team; Dishes / Items. → Fix on one term each: **Promotions**, **Team**, **Dishes**.
10. No unsaved-change warning on Settings; the Save button is always enabled.
11. Empty states exist on some lists (`emptyState` in ops) and are ad-hoc `<div class="card empty">` elsewhere. → One `emptyState` helper used by all.
12. `:focus-visible` is present in newer CSS but absent on older inputs and `.mini-icon`. → One global focus ring token.
13. Insights shows a full range-chip row plus tabs plus stat grid with no primary story; tighten spacing and lead with a single headline number.
14. Billing "Coming soon" card and the "Prototype billing" footnote say the same thing twice.

**Low**
15. `tplMini()` is dead code superseded by `templatePreview()`.
16. Landing page and admin use different button scales.
17. Superadmin table rows reuse `data-row` but Users/Plans differ in cell rhythm.

## 5. Global design rules

Page head pattern (eyebrow / title / subtitle / one action slot) on every screen — no `back-row` inside tabbed workspaces. One primary button per screen. Icon-only buttons always carry `aria-label`. Minimum target 40px, 44px for primary. Section spacing on an 8px scale. Filter chips = state, segment control = navigation, never mixed. Confirm every destructive action. One term per concept.

## 6. Implementation batches (one route/component group each)

1. Overview: remove quick-action grid + command row, add global View menu slot.
2. Menu › Items: toolbar consolidation, bulk-edit control, remove command row, 40px targets.
3. Menu › Design + QR: unify chrome, single label, QR page head.
4. Menu › Promotions: primary hierarchy, collapse the styles explainer.
5. Settings: tabs as the only rendering, dirty-state Save, delete Appearance row.
6. Insights: density and range/tab layout, move seed action out.
7. Global CSS pass: focus ring, target sizes, spacing scale, empty-state helper.
8. Terminology + labels sweep incl. `hap-routes.ts` titles.
9. Verification pass.

Quick wins (can ship first): 3, 8, 9, 14, 15.

## 7. Deferred (not Phase 1)

Desktop/tablet layouts — the app is hard-capped at `max-width:430px` (`styles.css:58`), so there is no desktop layout to audit; introducing one is a redesign, not a Phase 1 correction. Auth/role boundaries, superadmin redesign, real analytics, self-serve billing, routed sheets/back-button overlay handling, multi-menu UI.

## 8. Verification checklist

Headless pass at 320 / 390 / 430 px on `/menu/sofra`, Overview, Menu (all three tabs), QR, Insights, Settings: zero console errors, zero horizontal overflow, every interactive target ≥40px, one primary button per screen, focus ring visible on every control, destructive actions confirm, Settings Save disabled when clean, all legacy URLs still resolve. At ≥700px only the framed-phone presentation is checked, since no desktop layout exists yet.

## 9. Open decision

Desktop and tablet are currently the same 430px phone frame. Confirm whether Phase 1 should stay mobile-only (recommended) or whether a real desktop admin layout should be scheduled as Phase 2.
