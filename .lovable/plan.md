# Phase 1.1 — focused UI/UX refinement (audit + plan)

Planning only. No application code changed. All existing files in `.lovable/plan/` are untouched, including the 2026-09-05 category-header plan. `docs/PROJECT_STATE.md` stays the single source for Now / Next / Later / Done. On approval this file is archived to `.lovable/plan/phase-1-1-focused-ui-ux-refinement-2026-09-06.md`; the completed Phase 1 plan it replaces here is already recorded as Done in `docs/PROJECT_STATE.md` and in the earlier archived plans.

Phase 1 is treated as complete and correct. Nothing below undoes a verified Phase 1 result, and nothing below is a redesign.

## A. How this audit was produced

Rendered audit of the running app (headless Chromium) at 320 / 390 / 430 / 800 px on: `/`, `/menu/sofra`, `/r/sofra/admin`, `/r/sofra/admin/menu`, `/menu/design`, `/menu/promotions`, `/menu/qr`, `/insights`, `/settings/restaurant|team|billing`, `/super`. Per screen: document height, horizontal overflow, elements past the viewport, containers over 480 px tall, clipped/truncated leaf text nodes, every interactive element under 44 px, console errors.

Baseline results worth recording:

- **Zero console errors and zero horizontal overflow on every screen at every width.** Phase 1's responsive result holds.
- All admin screens fit inside the framed 430 px presentation at 800 px without regression.
- Remaining problems are local: sub-44 px controls in the global bar, terminology drift, vertical waste on two screens, weak plural copy, and one blocking first-load sheet on the guest menu.

## B. Findings

Each finding: screen · evidence · why it matters · change · essential/useful/optional · files · visual acceptance · regression · rollback · dependencies.

### F1 — Global prototype bar controls are 38 px (all admin screens) — ESSENTIAL

- **Evidence:** on every admin route, `View menu` = 38 px tall, `Back to landing` = 38x38, `Toggle theme` = 38x38. Phase 1 fixed in-page controls but not this bar. Project rule is 44 px.
- **Why:** the three most persistent controls in the product are the only ones still below the touch minimum, at the least reachable edge of the screen.
- **Change:** raise the bar's controls to 44 px effective (or keep the 38 px visual with a 44 px pseudo hit area, matching the existing `.mini-icon` pattern). No layout or behaviour change.
- **Files:** `public/hap/styles.css` (prototype-bar rules only).
- **Acceptance:** all three report ≥44 px effective hit area at 320/390/430; bar grows by at most 8 px; no overflow at 320 px; focus ring still visible.
- **Regression:** header offset of every admin screen; guest menu unaffected; Hap Control bar still aligned.
- **Rollback:** revert the CSS block. **Dependencies:** none.

### F2 — "Items" vs "dishes" drift across admin — ESSENTIAL

- **Evidence:** Phase 1 settled **Items** / **Add item**. Rendered copy still says: Overview checklist "Add at least 6 dishes", "Add a photo to every dish", "Sold-out dishes"; Menu subtitle "8 categories · 13 dishes · 1 sold out"; search placeholder "Search dishes"; Insights tab "Dishes"; Design/QR helper copy "beside every dish".
- **Why:** two nouns for one object in one workspace; the tab says Items, the page under it counts dishes.
- **Change:** copy-only sweep to the approved term inside restaurant admin. Guest-facing menu copy stays natural food wording — that boundary is explicit.
- **Files:** `public/hap/app.js` (strings only).
- **Acceptance:** no admin string uses "dish/dishes" except deliberate guest-preview copy; Insights tab reads "Items"; counts read "13 items".
- **Regression:** search placeholder, checklist completion keyed by id not text, tour step text still matches its target.
- **Rollback:** revert the strings commit. **Dependencies:** owner confirmation only if they now prefer "dishes".

### F3 — Menu › Items: eight collapsed category cards each carry a full "More" button — USEFUL

- **Evidence:** at 390 px the collapsed list is 8 cards ≈ 84 px each; each shows a chevron *and* a 96 px `··· More`, while the toolbar directly above has a differently-scoped `··· More`. Two identical labels, two different menus, one screen.
- **Why:** the clearest remaining action-hierarchy defect; it also inflates every collapsed row.
- **Change:** keep expand/collapse on the row; make the category control a labelled icon-only overflow (`aria-label="Actions for <category>"`, the pattern item rows already use), leaving the toolbar `More` as the only visible "More" text. Tighten the collapsed row to the 8px rhythm.
- **Files:** `public/hap/app.js` (category head markup), `public/hap/styles.css`.
- **Acceptance:** one "More" text button per screen; category overflow ≥44 px with an accessible name; collapsed row ≤64 px; all 8 categories visible without extra scrolling at 390 px; menus open unchanged.
- **Regression:** rename/reorder/promote/delete still reachable; keyboard order; 320 px.
- **Rollback:** revert the category-head commit.

