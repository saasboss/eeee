# Phase 1 — UI/UX, IA and action hierarchy (revised after independent review)

All review corrections verified against the working tree before this rewrite. Nothing here is implemented. Note: I could not add these tasks to `roadmap.md` because plan mode only permits writing this file — the task list below is the roadmap and should be copied there in Task 1.

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
7. View menu appears in Hap Control, where it has no meaning — scope it to restaurant admin instead of adding anything.

Not duplication: Share on the status card; Add item in checklist/empty states; row-level Promote.

## 3. Screen-by-screen hierarchy

- **Overview** — Primary: permanent labelled **Add item** in the page header (never only inside the checklist). Secondary: Share on the live-status card. Tertiary: checklist rows, service switches, signals. Removed: Promotion/QR/Preview command buttons, Availability/Prices grid, header Settings icon.
- **Menu › Items** — Primary: one labelled **Add** parent action offering Item or Category. Search stays full-width on its own row; a second compact toolbar holds filters, density and a labelled **More** menu. No split button. Category row keeps expand/collapse inline; rename, reorder, promote, delete move into a labelled category overflow menu.
- **Menu › Design** — Canonical appearance home. Pickers only; Share keeps its own label.
- **Menu › Promotions** — Primary: New promotion. Segments are navigation. "How promotions read" becomes collapsible help.
- **Menu › QR** — One page header, no back-row; Download primary, Share secondary; corrected copy.
- **Insights** — No primary action. Ranges + tabs; Seed demo data stays visible and explicitly labelled demo-only.
- **Settings** — One shared renderer, tab from URL. Restaurant: Save. Team: Invite. Billing: read-only.

## 4. Accessibility requirements

44px inventory to audit and fix individually: segment buttons, category chips, range/filter chips, back buttons, quick-action pills, dialog/sheet close buttons, tour controls, switches, bottom-nav items, `.item-action`, `.rate-tools .mini-icon` (currently 28px), density buttons.

Separate criteria: accessible names on every icon-only Back/Close; `role="switch"` + `aria-checked` on Overview service switches; `aria-current="page"` on bottom nav; correct link vs tab semantics with associated panels (`role="tablist"/"tab"/"tabpanel"`, `aria-controls`); `aria-labelledby` on sheets, dialogs and confirmations; remove the `.inline-input:focus{outline:none}` conflict; keyboard-only traversal of every screen; screen-reader pass; 200% zoom; `prefers-reduced-motion`; contrast; safe-area insets and no horizontal overflow.

## 5. Implementation tasks (one branch and PR each)

Every task: **scope · files · classification · acceptance · regression · rollback · excluded**.

1. **PROJECT_STATE Now** — docs. `docs/PROJECT_STATE.md`. Accept: Phase 1 is the approved Now item with this task list; roadmap.md carries the same list. Regression: none. Rollback: revert doc. Excluded: any app change.
2. **Baseline correction** — docs. `.lovable/plan.md`, `README.md` where stale. Accept: no claim contradicts main. Excluded: app code.
3. **Accessibility semantics + 44px inventory** — accessibility. `app.js`, `ops.js`, `styles.css`. Accept: every control in §4 ≥44px effective; all listed ARIA criteria pass; inline-input focus visible. Regression: no layout shift at 320px; existing focus rings intact. Rollback: revert CSS/attribute commit. Excluded: layout restructuring.
4. **Settings shared renderer** — routing + markup. `app.js`, `src/lib/hap-routes.ts`. Accept: `/settings/restaurant|team|billing` still deep-link, refresh, share, Back/Forward and keep their route titles; one chrome, no back-row; tab derives from URL. Regression: legacy aliases resolve. Excluded: dirty-state logic.
5. **Overview hierarchy** — markup/layout. `app.js`, `styles.css`. Accept: permanent labelled Add item in header; Share preserved; command row and quick-action grid and Settings icon gone; no new View menu. Excluded: checklist logic, service-toggle behaviour.
6. **Menu Items layout + category grouping** — markup/layout. `app.js`, `styles.css`. Accept: full-width search row + compact toolbar; labelled Add parent action; expand/collapse inline, other category actions in a labelled overflow; no overflow at 320px. Excluded: any bulk behaviour change.
7. **Menu bulk behaviour** — interaction/state, only after a workflow decision. Excluded from 6.
8. **Design + QR cleanup** — markup + routing. Accept: Settings Appearance row removed with the alias preserved; QR single header; stale Preview/#preview copy corrected; Share keeps its label; deep links and history unchanged.
9. **Promotions disclosure** — markup + interaction. Accept: help is a labelled button with `aria-expanded`, a controlled region id, collapsed by default.
10. **Settings dirty state** — interaction/state. Accept: Save disabled when clean; leave warning on dirty navigation.
11. **Insights empty/populated layout** — markup + decision. Accept: demo-data action visible and labelled demo-only until a one-step alternative exists.
12. **Terminology** — documentation then markup, owner-approved only. Until approval: keep **Items**, **Add item**, **Promotions**, **Team**. Decisions needed: Items vs Dishes (mixed today), Promote vs Promotions on row actions, Staff vs Team in `ops.js`, Insights vs Analytics in legacy paths. No silent mixing.
13. **Onboarding reassessment** — interaction. Fix "five things"/"5-step guide" against 13 real steps, correct the stale Appearance-in-Settings step, make the tour non-blocking for the first useful workflow.
14. **Full verification** — see §7.

## 6. Deferred

Desktop/tablet admin layout (Phase 2); auth, roles and tenancy; Hap Control redesign; real analytics; self-serve billing; routed sheets/back-button overlay handling; multi-menu UI; bulk behaviour until Task 7's decision.

## 7. Verification matrix

Screens: guest menu, Overview, Menu Items, Design, Promotions, QR, Insights, Settings ×3 tabs, Hap Control. Widths: 320 / 390 / 430 px, plus ≥700px only to confirm the framed presentation does not regress. Per screen: zero console errors; zero horizontal overflow; one primary action; all §4 targets ≥44px; visible focus on every control including inline inputs; keyboard-only traversal; SR names on icon-only controls; deep link + refresh + Back/Forward per route; destructive confirm and Undo still work; light and dark; reduced motion; 200% zoom.

## 8. Proposed `docs/PROJECT_STATE.md` Now section

> **Now — one current priority:** Phase 1 — UI/UX, information architecture and action hierarchy correction of the existing Hap prototype. Mobile-first at 320/390/430px; ≥700px only checked for no regression. No changes to authentication, data, payments, dependencies or business logic. Delivered as the numbered tasks in `.lovable/plan.md`, one branch and pull request each, each independently reviewable and revertible. Desktop/tablet admin layout is deferred to Phase 2.
