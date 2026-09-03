# Phase 1 — UI/UX, information architecture, action hierarchy and visual polish

Plan only. Nothing here is implemented. `docs/PROJECT_STATE.md` is the single source for Now / Next / Later / Done / decisions; this file is the detailed implementation plan. No second roadmap file is created or maintained.

## 1. Corrected current-state baseline (verified)

- `/` is the React marketing page in `src/routes/index.tsx`. `landingPage()` in `public/hap/app.js` is the prototype's internal landing mode, not the site root.
- `/preview` is a redirect to `/menu/{slug}` (`src/routes/preview.tsx`).
- The prototype is mounted directly into the host document by `src/components/hap-app.tsx` — no iframe.
- A global **View menu** action already exists: `prototypeBar()` at `app.js:1305`, `data-action="view-menu"`, `data-tour="preview-toggle"`. It renders in every non-landing mode, including Hap Control.
- `share-menu` / `share-preview` copies or shares the link. It is not View menu and is not a duplicate.
- Destructive confirmations and Undo already exist (`showConfirm`, toast undo). Only genuine gaps get touched.
- `.mini-icon` is 32px visually but already has a 44px pseudo hit area (`styles.css:708-709`) and `:focus-visible` (`styles.css:983`). Project-wide target stays **44px**.
- The real focus bug is `.inline-input:focus{outline:none}` (`styles.css:379`) overriding the global `:focus-visible` rule (`styles.css:706`).
- `TOUR_STEPS` has **13** steps (`app.js:724`) but step 1 says "the five things that matter" and Settings shows "Run the focused 5-step guide" (`app.js:1757`). Step 10 also still says Appearance lives in Settings, which is stale.
- QR copy is stale: `aria-label="QR code to this deployed Preview"` and "This QR uses the current deployed URL · #preview" (`app.js:1741`).

## 2. Route and action inventory

| Route | Screen | Renderer |
| --- | --- | --- |
| `/` | React marketing page | `src/routes/index.tsx` |
| `/menu/$slug` | Guest menu | `renderPreview()` |
| `/preview` | Redirect | route only |
| `/r/$slug/admin` | Overview | `adminHome()` |
| `/r/$slug/admin/menu` | Menu › Items | `adminMenuItems()` |
| `/r/$slug/admin/menu/design` | Menu › Design | `appearancePage()` |
| `/r/$slug/admin/menu/promotions` | Menu › Promotions | `adminPromote()` |
| `/r/$slug/admin/menu/qr` | QR | `adminQr()` |
| `/r/$slug/admin/insights` | Insights | `analyticsPage()` |
| `/r/$slug/admin/settings[/restaurant\|team\|billing]` | Settings | hub + `renderAdminSubpage()` |
| `/super/*` | Hap Control | `ops.js` |
| `/admin/*` | Legacy redirect | `admin.tsx` |

Verified duplications (only these):

1. Overview command row repeats Promotion, QR and Preview, all owned elsewhere; Preview also duplicates the prototype-bar View menu.
2. Overview quick-action grid (Availability / Prices) duplicates Menu-owned bulk work.
3. Overview header Settings icon duplicates the bottom-nav Settings tab.
4. Settings › Appearance row duplicates Menu › Design (canonical).
5. Settings tab content and `/settings/{restaurant,team,billing}` subpages render the same content through two different chromes (page head vs back-row).
6. QR renders a back-row inside a tabbed workspace that already has a header.
7. View menu appears in Hap Control, where it has no meaning — scope it, do not add anything.

Not duplication: Share on the status card; Add item in checklist/empty states; row-level Promote.

## 3. Screen-by-screen hierarchy

- **Overview** — Primary: permanent labelled **Add item** in the page header. Secondary: Share on the live-status card. Tertiary: checklist rows, service switches, signals. Removed: Promotion/QR/Preview command buttons, Availability/Prices grid, header Settings icon.
- **Menu › Items** — Primary: one labelled **Add** parent action offering Item or Category. Search full-width on its own row; a compact toolbar holds filters, density and a labelled **More** menu. No split button. Category row keeps expand/collapse inline; rename, reorder, promote, delete move into a labelled category overflow menu.
- **Menu › Design** — Canonical appearance home. Pickers only; Share keeps its label.
- **Menu › Promotions** — Primary: New promotion. Segments are navigation. "How promotions read" becomes collapsible help.
- **Menu › QR** — One page header, no back-row; Download primary, Share secondary; corrected copy.
- **Insights** — No primary action. Ranges + tabs; Seed demo data stays visible and explicitly labelled demo-only.
- **Settings** — One shared renderer, tab from URL. Restaurant: Save. Team: Invite. Billing: read-only.

