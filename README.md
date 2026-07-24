# Quiz Trail

Quiz Trail is a focused PMLE practice app for working through a growing question bank in short sessions.

**[Open Quiz Trail](https://quiz-trail.web.app)**

## What you can do

- Sign in with Google and resume progress across devices.
- Practice single- and multiple-choice questions with immediate feedback.
- Review unanswered, incorrect, or saved-for-later questions.
- Explicitly save progress when you are ready.
- Manage or delete your account and saved data from Settings.

## Run locally

Requires Node.js 22 and npm.

Clone the private `quiz-trail-question-bank` repository beside this repository first, or set `QUESTION_BANK_PATH` to its `questions.csv`.

```bash
nvm use
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Local development defaults to browser storage, so Firebase credentials are not required.

## Project documentation

- [Documentation map](docs/README.md) — sources of truth and when to update them
- [Product](docs/product.md) — supported behavior, scope, and product boundaries
- [Architecture](docs/architecture.md) — implemented system design, contracts, and data flow
- [Development guide](docs/development.md) — setup, commands, modes, and testing
- [Question bank guide](docs/question-bank.md) — CSV contract and safe content updates
- [Release runbook](docs/release-runbook.md) — Firebase verification, deployment, and rollback

The canonical question bank is maintained in a separate private repository. Production builds validate it and deploy only an encrypted asset; see the [question bank guide](docs/question-bank.md).
