# Hap — Steps 6 and 7 (credit-efficient batching)

Confirmed current state: `public/hap/services.js` (130 lines) exposes `promotions`, `settings`, `team`, `activity`, `insights`, `subscription` with `{status, data, error}` envelopes; promotions are still just `promotion.active` booleans; `canAccess()`/`noPermissionPage()` exist in `app.js`.

To keep credit usage low, the remaining work is grouped into **three** batches instead of six. Each batch is one message: all reads and edits in parallel, then a single headless verification pass covering every screen touched in that batch.

## Batch 1 — Promote lifecycle + honest Insights

- Promotion model gains `status` derived from `startsAt`/`endsAt`/`pausedAt`: Active, Scheduled, Past.
- Scheduling options: Now, Until Closing, Schedule (start + end), Custom recurrence.
- Pause / resume / end actions on active promotions.
- Conflict prevention: only one strong promotion (featured / "Recommended") active at a time; a clear inline error when a second is attempted.
- Promote tab shows Active / Scheduled / Past segments with honest empty states.
- Insights event taxonomy fixed to exactly: `menu_open`, `item_view`, `category_expand`, `language_change`, `search`, `filter_allergen`, `filter_diet`.
- Events emitted only from genuine guest sessions on `/menu/<slug>`; admin/preview sessions never write events.
- Insights tab shows only directly observed metrics (opens, item views, top items, top search terms, language split) plus a genuine empty state. No revenue or inferred metrics.
- Verify: one headless pass over `/r/sofra/admin` (Promote, Insights) and `/menu/sofra`.

## Batch 2 — QR exports + Settings completion

- QR for `/menu/<slug>` with stable identity; PNG, SVG and PDF export.
- Web Share API with copy-to-clipboard fallback.
- Style presets (colour, centre logo) persisted in `state.qrStyle`.
- Settings: secondary display currency with editable rates; translation health per published language with fallback warning; appearance presets (minimal, bold, elegant, dark) writing CSS custom properties; team list with mock invite/remove; truthful billing/subscription and invoice list.
- Destructive actions get confirm or undo.
- Verify: one headless pass over the QR flow and every Settings sub-section.

## Batch 3 — Control permissions, impersonation, gate + handoff

- Every Control screen gated by `canAccess('control')`, otherwise `noPermissionPage()`.
- Attention dashboard (new signups, unpaid, flagged) from `HapServices.activity` / `team`.
- User and membership management: list, change role, suspend (mock).
- Audited impersonation: enter a restaurant admin view with a persistent "Impersonating <restaurant> — Exit" banner; each enter/exit logged to `state.ops.activity`.
- Direct superadmin menu editing removed — editing requires impersonation.
- Accessibility and scale gate: 390px and 320px, light/dark, keyboard and focus, contrast, 44px touch targets, 200% text scaling, reduced motion, fixtures at 5/50/150/300 items and 5/20 categories. Fix regressions found.
- Write `FRONTEND_BACKEND_HANDOFF.md`: architecture (prototype files vs TanStack shells), `HapServices` contract and envelope shapes, storage schema (`hap.restaurant.<slug>.v1`, `hap.guest.v1`), route map and permissions, promotion lifecycle rules, insights taxonomy, mock-only areas.
- Verify: one final headless pass over `/r/sofra/admin`, `/menu/sofra`, `/preview` (redirect), `/super`.

## Technical notes

- Work stays in `public/hap/app.js`, `public/hap/ops.js`, `public/hap/services.js`, `public/hap/styles.css`, `public/hap/index.html`, and TanStack shells in `src/routes/`.
- No backend, no Cloud, no payment provider. No rewrite to React/TypeScript.
- All new domain logic goes through `HapServices` with `{status, data, error}`.
- QR library added via a script tag in `public/hap/index.html` to keep the prototype self-contained.
- Guest-facing strings go through the existing `t()` translation table.
- Credit control: one verification pass per batch, no per-file re-reads, no screenshots beyond what a failure requires.
