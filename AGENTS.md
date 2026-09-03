<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Hap agent rules

These rules are mandatory for Codex, Claude, Lovable, and any other coding agent.

## Read first

Before planning or editing, read:

1. `docs/START_HERE.md`
2. `docs/PROJECT_STATE.md`
3. `docs/MODEL_ROUTING.md`
4. The current task or handoff, if one exists

If these documents conflict, this file wins. Ask the user only when a decision would materially change the product, security, cost, or scope.

## Git safety

- `main` must always remain usable.
- Never work directly on `main`. Use one new branch and one pull request per task.
- Use `codex/<task>`, `claude/<task>`, `lovable/<task>`, or `docs/<task>`.
- One task, branch, and file set has one active writing agent. Other agents may review read-only.
- Do not edit unrelated files, reformat the whole project, or “clean up” outside the task.
- Never force-push or rewrite published history.
- Before editing, state the goal, acceptance criteria, intended files, model tier, and rollback.
- Before merging, inspect the complete diff and run checks appropriate to the changed files.
- Merge only when the user explicitly asks for it or requests an end-to-end finished task.

## Product-state discipline

- `docs/PROJECT_STATE.md` is the human-readable source for the product idea, Now, Next, Later/deferred, Done, and decisions.
- A new feature starts in Now before implementation.
- Anything intentionally postponed goes in Later/deferred; never silently forget it.
- Move an item to Done only after it is merged and verified.
- Do not invent product decisions. Record assumptions and request approval when they affect behavior.

## Model and credit discipline

Use the lowest tier that is safe for the task; see `docs/MODEL_ROUTING.md`.

- Economy: docs, renames, searches, mechanical edits, and known one-file fixes.
- Standard: normal features, ordinary bugs, tests, and routine refactors.
- Expert: architecture, security, authentication, database changes, payments, migrations, secrets, destructive actions, or a problem that defeated Standard.
- Give Economy or Standard one serious attempt. If evidence shows the task is beyond it, save a checkpoint and escalate one tier.
- Do not burn credits through repeated blind retries.
- Never weaken tests or safety checks merely to make a task pass.

## High-risk gate

For authentication, authorization, payments, database schema or migrations, secrets, production infrastructure, dependency upgrades with breaking changes, destructive operations, or security controls:

1. Use an Expert model.
2. Produce a plan and rollback first.
3. Do not implement until the user approves the plan.
4. Require a second-agent review before merge.

## Credit-limit checkpoint

At a usage warning or before switching accounts/providers:

1. Stop at the next safe boundary.
2. Run the available checks.
3. Commit and push the safe work; never leave half-applied changes on `main`.
4. Fill in `docs/HANDOFF_TEMPLATE.md` in the task/PR description or a task-specific handoff file.
5. Report the branch, last safe commit, changed files, checks, remaining work, risks, and exact next action.

Never share passwords, cookies, API keys, or account credentials. A new agent receives context from GitHub plus the handoff, not from account sharing.

## Required final report

Every implementation report must include:

- Result and acceptance-criteria status
- Branch and commit
- Files changed
- Checks and results
- Deferred items
- Risks or assumptions
- Rollback method
- Exact recommended next step
