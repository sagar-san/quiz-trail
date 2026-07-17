# Quiz Trail documentation

This directory contains the repository's durable product, engineering, and operational knowledge. `AGENTS.md` is the agent-facing router; this page is the human-facing map.

Do not treat every document as required reading. Open the source of truth that matches the work being performed.

| Concern | Source of truth | Update when |
|---|---|---|
| Supported behavior and product boundaries | [`product.md`](product.md) | User-visible behavior, scope, or product boundaries change |
| Implemented system design and data flow | [`architecture.md`](architecture.md) | Components, contracts, persistence, authentication, or system boundaries change |
| Reasons behind durable choices | [`decisions.md`](decisions.md) | A meaningful durable choice is accepted, rejected, or superseded |
| Current handoff | [`status.md`](status.md) | Meaningful work is handed off or current state materially changes |
| Deferred work | [`backlog.md`](backlog.md) | Work is deliberately deferred, completed, canceled, or superseded |
| Setup, commands, and tests | [`development.md`](development.md) | Development workflow or tooling changes |
| Question-data contract | [`question-bank.md`](question-bank.md) | CSV schema, validation, or editorial workflow changes |
| Firebase and releases | [`release-runbook.md`](release-runbook.md) | Operational, deployment, or recovery procedures change |

## Historical documents

[`archive/`](archive/) contains completed plans and handoffs retained for context. Archived documents describe an earlier point in the project and are not current sources of truth. Do not use them for implementation unless current documentation explicitly points to them.

Git history is the project changelog. Current documents should describe the present system rather than accumulate a duplicate history of completed sessions.