### F4 — Menu › Items: filter chip row is cut mid-chip — USEFUL

- **Evidence:** at 390 px the chip strip ends on a clipped `(` glyph before the density button, so it reads as broken rather than scrollable.
- **Why:** a truncated glyph looks like a rendering bug and hides that the strip scrolls.
- **Change:** edge fade / scroll-snap so the strip always ends on a whole chip, or move density + More into their own aligned end group.
- **Files:** `public/hap/styles.css`.
- **Acceptance:** no partially rendered chip glyph at 320/390/430; strip still scrolls; density and More reachable.
- **Regression:** filter selection state; no page overflow. **Rollback:** revert the CSS block.

### F5 — "1 items" pluralisation — ESSENTIAL (trivial)

- **Evidence:** Soups, Pasta and Drinks all read "1 items" on Menu › Items.
- **Change:** singular/plural helper for count strings.
- **Files:** `public/hap/app.js`.
- **Acceptance:** "1 item" / "2 items" everywhere counts render, including Overview and Promotions subtitles. **Rollback:** revert.

### F6 — Promotions: three equally prominent row buttons — USEFUL

- **Evidence:** each promotion card renders `Pause` / `Edit` / `End` at equal width (93 px) and equal weight — 9 competing buttons across 3 cards; card ≈123 px tall.
- **Why:** no readable primary at row level, and the destructive `End` carries the same weight as `Edit`.
- **Change:** `Edit` stays direct; `Pause` and `End` move into a labelled row overflow, `End` marked destructive there.
- **Files:** `public/hap/app.js`, `public/hap/styles.css`.
- **Acceptance:** one visible row action plus one overflow per promotion; destructive confirm and Undo unchanged; card height down ≈24 px; ≥44 px targets.
- **Regression:** pause/end flows, Active/Scheduled/Past tabs, empty states.
- **Rollback:** revert the promo-row commit. **Dependencies:** confirm Pause is infrequent (below).

### F7 — Guest menu opens behind a language sheet — ESSENTIAL (decision first)

- **Evidence:** first load of `/menu/sofra` renders the whole menu blurred behind a "Choose menu language" sheet.
- **Why:** a guest scanning a QR at the table is blocked before seeing any food; the header already has an `EN` control.
- **Change:** default to the published language, do not auto-open the sheet, keep the header control as the way in.
- **Files:** `public/hap/app.js` (initial sheet trigger only).
- **Acceptance:** first load shows the menu; the sheet opens only from `EN`; language choice still persists.
- **Regression:** multi-language menus, persistence, sheet labelling and focus trap.
- **Rollback:** revert the trigger commit. **Dependencies:** owner decision.

### F8 — Guest menu: large gap between category header and first card — USEFUL

- **Evidence:** at 390 px each category header is followed by an empty band before the first card (Popular, Starters, Soups, Pizza), adding roughly a third of a screen of scroll across a 13-item menu.
- **Why:** wasteful whitespace on the surface guests actually read; it weakens the header→cards association.
- **Change:** reduce the header min-height/gap to the 8px rhythm while preserving the header rule and the left-title/right-count layout from the 2026-09-05 plan.
- **Files:** `public/hap/styles.css` (category head rhythm plus per-template overrides).
- **Acceptance:** header-to-first-card gap ≤16 px in all five templates; title/count alignment unchanged; Editorial rule still spans the column; consecutive headers never collide.
- **Regression:** five templates at 320/390/430; featured kicker still centred above the row. **Rollback:** revert the spacing block.

### F9 — Guest menu: allergen/diet badges truncate — USEFUL

- **Evidence:** `badge-pill allergen` / `badge-pill diet` nodes overflow their own box at every width ("Contains gluten +3", "Contains molluscs +1", empty-rendering pills at 430/800).
- **Why:** allergen text is the one place on a menu where clipping is a real-world risk, not a cosmetic one.
- **Change:** let the badge row wrap, or guarantee the full label plus a tappable "+n" opening the existing details sheet; never clip an allergen string mid-word.
- **Files:** `public/hap/styles.css`; `public/hap/app.js` only if "+n" needs a real control.
- **Acceptance:** no allergen/diet pill has `scrollWidth > clientWidth` at 320/390/430; the full allergen list is ≤1 tap away; card grows by at most one line.
- **Regression:** card layout in all five templates; diet filters. **Rollback:** revert the badge block.

### F10 — Settings › Restaurant is one long undifferentiated scroll — USEFUL

