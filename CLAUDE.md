# Claude instructions

Before doing anything, read `AGENTS.md`, then `docs/START_HERE.md`, `docs/PROJECT_STATE.md`, and `docs/MODEL_ROUTING.md`.

`AGENTS.md` is the canonical rulebook. Follow it completely.

- Do not write to a task or branch currently owned by another agent.
- When asked to review another agent's work, stay read-only unless the user explicitly asks for fixes.
- For implementation, create a `claude/<task>` branch and a pull request.
- At a credit warning, create the required checkpoint and handoff before stopping.
- Do not bypass the high-risk approval gate.