## 4. Visual design and layout rules (mandatory)

Phase 1 is an action, accessibility **and visual-polish** phase. Every screen task must improve positioning, alignment, visual hierarchy, content density, wasted empty space, oversized cards/containers, redundant wrappers, inconsistent padding/margins, header and action placement, proximity of controls to the content they affect, typography hierarchy, consistent icon/label/button/form/card/dialog/toolbar/table patterns, mobile safe areas, horizontal and vertical overflow, progressive disclosure, scanability, reachability of frequent actions, and balanced whitespace without waste.

Design rules:

- Spacing on a consistent 8px scale; 4px allowed only for compact controls.
- One consistent page-header structure on every page.
- At most one visually dominant primary action per screen.
- Controls sit near the content they affect.
- Frequent actions stay directly available; uncommon actions use labelled progressive disclosure.
- Never group actions merely to reduce button count; never leave several equally prominent actions competing.
- No cards used as decorative wrappers; no empty areas that do not aid comprehension.
- Preserve readable whitespace and touch safety.
- Reuse existing components and patterns when suitable.
- Route-specific work must not become a broad, risky global CSS rewrite.

Every screen-specific task (Overview, Menu Items, Design, QR, Promotions, Insights, Settings) must include a **visual before/after assessment** covering: current wasted space, misalignment, excessive vertical stacking, redundant containers, action positioning, information hierarchy, recommended layout, and exact visual acceptance criteria.

## 5. Implementation tasks (one branch and PR each)

Every task: **scope · files · classification · acceptance · regression · rollback · excluded**.

1. **PROJECT_STATE Now** — docs. `docs/PROJECT_STATE.md` only. Accept: Phase 1 is the approved Now item and Phase 2 desktop/tablet is in Later/deferred. No other file changes. Rollback: revert doc.
2. **Baseline correction** — docs. `.lovable/plan.md`, `README.md` where stale. Accept: no claim contradicts main. Excluded: app code.
3. **Accessibility A — semantics and focus** — `app.js`, `ops.js`, `styles.css`. Accept: accessible names on every icon-only Back/Close; `role="switch"` + `aria-checked` on Overview service switches; `aria-current="page"` on bottom nav; correct tab vs link semantics with `role="tablist"/"tab"/"tabpanel"` and `aria-controls`; `aria-labelledby` on sheets, dialogs and confirmations; `.inline-input:focus{outline:none}` conflict removed so inline inputs show a visible ring; `prefers-reduced-motion` respected. Regression: no layout shift at 320px. Rollback: revert the attribute/CSS commit. Excluded: sizing, layout.
4. **Accessibility B1 — target sizing: restaurant navigation and common controls** — bottom nav, page-header buttons, back/close, dialog and tour controls. Accept: ≥44px effective; no overflow at 320px. Rollback: revert CSS commit.
5. **Accessibility B2 — target sizing: Menu controls** — category chips, `.item-action`, density buttons, quick pills, `.rate-tools .mini-icon` (currently 28px). Same acceptance and rollback.
6. **Accessibility B3 — target sizing: Settings / Insights / QR controls** — segment buttons, range and filter chips, switches. Same acceptance and rollback.
7. **Accessibility B4 — target sizing: Hap Control controls** — `ops.js` tables, row actions, filters. Same acceptance and rollback.
   The verified 44px inventory is produced first in B1 and referenced by B2–B4; no blind global size change.
