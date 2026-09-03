# Model routing

Updated: 2026-09-03. Provider names and free-plan availability can change; route by tier and task, then choose the closest currently available model.

| Tier | Use it for | Codex | Claude | Lovable |
|---|---|---|---|---|
| Economy | Docs, searches, renames, mechanical edits, known one-file fixes | GPT-5.6 Luna, Low | Haiku 4.5 | Visual Edits for simple visual changes |
| Standard | Normal features, ordinary bugs, tests, routine refactors | GPT-5.6 Terra, Medium | Sonnet 5 | Agent mode for scoped preview-dependent UI work |
| Expert | Architecture, hard bugs, security, auth, database, payments, migrations, production risk | GPT-5.6 Sol, High | Opus 5; Fable 5.1 for long-horizon research/planning if available | Plan first elsewhere; use Lovable only for the scoped visual portion |

## Rules

1. Use the lowest tier that is safe, not merely the cheapest model available.
2. A free/cheap model is ideal for clear, bounded, reversible tasks. It is not the default for auth, payments, databases, security, migrations, or destructive work.
3. Give Economy or Standard one serious attempt. If it cannot progress with evidence, checkpoint and move up one tier.
4. Do not repeat the same failed prompt across several accounts. Improve the task definition or escalate.
5. Use a different provider for review when practical.
6. Reasoning level follows risk: Low for small clear work, Medium for everyday work, High for difficult or high-risk work. Max/Ultra are exceptional, not defaults.
7. Lovable is the visual specialist: use Visual Edits for simple appearance changes and Agent mode only when implementation needs its live preview.
8. Account switching never transfers context. Git branch + commit + handoff are the continuity system.
9. Use only accounts you are authorized to use. Never share passwords, session cookies, API keys, or secret tokens.

## Quick decision

- Can the task be stated precisely and safely reverted? **Economy.**
- Is it a normal feature/bug needing judgment across files? **Standard.**
- Could a mistake affect money, access, data, security, or architecture? **Expert plus approval and second review.**
- Is the task primarily seeing and adjusting the UI? **Lovable, scoped to visuals.**
