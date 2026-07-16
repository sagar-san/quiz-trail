# Session handoff

Last updated: 2026-07-16

## Current status

- Application and documentation work through `ae404a3` (`docs: simplify project readme`) is synchronized with `origin/main`; only this handoff update remains uncommitted.
- GitHub remote: `git@github.com:Ameenota/quiz-trail.git`.
- Firebase production project: `quiz-trail` (project number `724933345983`). The product owner explicitly chose to use this single live project as production and accept occasional downtime; local emulators are the development environment.
- The Firebase CLI is authenticated locally as `ssanghani@gmail.com` using the repository-scoped ignored config directory.
- Firebase Hosting and Firestore rules/indexes were successfully deployed and smoke-tested at <https://quiz-trail.web.app>.
- The live deployment predates the Account & Data settings feature. Commit `6e3c1df` is pushed to GitHub but still needs a new cloud-mode build and Firebase Hosting deployment before Settings appears publicly.
- The product owner tested the live Google sign-in, Firestore save, and resume flow successfully and found no issues.
- Firebase emulators and a Firebase-mode Vite server were started for review. Confirm whether they are still running before starting duplicate processes.
- The Firebase alias is now `production`; the prior `staging` alias was retired. No billing, App Check, OAuth consent, or custom-domain changes were made.

## Completed this session

- Fixed false unsaved-change warnings: Previous/Next navigation now preserves the existing dirty state instead of creating unsaved changes by itself.
- Updated the support copy to mention covering cloud costs.
- Added an Account & Data settings view with account identity, data-storage information, support link, reset progress, and sign out.
- Added secure account deletion requiring typed `DELETE` and Google reauthentication, then deleting `userProgress/{uid}` and the Firebase Authentication identity.
- Added unit and Firebase-emulator browser coverage for Settings, sign-out, progress restoration, reauthentication, and account deletion.
- Added Firebase deployment-cache ignores.
- Added and pushed the GitHub remote.
- Simplified `README.md` and moved technical and question-bank details into `docs/development-guide.md` and `docs/question-bank.md`.
- Updated `TODO.md`: Settings and account deletion are complete; “Report this question” remains deferred.

## Product and data decisions

- `public/data/questions.csv` is the canonical question source. The current bank has 339 valid questions: 334 single-choice and 5 multiple-choice.
- Question IDs are permanent progress keys. Use a new ID when a change materially alters what a question tests or changes its correct answer.
- The browser derives the question-bank version automatically from the CSV bytes; no manual version update is required.
- Progress saves only when Save Progress is selected. Local mode uses browser storage; Firebase modes use `userProgress/{uid}` in Firestore.
- Question order is shuffled once per page load. Saved outcomes and bookmarks remain keyed by permanent question ID.
- The active filter is a separate browser preference saved immediately.
- Firebase client configuration is stored in gitignored `.env.local`; sensitive values are intentionally omitted here.

## Verification

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass — 41 tests across 10 files
- `npm run e2e`: pass — 4 desktop/mobile tests
- `npm run e2e:firebase`: pass — sign-in, Firestore save, sign-out/in restore, Settings, Google reauthentication, and account deletion
- Cloud-mode production build: pass
- Previously deployed Hosting root and canonical CSV: HTTP 200

## Remaining work

- Review the Settings experience locally, then explicitly approve and deploy commit `6e3c1df` or later to Firebase Hosting.
- Add a “Report this question” workflow and decide where reports are submitted.
- Configure App Check in monitoring/non-enforcing mode, then review legitimate traffic before considering enforcement.
- Treat `quiz-trail.web.app` as the supported production domain. A custom domain is optional.
- Establish billing ownership and budget alerts before enabling paid services.
- Venmo remains optional and hidden until a valid URL is supplied.

See `TODO.md` for durable deferred work and approval boundaries.
