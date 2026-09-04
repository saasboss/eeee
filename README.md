# Hap

Hap is a mobile-first digital restaurant menu and administration prototype. The current work is **Phase 1: UI/UX, information architecture, action hierarchy, accessibility, and visual polish** of the existing prototype.

For the approved scope and implementation order, read:

- [`AGENTS.md`](AGENTS.md) — mandatory rules for every coding agent
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — product state and current priority
- [`.lovable/plan.md`](.lovable/plan.md) — detailed Phase 1 plan
- [`docs/AI_WORK_LOG.md`](docs/AI_WORK_LOG.md) — coordination between Codex, Claude, Lovable, and other agents

## Current architecture

- TanStack Start and TanStack Router
- React 19 and TypeScript
- Vite and Tailwind CSS v4
- shadcn/ui and Radix UI components
- The restaurant interface is implemented in `public/hap/`
- `src/components/hap-app.tsx` mounts that interface directly into the host document; it does **not** use an iframe
- GitHub `main` is the shared source of truth and synchronizes with the connected Lovable project

This repository is currently a prototype. Do not assume that authentication, production data, payments, analytics, billing, roles, or tenancy are complete merely because their screens or demo states exist.

## Route overview

| Route | Current behavior |
| --- | --- |
| `/` | React marketing page |
| `/preview` | Redirects to the default restaurant's guest menu |
| `/menu/:slug` | Guest-facing restaurant menu |
| `/r/:slug/admin` | Restaurant Overview |
| `/r/:slug/admin/menu` | Menu Items |
| `/r/:slug/admin/menu/design` | Menu Design |
| `/r/:slug/admin/menu/promotions` | Promotions |
| `/r/:slug/admin/menu/qr` | Menu QR |
| `/r/:slug/admin/insights` | Insights |
| `/r/:slug/admin/settings/*` | Restaurant, Team, and Billing settings |
| `/super/*` | Hap Control prototype |
| `/admin/*` | Legacy URLs redirected to the default restaurant-scoped admin |

Canonical and legacy route mappings live in `src/lib/hap-routes.ts`.

## Phase 1 boundaries

Phase 1 is mobile-first at 320, 390, and 430px. At 700px and above, the existing framed presentation is checked only for regressions.

Phase 1 does not introduce or redesign:

- Authentication or authorization
- Production data or database structure
- Payments or self-serve billing
- Roles and tenancy
- A true desktop/tablet administration layout
- A broad global CSS rewrite

See `.lovable/plan.md` for the numbered, independently reviewable tasks.

## Development

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Available checks:

```sh
npm run build
npm run lint
```

## Working safely

1. Read `AGENTS.md` and the project documents before planning or editing.
2. Check open pull requests to avoid duplicating another agent's work.
3. Use one task, one branch, one writing agent, and one pull request.
4. Record decisions, checks, reviews, and handoffs in the active pull request.
5. Merge only after reviewing the complete diff.
6. Verify the merged commit in Lovable.

Connected Lovable project: [eeee](https://lovable.dev/projects/751f4043-869d-4288-a057-aaa66f0508a2).
