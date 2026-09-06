# Project state

Last updated: 2026-09-06

## Product idea

**Working description:** Hap is a mobile-first restaurant menu and operations workspace. It gives an owner or manager one place to organize categories and dishes, update prices and availability, run promotions, publish a guest-facing menu, share it by QR code, and understand basic guest activity.

**Prototype evidence:** the current product already demonstrates the restaurant-admin, public-menu, QR, promotion, design, settings, insights, and Hap Control surfaces.

**Still needs owner confirmation before production implementation:** the exact first customer segment, the first paid workflow, the smallest production-ready boundary, and the success metric. Agents should use the existing product and this description as context; they should not restart with generic questions that the repository already answers.

## Now — one current priority

Define Hap's production MVP from the polished prototype. Start with the smallest complete restaurant workflow: an owner or manager can set up a restaurant menu, create and organize categories and items, update price and availability, publish the mobile guest menu, and share it by QR code. Confirm only the decisions that materially affect product behavior, security, cost, or scope before turning this workflow into implementation tasks.

No further broad UI-polish work should begin until the MVP boundary and first success metric are recorded here.

## Next — ordered queue

1. Confirm the first customer segment and first paid use case without re-asking facts already visible in the product.
2. Set one measurable MVP success condition.
3. Split the complete workflow into small, independently reviewable vertical slices.
4. Plan production foundations, including authentication, tenancy, persistence, deployment, and automated checks, through the high-risk gate where applicable.
5. Implement one task per branch and pull request, verifying every merge in Lovable.

## Later / deferred

- **Menu bulk behaviour (Phase 1 Task 12)** — deferred until the owner chooses the exact bulk workflow; resume after that product decision.
- **True desktop/tablet administration layout (Phase 2)** — Phase 1 only verified that the existing framed presentation does not regress at ≥700px.
- **Hap Control redesign** — excluded from the restaurant-admin polish phase.
- **Real analytics, self-serve billing, multi-menu UI, and routed sheet/back-button overlay handling** — require separate product and technical scopes.
- **Broad/global CSS rewrite** — not justified by Phase 1 and must not be mixed into feature work.

Never delete a deferred item merely because it is inconvenient. Record its reason, dependency or resume condition, date, and decision owner when it becomes active.

## Done — merged and verified

- Lovable project `eeee` connected to GitHub repository `saasboss/eeee`.
- GitHub-to-Lovable synchronization verified with an inert documentation change.
- Beginner AI workflow, model routing, safety rules, and credit handoff system added.
- **Phase 1 UI/UX, information architecture, action hierarchy, accessibility, and visual-polish tasks completed**, except the intentionally deferred Task 12 bulk-workflow decision.
- Phase 1 screen work was delivered through separate pull requests and verified in the exact Lovable build.
- Final responsive matrix passed on the guest menu, Overview, Menu Items, Design, Promotions, QR, Insights, Settings Restaurant/Team/Billing, and Hap Control at 320, 390, 430, and 800px with zero horizontal overflow and no console errors.
- Final UI verification commit: `dbceba376b3d413e6ecf4be72f7273f60e749be1`.
- Canonical numbered plan restored at `.lovable/plan.md` while preserving Lovable's separate public-menu category-header plan.

## Decisions

- GitHub `main` is the shared source of truth.
- `main` must stay usable.
- Work uses one task, one branch, one writing agent, and one pull request.
- Other agents review read-only unless explicitly assigned a separate fix.
- High-risk changes require an Expert model, approved plan, rollback, and second review.
- Agent continuity comes from commits and handoffs, never credential sharing.
- Phase 1 is complete; Task 12 remains deferred rather than silently absorbed into another task.
- Broad UI-polish passes stop here. New work must support the recorded MVP workflow or be explicitly prioritized.

## Open owner decisions

1. Which independent restaurant segment is first?
2. What is the first paid use case?
3. What single measurable result proves the MVP works?
