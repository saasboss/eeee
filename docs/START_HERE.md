# Start here — baby mode

You do not need to design the workflow yourself. Pick the matching box below, select the named model if it is available on your plan, and copy the prompt.

Model availability and free allowances change. The permanent rule is: cheap/fast for clear low-risk work, balanced for normal work, strongest for high-risk or genuinely hard work.

## The whole workflow

1. **Define:** an AI turns the idea into one small task with acceptance criteria.
2. **Build:** one agent owns one branch. No second agent writes there.
3. **Check:** the builder runs tests and reports the exact diff.
4. **Review:** a different provider or strong model reviews read-only.
5. **Merge:** merge the pull request only when it is safe.
6. **Verify:** confirm the merged commit appears in Lovable.
7. **Record:** update `docs/PROJECT_STATE.md` — Done, Next, or Later.

## I do not know where to start

Use **Codex GPT-5.6 Terra, Medium** or **Claude Sonnet 5**.

Copy this:

> Read AGENTS.md, docs/START_HERE.md, docs/PROJECT_STATE.md, and docs/MODEL_ROUTING.md. Do not edit code yet. Turn this idea into one small task: [PASTE IDEA]. Explain it in plain language, list acceptance criteria, identify risks, choose the correct model tier, name the files likely involved, and tell me the single next prompt to send.

## Tiny, clear, low-risk change

Examples: docs, text correction, rename, search, formatting one known file, or a mechanical fix with an obvious answer.

Use **Codex GPT-5.6 Luna, Low** or **Claude Haiku 4.5**.

Copy this:

> Read AGENTS.md and the project docs. Implement this small task on a new branch: [TASK]. Acceptance criteria: [CRITERIA]. Touch only the minimum files. Run the relevant checks, open a pull request, and report branch, commit, files, checks, deferred items, rollback, and next step. Stop and escalate instead of guessing if the task becomes risky or unclear.

## Normal feature or bug

Use **Codex GPT-5.6 Terra, Medium** or **Claude Sonnet 5**.

Copy this:

> Read AGENTS.md and the project docs. Own this task end-to-end on a new branch: [TASK]. First restate the goal, acceptance criteria, planned files, model tier, and rollback. Then implement only the approved scope, test it, review the complete diff, open a pull request, and report the required final details. Do not merge until the task has been reviewed.

## Hard or high-risk work

Examples: architecture, authentication, permissions, payments, database schema/migrations, secrets, production infrastructure, security, destructive actions, or a bug that defeated the Standard tier.

Use **Codex GPT-5.6 Sol, High** or **Claude Opus 5**. For unusually long research/planning, use **Claude Fable 5.1** if available.

Copy this first — planning only:

> Read AGENTS.md and the project docs. This is a high-risk task: [TASK]. Do not edit anything. Produce a threat/risk-aware plan, acceptance criteria, files and systems affected, test plan, rollback plan, unknowns, and the safest implementation sequence. Wait for my approval before making changes.

After approving the plan, copy this:

> Implement the approved plan on a new branch. Obey the high-risk gate in AGENTS.md. Keep a safe checkpoint, run all relevant checks, open a pull request, and request a read-only second-agent review. Do not merge until that review is resolved.

## Visual change

For copy, color, spacing, sizing, or simple layout, try **Lovable Visual Edits** first. For scoped visual implementation that needs the live preview, use **Lovable Agent mode**. Do not use Lovable while another agent is editing the same task.

Copy this into Lovable:

> Read AGENTS.md and docs/PROJECT_STATE.md. Change only [EXACT SCREEN/ELEMENT]. Goal: [GOAL]. Acceptance criteria: [CRITERIA, INCLUDING DESKTOP/MOBILE]. Do not alter unrelated behavior, dependencies, data, authentication, or other pages. Keep the project runnable, verify the result visually, and report every changed file. If the task is broader than described, stop and explain instead of expanding scope.

## Review another agent's work

Use a different provider from the builder. For normal work, use **Terra/Sonnet**. For high-risk work, use **Sol/Opus**.

Copy this:

> Review this pull request read-only against AGENTS.md and its acceptance criteria: [PR LINK]. Inspect the complete diff and relevant surrounding code. Look for correctness, regressions, security, missing tests, unrelated changes, and rollback problems. Rank findings by severity and cite exact files/lines. Do not modify code. If there are no blocking findings, say that clearly and list remaining testing gaps.

## Credits are running out

Do not start again from memory and do not share account credentials. Tell the current agent:

> Credit checkpoint now. Stop at the next safe boundary, run available checks, commit and push safe work, and create a handoff using docs/HANDOFF_TEMPLATE.md. Report the branch, last safe commit, files changed, checks, remaining work, risks, and exact next command/prompt. Do not begin another change.

Then tell the next agent:

> Read AGENTS.md, the project docs, this pull request/branch [LINK OR BRANCH], and the handoff [PASTE OR LINK]. Verify the last safe commit before editing. Continue only the Remaining section, preserve completed work, use the same acceptance criteria, and create a new checkpoint before your limits run out.

## Product idea, completed work, and deferred work

Keep all of it in `docs/PROJECT_STATE.md`:

- **Now:** exactly one current priority.
- **Next:** queued work, in order.
- **Later/deferred:** intentionally postponed work with a reason.
- **Done:** only merged and verified work.
- **Decisions:** choices agents must not silently reverse.

When something changes, tell the agent:

> Update docs/PROJECT_STATE.md so Now, Next, Later/deferred, Done, and Decisions match reality. Do not invent product decisions; flag anything that needs my answer.

## Never send these prompts

Avoid “make it better,” “finish the app,” “fix everything,” or giving two agents the same writing task. They create scope creep, conflicts, and wasted credits.
