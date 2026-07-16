# Agent Instructions

## Workspace permissions

- Agents may read, create, edit, move, and delete files, and run commands freely within this repository directory.
- Agents must always ask the human for explicit permission before reading, writing, moving, deleting, or otherwise touching anything outside this repository directory.

## Privileged operations

- Keep a human in the loop for every operation involving `sudo`.
- Never run a `sudo` command without first showing the exact command and receiving explicit human approval.
- Do not bypass, weaken, or work around these permission requirements.

## Session continuity

- At the start of every working session, read `session.md` before planning or making changes.
- Also read `TODO.md` at the start of a session when it exists, and account for relevant deferred work when planning.
- Treat `session.md` as the repository's current handoff context, while verifying its claims against the working tree when relevant.
- When the human says the session is ending or reminds the agent to save the session, update `session.md` before stopping.
- The session handoff should concisely record the current status, completed work, important decisions, unresolved issues, verification results, and recommended next steps.
- Do not record secrets, credentials, tokens, or other sensitive values in `session.md`.

## TODO tracking

- Use `TODO.md` for durable deferred work, follow-up items, and future console or production-readiness actions. Keep detailed implementation sequencing in `docs/implementation-plan.md` and current handoff context in `session.md`.
- Update `TODO.md` when the human defers an in-scope item, when new follow-up work is discovered, or when a tracked item is completed or superseded.
- Preserve explicit approval boundaries in TODO entries. A TODO item records future work; it does not itself authorize production deployments, billing changes, App Check enforcement, OAuth consent changes, domain verification, or other console-sensitive actions.
- Do not begin unrelated TODO items merely because they are listed. Work only on items within the human's current request or separately approved scope.
- Mark completed items with `[x]` instead of silently deleting them, unless the human asks to clean up completed history. Add a brief note when an item is superseded or intentionally canceled.
- Never record secrets, credentials, tokens, API keys, or other sensitive values in `TODO.md`.
