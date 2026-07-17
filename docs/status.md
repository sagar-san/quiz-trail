# Current status

Last reviewed: 2026-07-17

## Active state

- The production application is live at <https://quiz-trail.web.app> from commit `97a336b` (`feat: add learner analytics summary`).
- The Git remote is `git@github.com:Ameenota/quiz-trail.git` and the Firebase production project is `quiz-trail`.
- Production includes Google sign-in, explicit Firestore progress saving, learner analytics, Settings and account deletion, the public PMLE overview, contribution/source links, a post-answer AI review prompt, and a debug-only Firestore question feedback form.
- The canonical question bank contains 408 valid questions: 397 single-choice and 11 multiple-choice.
- Local browser mode and Firebase emulator mode are the development environments. Do not infer that prior dev servers or emulators are still running; inspect before starting processes.

## Recent verification

On 2026-07-17, the documentation consolidation passed relative-link and stale-path checks, `git diff --check`, and question-bank preflight (408 valid rows).

The following passed on 2026-07-16 for the deployed learner-analytics release:

- Typecheck, lint, unit tests, CSV preflight, and local browser tests.
- Authentication emulator tests, Firestore rules/progress tests, and Firebase-mode browser tests.
- Production cloud build and Hosting smoke checks.
- The live CSV matched the canonical SHA-256 and was served with `Cache-Control: no-cache`.

Verification is historical evidence, not a substitute for rerunning checks relevant to new changes.

## Current cautions

- The single live Firebase project is production. Deployment and other console-sensitive changes require explicit product-owner approval.
- The Firebase alias is `production`; the old `staging` alias was retired.
- App Check is not enforced, billing ownership and budget alerts remain unresolved, and a custom domain is optional.
- Analytics currently reports only the latest outcome per question; attempt history needs a separately reviewed persistence migration.

Deploy the newly added Firestore question feedback form and security rules to production. Create the `/config/feedback` document in the Firestore production environment with `{ enabled: true }` to allow submissions.
