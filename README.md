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

```bash
nvm use
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Local development defaults to browser storage, so Firebase credentials are not required.

## Project documentation

- [Development guide](docs/development-guide.md) — commands, Firebase modes, testing, and deployment notes
- [Question bank guide](docs/question-bank.md) — CSV format and safe content updates
- [Product plan](docs/product-plan.md)
- [Implementation plan](docs/implementation-plan.md)

The canonical question bank is [`public/data/questions.csv`](public/data/questions.csv).
