# Agent instructions

## Project summary

Quiz Trail is a React and TypeScript practice application for Google Cloud's Professional Machine Learning Engineer certification. The browser downloads an encrypted question asset from Cloud Storage; the sibling private question-bank repository owns the source, asset build, and public decryption key. Progress can be stored in the browser or in Firebase.

## Safety and permissions

- Work freely inside this repository and the sibling private
  `../quiz-trail-question-bank` repository. Treat them as one authorized
  workspace while preserving each repository's own instructions and history.
- Ask for explicit human permission before reading, writing, moving, deleting,
  or otherwise touching anything outside those two repositories.
- Never run `sudo` without first showing the exact command and receiving explicit approval.
- Never print or record secrets, credentials, tokens, API keys, or sensitive environment values in tracked files.
- Production deployment, live Firestore rule or data changes, billing changes, App Check enforcement, OAuth consent changes, domain verification, and other console-sensitive actions require explicit product-owner approval.
- A backlog item or prior approval for a different operation does not authorize a sensitive action.

## Working-tree safety

- Inspect the working tree before editing.
- Preserve unrelated human or agent changes. Do not overwrite, discard, or revert them without approval.
- Verify mutable claims against the working tree or runtime state when possible; handoff notes are context, not proof.
- Do not use destructive Git commands or rewrite shared history unless the human explicitly requests it.

## Commit and push workflow

- After completing and verifying an authorized update, commit only the
  task-related changes and push the current branch before handing off.
- When a change spans this repository and the sibling private
  `quiz-trail-question-bank` repository, commit and push the task-related
  changes in both repositories.
- If a push is blocked by authentication, permissions, remote divergence, or
  failing required checks, report the blocker instead of rewriting history or
  bypassing verification.
- A successful push does not authorize a production deployment or any other
  console-sensitive action.

## Documentation workflow

`AGENTS.md` is the documentation router. Do not recursively read `docs/` or preload every document.

### Session startup

For implementation, diagnosis, or repository planning:

1. Read `docs/status.md`.
2. Inspect the working tree.
3. Read only the additional documents selected by the routing table.

For a simple question or narrow read-only inspection, read `docs/status.md` only when current handoff context is relevant.

### Reading routes

| Work being performed | Required document |
|---|---|
| User-visible behavior, scope, or flows | `docs/product.md` |
| Architecture, state, persistence, authentication, or system boundaries | `docs/architecture.md` |
| Revisiting an established product or technical choice | `docs/decisions.md` |
| Setup, commands, tests, or development conventions | `docs/development.md` |
| Question data, content, CSV schema, or permanent IDs | `docs/question-bank.md` |
| Firebase services or tests, cloud builds, deployment, or rollback | `docs/release-runbook.md` |
| Deferred work explicitly placed in scope by the human | `docs/backlog.md` |

A task may require more than one document, but identify its relevance before opening it. Do not read a document merely because it exists. A document's links do not automatically require following every link. Files under `docs/archive/` are historical and must not be used as current requirements unless a current source of truth explicitly directs the agent there.

### Documentation updates

Update documentation only when the current task changes facts owned by that document:

- Update `docs/product.md` when supported behavior, scope, or product boundaries change.
- Update `docs/architecture.md` when the implemented design, data flow, contracts, or system boundaries change.
- Update `docs/decisions.md` only when a meaningful durable decision is accepted, rejected, or superseded. Do not log routine implementation choices.
- Update `docs/development.md`, `docs/question-bank.md`, or `docs/release-runbook.md` only when their workflows or contracts change.
- Update `docs/backlog.md` only when work is intentionally deferred, completed, canceled, or superseded. Mark completed items with `[x]` unless the human asks to clean up history.
- Update `docs/status.md` when handing off meaningful unfinished or newly completed work, when the human says the session is ending, or when the human asks to save the session.

Do not update every document after every task. Do not change a date without a substantive update, duplicate the same fact across documents, turn status into a changelog, or treat documentation maintenance as authorization for unrelated work.

## Important invariants

- The external private CSV is the application's only authored question source; never commit a plaintext bank to this public repository.
- Question IDs are permanent progress keys. Use a new ID when a change materially alters what a question tests or changes its correct answer.
- Progress saves only when Save Progress is selected; the active filter is a separate immediately stored preference.
- Do not change persistence or authentication contracts without reading `docs/architecture.md` and reviewing the relevant decision in `docs/decisions.md`.
- Do not expose internal editorial metadata to learners without deliberate product review.

## Verification

Run checks proportionate to the change:

| Change | Minimum verification |
|---|---|
| Documentation only | Review links, paths, and internal consistency |
| TypeScript or application logic | Typecheck and relevant tests |
| Styling or user-facing UI | Relevant tests plus browser or end-to-end verification |
| Question CSV or schema | Question-bank preflight and relevant tests |
| Firebase rules, authentication, or cloud persistence | Relevant emulator tests |
| Release-related work | Follow `docs/release-runbook.md` |

Report which checks ran and which did not. Do not claim completion while required verification is failing.

## Handoff hygiene

- Keep `docs/status.md` concise: current state, unfinished work, recent relevant verification, blockers or cautions, and recommended next steps.
- Move durable facts into their owning document and remove them from status when they no longer help the next handoff.
- Do not record transient process claims such as a server still running across sessions; tell the next agent to verify runtime state.
- Never record secrets or sensitive values in `docs/status.md` or `docs/backlog.md`.
