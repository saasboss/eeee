# Shared AI work log

This file explains how Codex, Claude, Lovable, and any future agent share context without relying on private chat history.

## Where shared information lives

| Information | Source of truth |
| --- | --- |
| Product idea, Now, Next, Later/deferred, Done, decisions | `docs/PROJECT_STATE.md` |
| Detailed Phase 1 implementation order | `.lovable/plan.md` |
| Active task owner, branch, discussion, checks, and review | The task's open GitHub pull request |
| Unfinished-work checkpoint | Pull-request description/comment using `docs/HANDOFF_TEMPLATE.md` |
| Mandatory safety and coordination rules | `AGENTS.md` |

A private AI chat is never the source of truth. Important facts from a private chat must be summarized in the task's pull request.

## Before any agent starts work

1. Read `AGENTS.md`, `docs/PROJECT_STATE.md`, this file, and the relevant plan.
2. Inspect open pull requests.
3. Search for the same task, route, component, or file set.
4. If another agent already owns overlapping work, do not start another implementation.
5. If the task is free, create one appropriately prefixed branch and one pull request.
6. State the provider/model, task, acceptance criteria, intended files, checks, and rollback in the pull request.

## During work

Use the active pull request as the shared task conversation. Add concise comments only when something materially changes:

- A product or implementation decision was made.
- Scope or acceptance criteria changed.
- A blocker appeared.
- Checks passed or failed.
- A read-only reviewer found an issue.
- The next agent needs a handoff.

Do not paste full chat transcripts, repeated progress narration, credentials, tokens, cookies, or secrets.

## Ownership rule

One task has one writing agent.

- The builder owns the branch and file set.
- Claude, Codex, or another provider may review the pull request read-only.
- Lovable may work visually only when no other agent is writing the same task/files.
- Review findings go into the pull request.
- Fixes remain with the branch owner unless the user explicitly reassigns ownership.

## Switching providers or accounts

Before switching, the current agent must stop at a safe boundary, commit and push safe work, run available checks, and add a handoff comment using `docs/HANDOFF_TEMPLATE.md`.

The next agent must verify the named branch and commit before editing. It continues only the Remaining section; it does not restart the task from memory.

## After merge

1. Verify the merge on GitHub.
2. Verify the merged result in Lovable when the change affects the connected project.
3. Update `docs/PROJECT_STATE.md` if Now, Next, Later/deferred, Done, or Decisions changed.
4. Close or clearly resolve the task conversation.

## Copy-paste startup prompt

> Use the connected GitHub repository `saasboss/eeee`. Read `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/AI_WORK_LOG.md`, the relevant plan, and all open pull requests that may overlap this task. Before editing, report whether another agent already owns overlapping work. If it is free, state the goal, acceptance criteria, intended files, model tier, checks, and rollback; then use one new branch and one pull request. Record material decisions and handoffs in the pull request so Codex, Claude, and Lovable share the same context. Never duplicate active work or rely on private chat history.

## Starting history

| Pull request | Result |
| --- | --- |
| [#1 — GitHub-to-Lovable sync test](https://github.com/saasboss/eeee/pull/1) | Merged; inert documentation change used to verify synchronization |
| [#2 — AI workflow and safety rules](https://github.com/saasboss/eeee/pull/2) | Merged; agent rules, model routing, and handoff workflow added |
| [#3 — Phase 1 project state](https://github.com/saasboss/eeee/pull/3) | Merged; Phase 1 set as Now and desktop/tablet administration deferred to Phase 2 |