- **Evidence:** tallest admin screen; two containers over 480 px (`section` 531 px, `card list-card` 498 px); Profile, Brand images, Menu currency, Guest currency conversions and Opening hours all fully expanded; currency micro-buttons are 28 px (`Move EUR up/down`, `Remove EUR`); native selects 43 px.
- **Why:** the frequent edits (name, hours) sit at opposite ends of a long scroll, and the most advanced block is permanently expanded.
- **Change:** (a) currency row controls to 44 px effective; (b) collapse "Guest currency conversions" behind a labelled disclosure (`aria-expanded`, controlled region), auto-expanded when conversion is on; (c) uniform 8px section rhythm.
- **Files:** `public/hap/app.js`, `public/hap/styles.css`.
- **Acceptance:** page height down ≥20 % with conversion off; all controls ≥44 px; disclosure keyboard-operable and labelled; no field or Save behaviour changed.
- **Regression:** save flow, conversion preview, deep link to `/settings/restaurant`.
- **Rollback:** three separate commits on one branch, revertible individually. Dirty-state work stays deferred (Phase 1 Task 15).

### F11 — Settings › Team `Invite` is 34 px — ESSENTIAL (trivial)

44 px effective, same visual weight. `public/hap/styles.css`. Acceptance and rollback as F1.

### F12 — Menu › Design: `Preview` (34 px) and colour swatch (38 px) — USEFUL

- **Evidence:** `Preview` = 34x86; `Custom brand colour` = 38x42.
- **Why:** both below target; `Preview` also overlaps in meaning with the global `View menu` directly above it.
- **Change:** size both to 44 px effective; confirm `Preview` differs from `View menu` and, if not, drop it in favour of the global control.
- **Files:** `public/hap/styles.css`; `public/hap/app.js` only if removed.
- **Acceptance:** ≥44 px; at most one control per screen that opens the guest menu. **Dependencies:** decision below.

### F13 — Insights empty state floats at the top of a blank page — OPTIONAL

Centre the empty block vertically; keep the ranges and the labelled demo-only action. `public/hap/styles.css`. Cosmetic — schedule last or drop.

### F14 — Hap Control — NO ACTION

Only the two global-bar controls are undersized (F1); `View menu` is correctly absent. Phase 1's scoping holds. Recorded so a reviewer does not re-open it.

### F15 — Marketing page CTAs at 40 px — OPTIONAL

`Sign in to admin`, `Preview menu`, `Open the admin` and the repeated pair lower down are all 40 px; page is 3 448 px at 390 px with no overflow. Raise the CTAs to 44 px only; length and repetition are legitimate marketing choices. `src/routes/index.tsx`, class changes only.

### Explicitly rejected (not justified by the rendered interface)

Global CSS rewrite; desktop/tablet admin layout (Phase 2); Hap Control redesign; new bulk actions (Phase 1 Task 12, deferred); re-theming; new empty/loading states — the audit found no missing confirmation, no missing empty state and no console error to justify them.

## C. Ranked tasks (one branch and PR each)

| # | Task | Findings | Impact | Risk |
| --- | --- | --- | --- | --- |
| 1 | Global bar + stray control target sizing (44 px) | F1, F11, F12 sizing, F15 | High | Low |
| 2 | Admin terminology sweep to Items + pluralisation | F2, F5 | High | Low |
| 3 | Guest menu first-load language sheet | F7 | High | Low (decision) |
| 4 | Guest menu allergen/diet badge truncation | F9 | High | Low |
| 5 | Guest menu category header rhythm | F8 | Medium | Low |
| 6 | Menu › Items category overflow + chip strip edge | F3, F4 | Medium | Medium |
| 7 | Promotions row action hierarchy | F6 | Medium | Medium (decision) |
| 8 | Settings › Restaurant density + currency disclosure | F10 | Medium | Medium |
| 9 | Design `Preview` duplication decision | F12 behaviour | Low | Low (decision) |
| 10 | Insights empty-state centring | F13 | Low | Low |

Tasks 1–2 and 4–5 are safe to start immediately. Tasks 3, 7 and 9 must not merge before their decision is answered.

## D. Owner decisions required

1. Should the guest menu still force a language choice on first visit? (blocks Task 3)
2. Is `Pause` a frequent promotion action, or safe to move into the row overflow? (blocks Task 7)
3. Does Menu › Design `Preview` do something the global `View menu` does not? (blocks Task 9)
4. Confirm **Items** stays canonical in admin while the guest menu keeps natural food wording. (assumed yes)

## E. Verification for every task

At 320 / 390 / 430 px, plus 800 px for framed-layout regression only: zero console errors; zero horizontal overflow; one visually dominant primary action per screen; every control ≥44 px effective; visible focus including inline inputs; keyboard-only traversal; accessible names on icon-only controls; deep link + refresh + Back/Forward on the touched route; destructive confirm and Undo unchanged; light and dark; reduced motion; 200 % zoom; safe-area insets; the finding's own visual acceptance criteria met; guest-menu tasks checked in all five templates.

## F. Rollback

Every task is one branch, one PR; reverting that PR restores current `main`. No task touches authentication, data structures, payments, dependencies, routing behaviour, or business logic.
