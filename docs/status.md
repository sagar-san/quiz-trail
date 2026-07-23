# Current status

Last reviewed: 2026-07-23

## Active state

- The production application is live at <https://quiz-trail.web.app> from commit `97c643e` (`feat: add progress score and unsaved answer warning`).
- The Git remote is `git@github.com:Ameenota/quiz-trail.git` and the Firebase production project is `quiz-trail`.
- Production includes Google sign-in, explicit Firestore progress saving, learner analytics, Settings and account deletion, the public PMLE overview, Buy Me a Coffee and GitHub-star support options, a public SEO-focused FAQ at `/faq`, ten curated canonical-bank questions at `/sample-questions`, a post-answer AI review prompt, a debug-only Firestore question feedback form, and a collapsed More options menu.
- The canonical question bank contains 408 valid questions: 397 single-choice and 11 multiple-choice.
- Local browser mode and Firebase emulator mode are the development environments. Do not infer that prior dev servers or emulators are still running; inspect before starting processes.
- Main includes an undeployed iOS clipboard reliability fix that replaces the AI review prompt's hanging asynchronous clipboard write with a synchronous selection-based copy. Automated checks were intentionally not run at the product owner's request; real-device verification is pending.

## Recent verification

On 2026-07-21, for the progress score and unsaved-answer reminder:
- Typecheck, targeted lint, all 61 unit tests, and all 14 local browser tests passed.
- Browser coverage verified the ten-question warning placement, successful-save dismissal, accessibility, and horizontal overflow on desktop and mobile.
- The Firebase-mode production build, commit push, and Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 with the expected cache policies for the homepage, question CSV, and deployed JavaScript and CSS assets.

On 2026-07-20, for the free-bank messaging, FAQ links, quiz-intro cleanup, and initial progress scroll, the following passed locally:
- Typecheck, all 57 unit tests, targeted lint, and the production build.
- All 14 local browser tests passed across desktop and mobile, including the exact initial progress-scroll offset, accessibility, and horizontal-overflow checks.
- The Firebase-mode build, commit push, and Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 for `/`, `/faq`, and `/sample-questions`, and the homepage retained `Cache-Control: no-cache`.

On 2026-07-20, for the PMLE overview hierarchy and footer redesign, the following passed locally:
- Typecheck, targeted lint, all 57 unit tests, and the production build.
- All 12 local browser tests across desktop and mobile, including accessibility and horizontal-overflow checks.
- The Firebase-mode build, commit push, and Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 for the homepage and `/sample-questions`, and the homepage retained `Cache-Control: no-cache`.

On 2026-07-20, for the Buy Me a Coffee, FAQ, and sample-question changes, the following passed locally:
- Typecheck, targeted lint, all 57 unit tests, and the production build.
- All 12 local browser tests across desktop and mobile, including FAQ and sample-question routing, route-specific metadata, JSON-LD structured data, sitemap coverage, accessibility, responsive overflow, and returning to practice.
- The Firebase-mode production build, commit push, and Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 for `/`, `/faq`, `/sample-questions`, the sitemap, and the question CSV; the sitemap contained all three public routes, and the homepage and CSV retained `Cache-Control: no-cache`.

On 2026-07-19, for the SEO metadata and favicon release, the following passed:
- Typecheck, targeted lint, all 55 unit tests, and the production build.
- All 8 local browser tests across desktop and mobile, including new checks for canonical/search metadata, the favicon, `robots.txt`, and `sitemap.xml`.
- The Firebase-mode build, remote commit push, and production Hosting deployment.
- Live smoke tests for the page metadata, canonical URL, root `no-cache` policy, favicon, `robots.txt`, and `sitemap.xml`.
- Repository-wide lint remains blocked because separate ignored question-review tooling has populated `.tmp/uv-cache` with third-party JavaScript that ESLint scans; changed source and test files pass targeted lint.

On 2026-07-17, for the question feedback release, the following passed:
- Typecheck, lint, unit tests, and production build checks.
- Firestore security rules testing on local emulator.
- Remote Git commit push and complete Hosting/Rules deployment.
- Smoke tests verified correct cache headers and asset responses.

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