8. **Restaurant-admin global chrome** — `app.js`. Scope: keep the existing `prototypeBar()` View menu action, render it only where meaningful in restaurant administration, remove it from Hap Control and unrelated modes, add no second View menu, preserve `data-tour="preview-toggle"` only on routes where the control still exists. Accept: guest menu, restaurant admin, landing mode and `/super/*` each verified; the tour does not target a missing element. Rollback: revert the chrome commit.
9. **Settings shared renderer** — `app.js`, `src/lib/hap-routes.ts`. Accept: `/settings/restaurant|team|billing` still deep-link, refresh, share, Back/Forward and keep their titles; one chrome, no back-row; tab derives from URL; legacy aliases resolve. Visual: single page-header, 8px rhythm, no duplicated container. Excluded: dirty-state logic.
10. **Overview hierarchy and layout** — `app.js`, `styles.css`. Accept: permanent labelled Add item in header; Share preserved; command row, quick-action grid and header Settings icon gone; no new View menu. Visual: before/after assessment as in §4; status card no longer oversized; checklist rows on the 8px scale; no decorative wrapper cards; no vertical overflow at 320px. Excluded: checklist logic, service-toggle behaviour.
11. **Menu Items layout and category grouping** — `app.js`, `styles.css`. Accept: full-width search row plus compact toolbar; labelled Add parent action; expand/collapse inline, other category actions in a labelled overflow; no overflow at 320px. Visual: consistent row height and padding, controls adjacent to the item they affect, reduced vertical stacking. Excluded: bulk behaviour change.
12. **Menu bulk behaviour** — interaction/state, only after a workflow decision. Excluded from 11.
13. **Design and QR cleanup** — `app.js`, `styles.css`, routing alias. Accept: Settings Appearance row removed with alias preserved; QR single page-header, no back-row; stale Preview/#preview copy corrected; Share keeps its label; deep links and history unchanged. Visual: picker groups aligned on one grid; QR page balanced, Download dominant, no empty filler space.
14. **Promotions disclosure and layout** — `app.js`, `styles.css`. Accept: help is a labelled button with `aria-expanded` and a controlled region id, collapsed by default. Visual: segments read as navigation, cards not oversized, warnings adjacent to the promotion they concern.
15. **Settings dirty state** — interaction/state. Accept: Save disabled when clean; leave warning on dirty navigation.
16. **Insights empty/populated layout** — `app.js`, `styles.css`. Accept: demo-data action visible and labelled demo-only. Visual: metric cards on one grid, no oversized empty panels, ranges and tabs on a single consistent header.
17. **Onboarding reassessment** — fix "five things"/"5-step guide" against 13 real steps, correct the stale Appearance-in-Settings step, make the tour non-blocking for the first useful workflow.
18. **Full verification** — see §7.

## 6. Terminology decisions (settled for Phase 1)

- Canonical data/tab term: **Items**.
- Creation action: **Add item**.
- Section noun: **Promotions**; row action verb: **Promote** — a correct noun/verb pair, not an inconsistency.
- Restaurant people management: **Team**.
- Legacy route names stay internally where renaming risks compatibility.
- Mobile-first at 320/390/430px; at ≥700px verify only that the framed presentation does not regress.

## 7. Deferred

Desktop/tablet admin layout (Phase 2); auth, roles and tenancy; Hap Control redesign; real analytics; self-serve billing; routed sheets/back-button overlay handling; multi-menu UI; bulk behaviour until Task 12's decision; any global CSS rewrite.

## 8. Verification matrix

Screens: guest menu, Overview, Menu Items, Design, Promotions, QR, Insights, Settings ×3 tabs, Hap Control. Widths: 320 / 390 / 430 px, plus ≥700px only to confirm no regression of the framed presentation. Per screen: zero console errors; zero horizontal overflow; one primary action; all §5 targets ≥44px; visible focus on every control including inline inputs; keyboard-only traversal; SR names on icon-only controls; deep link + refresh + Back/Forward per route; destructive confirm and Undo still work; light and dark; reduced motion; 200% zoom; safe-area insets; 8px spacing rhythm and single page-header structure honoured; visual acceptance criteria of the owning task met.

## 9. Proposed `docs/PROJECT_STATE.md` Now section

> **Now — one current priority:** Phase 1 — UI/UX, information architecture, action hierarchy and visual polish of the existing Hap prototype. Mobile-first at 320/390/430px; ≥700px checked only for no regression. Visual work covers positioning, alignment, hierarchy, density, spacing on an 8px scale, one page-header structure, and removal of wasted space and redundant containers — without a global CSS rewrite. No changes to authentication, data, payments, dependencies or business logic. Delivered as the numbered tasks in `.lovable/plan.md`, one branch and pull request each, independently reviewable and revertible. Desktop/tablet admin layout is deferred to Phase 2.
