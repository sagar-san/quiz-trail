# Quiz Trail app overview

## Purpose

Quiz Trail is a focused practice app for Google Cloud's Professional Machine Learning Engineer certification. Learners sign in with Google, answer a shuffled bank of questions, receive immediate feedback, review selected subsets, and explicitly save progress for later sessions.

The public production site is <https://quiz-trail.web.app>. The single live Firebase project is `quiz-trail`; local Firebase emulators are the development environment.

## Main user journey

1. A visitor reads the PMLE overview and signs in with Google.
2. The app loads and validates the full CSV question bank.
3. The learner answers single- or multiple-choice questions and receives immediate feedback.
4. All, Unanswered, Incorrect, and Saved views support review.
5. Save Progress explicitly writes the current progress snapshot.
6. The avatar menu opens Account & Data settings for sign out, progress reset, and account deletion.

Account deletion requires typed confirmation and Google reauthentication. It deletes `userProgress/{uid}` and then the Firebase Authentication identity.

## Behavioral rules

- Progress is not auto-saved. Only Save Progress persists answer and bookmark changes.
- The active filter is a separate browser preference and saves immediately.
- Question order is shuffled once per page load and stays stable within that tab.
- A page load starts from the first question in the new shuffle; a saved return point does not override it.
- Previous and Next do not create unsaved changes by themselves.
- Multiple-choice grading requires an exact match to the correct answer set.
- A newly answered question remains visible long enough to read its feedback.
- Browser unload warnings appear only while meaningful progress changes remain unsaved.

## Data and identity

| Mode | Identity | Progress storage |
|---|---|---|
| `local` | Automatic local browser identity | `localStorage` |
| `firebase-emulator` | Firebase Auth emulator | Firestore emulator |
| `firebase` | Google through Firebase Auth | Production Firestore |

Cloud progress is one document per account at `userProgress/{uid}`. It stores answer outcomes keyed by stable question ID, saved-for-later IDs, a return point, schema version, question-bank version, revision, and update timestamp. It never stores question text.

Firestore rules restrict users to their own progress document. Transaction revisions prevent stale tabs or devices from silently overwriting newer saved progress.

## Question bank

`public/data/questions.csv` is the only question source. The browser validates the complete file and derives its version from a SHA-256 hash of the exact bytes.

Question IDs are permanent data keys. Adding a new ID creates an unanswered question; removing an ID reconciles away its saved references. A materially changed question or changed correct answer should receive a new ID.

Read `docs/question-bank.md` before changing question content.

## Code map

| Area | Location |
|---|---|
| Application composition and flows | `src/app/` |
| Quiz state, reducer, selectors, and types | `src/domain/` |
| CSV loading and validation | `src/data/csv/` |
| Authentication adapters | `src/auth/` |
| Local and Firestore persistence | `src/storage/` |
| React UI components | `src/components/` |
| Styling | `src/styles/index.css` |
| Firestore access control | `firestore.rules` |
| Unit/component tests | colocated `*.test.ts(x)` files |
| Firebase integration tests | `tests/` and `e2e/firebase-emulator.spec.ts` |

## Product boundaries

- This is a small free app; occasional live downtime is acceptable.
- There is intentionally no separate staging Firebase project. Use emulators for development.
- Questions remain a versioned CSV rather than live Firestore content.
- Saves remain explicit rather than automatic.
- No timed exams, attempt history, leaderboard, adaptive learning, or admin question editor is currently planned.
- Billing changes, App Check enforcement, OAuth changes, domain verification, live rule changes, and production deployments require explicit product-owner approval.

Use `session.md` for current status, `TODO.md` for deferred work, and `docs/release-runbook.md` for operations.
