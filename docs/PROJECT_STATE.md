# Project state

Last updated: 2026-09-03

## Product idea

**Working description:** Hap is a restaurant menu/operations workspace that lets staff navigate, select, and edit specific app elements through a toolbar.

**Needs owner confirmation:** the exact target customer, first paid use case, MVP boundary, and success metric.

## Now — one current priority

Phase 1 — UI/UX, information architecture, action hierarchy and visual polish of the existing Hap prototype. Mobile-first at 320/390/430px; ≥700px checked only for no regression. Visual work covers positioning, alignment, hierarchy, density, spacing on an 8px scale, one page-header structure, and removal of wasted space and redundant containers—without a global CSS rewrite. No changes to authentication, data, payments, dependencies or business logic. Delivered as the numbered tasks in `.lovable/plan.md`, one branch and pull request each, independently reviewable and revertible.

## Next — ordered queue

1. Turn the approved MVP into small, independently reviewable tasks.
2. Complete one task per branch and pull request.
3. Verify every merge in Lovable.
4. Add automated checks around the first business-critical workflow.

## Later / deferred

True desktop/tablet administration layout — deferred to Phase 2. Phase 1 only verifies that the existing framed presentation does not regress at ≥700px.

No product features have been formally deferred yet. Add each deferred item here with:

- Item
- Reason postponed
- Dependency or condition to resume
- Date/decision owner

Never delete a deferred item merely because it is inconvenient.

## Done — merged and verified

- Lovable project `eeee` connected to GitHub repository `saasboss/eeee`.
- GitHub-to-Lovable synchronization verified with an inert documentation change.
- Beginner AI workflow, model routing, safety rules, and credit handoff system added.

## Decisions

- GitHub `main` is the shared source of truth.
- `main` must stay usable.
- Work uses one task, one branch, one writing agent, and one pull request.
- Other agents review read-only unless explicitly assigned a separate fix.
- High-risk changes require an Expert model, approved plan, rollback, and second review.
- Agent continuity comes from commits and handoffs, never credential sharing.

## Open owner decisions

1. Confirm or rewrite the Product idea above.
2. Define the MVP and what will not be built yet.
3. Choose the first paid/customer workflow.
