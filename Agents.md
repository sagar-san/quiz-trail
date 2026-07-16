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
- Treat `session.md` as the repository's current handoff context, while verifying its claims against the working tree when relevant.
- When the human says the session is ending or reminds the agent to save the session, update `session.md` before stopping.
- The session handoff should concisely record the current status, completed work, important decisions, unresolved issues, verification results, and recommended next steps.
- Do not record secrets, credentials, tokens, or other sensitive values in `session.md`.
