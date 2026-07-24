# Current status

Last reviewed: 2026-07-24

## Active state

- The production application is live at <https://quiz-trail.web.app> from commit `d1a39ef` (`add static SEO pages`).
- The Git remote is `git@github.com:Ameenota/quiz-trail.git` and the Firebase production project is `quiz-trail`.
- Production includes Google sign-in, explicit Firestore progress saving, learner analytics, Settings and account deletion, the public PMLE overview, Buy Me a Coffee and GitHub-star support options, a public SEO-focused FAQ at `/faq`, ten curated canonical-bank questions at `/sample-questions`, a post-answer AI review prompt, a Firestore question feedback form, and a collapsed More options menu.
- The canonical question bank contains 408 valid questions: 397 single-choice and 11 multiple-choice.
- The working tree moves the canonical CSV out of the public application repository and reads it from the sibling `quiz-trail-question-bank` directory. Production builds now emit an AES-GCM-encrypted `/data/questions.bin` asset and decrypt it in browser memory. The sibling directory contains the verified CSV copy but still needs to be connected to its private GitHub repository; this change has not been deployed.
- Local browser mode and Firebase emulator mode are the development environments. Do not infer that prior dev servers or emulators are still running; inspect before starting processes.
- Production includes an iOS clipboard reliability fix that replaces the AI review prompt's hanging asynchronous clipboard write with a synchronous selection-based copy. Real-device verification remains pending.
- Production also includes a learner-facing queue cleanup: Unanswered now shows remaining progress against the full bank, All/Incorrect/Saved use descriptive queue positions, and the Outdated filter has been removed while its editorial metadata remains internal.
- Production includes an answered-state cleanup: the separate AI explanation block is replaced by a compact `✨ Copy AI prompt` action beside the reference link, and the existing More-section question feedback form is available to all learners after answering rather than only in debug mode. The copied prompt frames the agent as an instructor guiding a student, requires an independent conclusion before considering the learner or bank answers, groups the bank content as untrusted claims, and supports agree, disagree, ambiguous, outdated, and invalid verdicts.
- Feedback persistence stores one document per question and learner at `questionFeedback/{questionId}/submissions/{uid}`, replaces that learner's earlier report, hides feedback in local mode, prevents learner listing, and uses an Admin SDK script for external review. Existing array-based feedback was intentionally not migrated.
- Production serves static landing, FAQ, and ten-question sample pages; hosts the React/Firebase application at `/practice/`; returns a real 404 for unknown paths; and includes the manually curated `llms.txt` and owner-provided Google Search Console verification file.

## Recent verification

On 2026-07-24, for the external private bank and encrypted production asset:
- The external CSV preflight passed for all 408 questions, and its SHA-256 matched the source before removal from the public working tree.
- Typecheck, targeted lint, all 64 unit/component tests, the Firebase-mode production build, and all 18 local browser tests passed.
- Production-output inspection confirmed the encrypted asset format, exact decrypted/source SHA-256 equality, absence of `dist/data/questions.csv`, and no canonical prompt outside the intentional static sample page.
- A local-mode production preview loaded the encrypted asset and displayed a real question in Chromium; the legacy CSV URL returned HTML rather than bank data. Firebase Hosting is expected to return 404 for that absent path after an approved deployment.

On 2026-07-24, for the static public-page split and curated `llms.txt`:
- Typecheck, targeted lint, all 62 unit/component tests, the Firebase-mode production build, and all 18 local browser tests passed.
- Desktop and mobile visual inspection confirmed the landing and sample pages retain the Quiz Trail visual system, contain one H1, avoid horizontal overflow, and support native answer disclosures.
- The local Hosting emulator returned HTTP 200 for `/`, `/faq/`, `/sample-questions/`, `/practice/`, and `/llms.txt`; served `llms.txt` as plain text; and returned HTTP 404 for an unknown path.
- Repository-wide lint remains blocked by previously recorded third-party JavaScript under `.tmp/uv-cache`; all changed TypeScript files pass targeted lint.
- Commit `d1a39ef` was pushed and the Hosting-only production deployment succeeded. Live smoke tests returned HTTP 200 for all four public routes, the Search Console verification file, and `llms.txt`; the deployed verification and `llms.txt` bodies matched source; and an unknown path returned HTTP 404.

On 2026-07-23, for the refined student-guidance AI review prompt:
- Typecheck, targeted lint, all 64 unit/component tests, the Firebase-mode production build, and all 16 local browser tests passed.
- Commit `e441508` was pushed, and the Hosting-only production deployment succeeded. Live homepage and question-bank smoke checks returned HTTP 200 with `no-cache`, and the deployed JavaScript contained the student-guidance persona, independent-answer isolation, invalid-question verdict, and grouped untrusted question-bank content.

On 2026-07-23, for the independent AI question-review prompt:
- Typecheck, targeted lint, all 64 unit/component tests, the Firebase-mode production build, and all 16 local browser tests passed.
- Repository-wide lint remained blocked only by the previously recorded third-party JavaScript under `.tmp/uv-cache`; the changed source and test files passed targeted lint.
- Commit `a30e1b1` was pushed, and the Hosting-only production deployment succeeded. Live homepage and question-bank smoke checks returned HTTP 200 with `no-cache`, and the deployed JavaScript contained the independent-review, anti-agreement, ambiguity, and untrusted-claim instructions.

On 2026-07-23, for the single-feedback persistence release:
- Typecheck, targeted lint, all 64 unit/component tests, all 13 Firestore rules/storage tests, the Firebase-mode production build, all 16 local browser tests, and the signed-in Firebase emulator browser test passed.
- The Admin SDK feedback exporter connected successfully to the local Firestore emulator and handled an empty result.
- Commit `e361678` was pushed, and the production Hosting and Firestore-rules deployment succeeded. Live homepage and question-bank smoke checks returned HTTP 200 with `no-cache`, and the deployed feedback bundle matched the tested production build by SHA-256.

On 2026-07-23, for the AI prompt action and learner-facing question feedback:
- Typecheck, targeted lint, all 63 unit/component tests, all 9 Firestore rules/storage tests, and the Firebase-mode production build passed.
- All 16 local browser tests passed across desktop and mobile, including the clipboard regression, accessibility, and horizontal-overflow checks.
- An answered question was visually inspected in the in-app browser; the compact reference/copy row fit cleanly and the feedback form appeared in its existing More section without debug mode.
- Commit `e90597a` was pushed and the Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 for the homepage and question CSV with the expected `no-cache` policy, and the deployed JavaScript contained the new AI prompt and learner feedback UI while omitting the removed explanation block.

On 2026-07-23, for the question progress labels and Outdated-filter removal:
- Typecheck, targeted lint, all 63 unit/component tests, and the Firebase-mode production build passed.
- All 16 local browser tests passed across desktop and mobile, including accessibility and horizontal-overflow checks.
- Commit `8ae4b2e` was pushed and the Hosting-only production deployment succeeded. Live smoke checks returned HTTP 200 for the homepage and question CSV with the expected `no-cache` policy, and the deployed JavaScript contained the new queue labels.
- Repository-wide lint remains blocked by third-party JavaScript under `.tmp/uv-cache`; the changed source and test files pass targeted lint.

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
