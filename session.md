# Session handoff

Last updated: 2026-07-16

## Current status

- Production release commit `ca1c1bc` (`feat: expand question bank and add AI review prompt`) is synchronized with `origin/main` and deployed to Firebase Hosting.
- The working tree now contains an uncommitted, undeployed learner analytics summary for the 408-question bank. It uses CSV metadata plus the existing ID-keyed outcome/bookmark state and does not change Firestore, its rules, or the saved-progress schema.
- GitHub remote: `git@github.com:Ameenota/quiz-trail.git`.
- Firebase production project: `quiz-trail` (project number `724933345983`). The product owner explicitly chose to use this single live project as production and accept occasional downtime; local emulators are the development environment.
- The Firebase CLI is authenticated locally as `ssanghani@gmail.com` using the repository-scoped ignored config directory.
- Firebase Hosting and Firestore rules/indexes were successfully deployed and smoke-tested at <https://quiz-trail.web.app>.
- The live deployment includes Account & Data settings, secure account deletion, the public PMLE overview, updated HTML metadata, donation/source links, the avatar account menu, public support through GitHub Issues, and a post-answer AI review prompt that users can copy into ChatGPT, Gemini, Claude, or another AI app.
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
- Replaced the canonical question bank with 408 valid questions: 397 single-choice and 11 multiple-choice.
- Added learner analytics metadata parsing and validation for exam section, objectives, topics, difficulty, source, review status, outdated flags, and terminology fields.
- Added a learner-facing Summary view with overall coverage and current accuracy, exam-section/objective/topic/difficulty breakdowns, sample-gated section strengths and weak areas, and review-queue links.
- Added an Outdated question filter limited to answered questions, plus post-answer subject metadata details. Source, review-status, and terminology fields remain internal and appear post-answer only with `?debug=true`.
- Deferred attempt counts and first/latest accuracy to `TODO.md`; the MVP uses the latest recorded outcome without any persistence migration.
- Added a deterministic bank-version fallback for insecure local-network HTTP, where mobile browsers do not expose Web Crypto; production HTTPS still uses SHA-256.
- Removed the destructive reset action from the Save Progress panel. Reset all progress now lives only in Settings, which is directly accessible in local mode and remains under the account menu in cloud mode.
- Added a structured Markdown AI review prompt after answer submission. It includes only question context, asks the model to solve independently, treats the supplied answer as a claim, and encourages evidence-based pushback using official Google Cloud sources.

## Product and data decisions

- `public/data/questions.csv` is the canonical question source. The current bank has 408 valid questions: 397 single-choice and 11 multiple-choice. Subject metadata drives learner analytics; editorial and terminology details appear only after a learner answers.
- Question IDs are permanent progress keys. Use a new ID when a change materially alters what a question tests or changes its correct answer.
- The browser derives the question-bank version automatically from the CSV bytes; no manual version update is required.
- Progress saves only when Save Progress is selected. Local mode uses browser storage; Firebase modes use `userProgress/{uid}` in Firestore.
- Question order is shuffled once per page load. Saved outcomes and bookmarks remain keyed by permanent question ID.
- The active filter is a separate browser preference saved immediately.
- Firebase client configuration is stored in gitignored `.env.local`; sensitive values are intentionally omitted here.

## Verification

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass — 53 tests across 11 files
- `npm run preflight`: pass — 408 rows; 397 single-choice; 11 multiple-choice; 0 invalid; SHA-256 `2245e7b2491625c18b5203bf60bf81b44076e513f4b6a4d20386f579d5a4b0b0`
- `npm run e2e`: pass — 6 desktop/mobile tests, including summary accessibility, overflow, and review-queue navigation
- `npm run e2e:firebase`: pass — sign-in, Firestore save, sign-out/in restore, Settings, Google reauthentication, account deletion, and the 383-question count
- Cloud-mode production build: pass
- Deployed Hosting root and canonical CSV: HTTP 200; live CSV hash exactly matches the canonical file and is served with `Cache-Control: no-cache`

## Remaining work

- Add a “Report this question” workflow that opens a prefilled GitHub issue with the question ID and review context.
- Consider surfacing `terminology_status` for maintainers through a validation report or protected content-review tool; do not expose internal editorial notes to learners without review.
- Consider making Firebase browser integration tests self-starting so `npm run e2e:firebase` manages its emulator and Vite dependencies automatically.
- Configure App Check in monitoring/non-enforcing mode, then review legitimate traffic before considering enforcement.
- Treat `quiz-trail.web.app` as the supported production domain. A custom domain is optional.
- Establish billing ownership and budget alerts before enabling paid services.
- Venmo remains optional and hidden until a valid URL is supplied.

See `TODO.md` for durable deferred work and approval boundaries.
