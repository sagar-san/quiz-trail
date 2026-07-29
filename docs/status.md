# Current status

Last reviewed: 2026-07-29

## Active state

- The production application is live at <https://quiz-trail.web.app> from commit `8d78098`, including editable saved question feedback, the ten-question guest limit, refined public homepage, and Bing site-verification tag.
- Cloud guest sessions receive ten shuffled questions without persistence and place the guest sign-in notice directly above the filters. Signing in discards temporary guest activity, loads the complete bank, and loads account progress. Current source makes the public homepage's returning-learner links open Google sign-in on practice entry; that homepage fix is not yet deployed. The static ten-question page remains a lower-prominence SEO surface.
- Production uses targeted progress persistence: submitting an answer saves only that question, bookmark toggles save only that bookmark, and a small non-blocking status reports answer-save progress or failure.
- The Git remote is `git@github.com:Ameenota/quiz-trail.git` and the Firebase production project is `quiz-trail`.
- Production includes Google sign-in, explicit Firestore progress saving, learner analytics, Settings and account deletion, the public PMLE overview, Buy Me a Coffee and GitHub-star support options, a public SEO-focused FAQ at `/faq`, ten curated canonical-bank questions at `/sample-questions`, a post-answer AI review prompt, a Firestore question feedback form, and a collapsed More options menu.
- The canonical question bank contains 409 source questions: 407 active and 2 retired. The active bank has 396 single-choice and 11 multiple-choice questions.
- The canonical per-question JSON bank and its validation/build tooling live in the sibling
  private `quiz-trail-question-bank` repository at
  `git@github.com:sagar-san/quiz-trail-question-bank.git`. The tooling reports
  exact and near-duplicate prompts and builds the AES-GCM-encrypted
  `questions.bin` asset published independently to the public
  `quiz-trail-question-banks` Cloud Storage bucket. The frontend imports only
  the public key from the sibling repository and decrypts the bucket asset in
  browser memory.
- Local browser mode and Firebase emulator mode are the development environments. Do not infer that prior dev servers or emulators are still running; inspect before starting processes.
- Production includes an iOS clipboard reliability fix that replaces the AI review prompt's hanging asynchronous clipboard write with a synchronous selection-based copy. Real-device verification remains pending.
- Production also includes a learner-facing queue cleanup: Unanswered now shows remaining progress against the full bank, All/Incorrect/Saved use descriptive queue positions, and the Outdated filter has been removed while its editorial metadata remains internal.
- Production includes an answered-state cleanup: the separate AI explanation block is replaced by a compact `✨ Copy AI prompt` action beside the reference link, and the existing More-section question feedback form is available to all learners after answering rather than only in debug mode. The copied prompt frames the agent as an instructor guiding a student, requires an independent conclusion before considering the learner or bank answers, groups the bank content as untrusted claims, and supports agree, disagree, ambiguous, outdated, and invalid verdicts.
- Feedback persistence stores one document per question and learner at `questionFeedback/{questionId}/submissions/{uid}`, replaces that learner's earlier report, hides feedback in local mode, prevents learner listing, and uses an Admin SDK script for external review. Opening More lazily loads the learner's existing report into the form for editing; a failed load prevents an unseen report from being overwritten and offers a retry. Existing array-based feedback was intentionally not migrated.
- Production serves static landing, FAQ, and ten-question sample pages; hosts the React/Firebase application at `/practice/`; returns a real 404 for unknown paths; and includes the manually curated `llms.txt` and owner-provided Google Search Console verification file.

## Recent verification

On 2026-07-29, for direct returning-learner sign-in from the homepage:
- The homepage header and saved-progress links now carry a one-time sign-in intent into `/practice/`. The practice app removes that intent before opening Google authentication, remains on the clean practice URL after sign-in, and leaves guest practice plus its retry button available after cancellation or failure.
- Typecheck, targeted lint, all 69 unit/component tests, the Auth emulator test, all 14 Firestore rules/storage tests, the Firebase-mode production build, all 18 local desktop/mobile browser tests, and both Firebase-emulator browser flows passed. The new Firebase flow verifies the homepage link opens authentication, completes sign-in, loads the full quiz, and ends at `/practice/`.
- Corrected the release runbook's stale Firebase browser-test port from 5174 to the configured 5173. No production deployment or live Firebase change was performed.

On 2026-07-28, for learner-visible saved question feedback:
- Opening More after answering now lazily loads the signed-in learner's existing report for that question, keeps saved text visible, and supports editing and replacing the same Firestore document. A failed read disables submission until retry succeeds, preventing an unseen report from being overwritten.
- Typecheck, targeted lint, all 67 unit/component tests, all 14 Firestore rules/storage tests, the signed-in Firebase-emulator browser flow, all 18 local desktop/mobile browser tests, and the Firebase-mode production build passed. Browser coverage verifies an existing report appears, can be updated, and reloads after the question component remounts.
- Commit `8d78098` was pushed and the Hosting-only production deployment succeeded. All four public routes returned HTTP 200 with `no-cache`; the encrypted bank retained its intended one-hour cache and production-origin CORS header. The deployed practice and feedback-store bundles matched the tested build by SHA-256 and contained the saved-feedback, update, retry, and failure-state UI. No Firestore rules, live data, authentication, or other Firebase services were changed.

On 2026-07-28, for the ten-question guest limit and public homepage refinement:
- Anonymous Firebase-mode visitors receive ten questions from the shuffled bank
  without progress, preference, or feedback writes. Signing in resets the guest
  session, loads the complete bank, and restores the account's progress.
- Simplified the public homepage with smaller typography, factual feature copy,
  unboxed feature columns, a plain action row, and a header sign-in link.
- Typecheck, targeted lint, all 65 unit/component tests, the Firebase-mode
  production build, all 18 local desktop/mobile browser tests, and the
  Firebase-emulator guest/sign-in/persistence browser test passed. The focused
  desktop/mobile metadata test also passed after adding Bing verification.
- Hosting-only deployment of `d7871be` succeeded. All four public routes
  returned HTTP 200 with `no-cache`, the live homepage contained the expected
  Bing verification tag, and the encrypted bank returned HTTP 200 with the
  intended one-hour cache and production-origin CORS header. No Firestore
  rules, live data, authentication, or other Firebase services were changed.

On 2026-07-27, for guest practice and the public-entry hierarchy:
- Anonymous Firebase-mode visitors loaded the complete bank, answered and
  bookmarked in memory without progress, preference, or feedback writes, and
  saw session-specific wording instead of saved-status claims. Signing in
  discarded the temporary guest state and loaded the account's Firestore
  progress; signing out returned to a fresh guest session.
- Simplified the practice introduction and public homepage typography and copy,
  removed the duplicated hero statistics card, promoted Try it out and
  sign-in/resume actions, and moved the static sample-question CTA lower on the
  homepage. `/practice/` remains `noindex,follow`; the landing, FAQ, and sample
  pages remain static discovery surfaces.
- Typecheck, targeted lint, all 65 unit/component tests, the Firebase-mode
  production build, all 18 local desktop/mobile browser tests, and the
  Firebase-emulator guest/sign-in/persistence browser test passed. Visual review
  covered the revised desktop homepage and guest practice page. Repository-wide
  lint remains blocked by 19,208 third-party errors under `.tmp/uv-cache`; the
  task-related TypeScript and test files pass lint. No deployment was performed.

On 2026-07-26, for the canonical JSON migration, question tooling, bank
publication, and pending frontend release:
- Replaced the private repository's monolithic authored CSV with 409 canonical
  `questions/PMLE-####.json` files. Deterministic export preserves the existing
  CSV runtime contract; compared with the prior bank, the only logical changes
  are eight unused `chatgpt_verified` casing normalizations from `True` to
  `TRUE`.
- Added the local JSON-backed browser editor and a self-documenting agent CLI
  with get, list, search, dry-run/write patch, validation, and export commands.
  A dry-run and real write against a temporary copy of retired PMLE-0049 passed
  without changing the canonical file.
- Private commit `59c3abf` was pushed. Typecheck, all 13 tooling tests,
  post-commit permanent-ID preflight, deterministic CSV export, and the
  encrypted asset build passed for 409 source questions, 407 active questions,
  2 retired questions, and 0 invalid rows.
- Published the approved encrypted asset to the production question-bank
  bucket. The downloaded object matched the local release candidate by SHA-256
  (`56fac2a78c23af9c3f68571bb115461f1724c3717344dd006a1148f3e1ca7050`)
  and returns HTTP 200 with the intended one-hour cache, binary content type,
  and production-origin CORS policy.
- Frontend typecheck, all 65 unit/component tests, all 18 local desktop/mobile
  browser tests, and the Firebase-mode production build passed. Hosting commit
  `200e094` was deployed, including the pending debug-only reconciliation notice
  behavior from `73dc976`; the live practice bundle matched the tested build by
  SHA-256, and all four public routes returned HTTP 200 with `no-cache`.
- No Firestore rules, live data, authentication, or other Firebase services
  were changed.

On 2026-07-26, for debug-only progress reconciliation details:
- Stale saved question references continue to be removed during reconciliation,
  but the cleanup notice is now visible only with `?debug=true`; real storage
  errors remain learner-visible.
- Typecheck, targeted lint, all 65 unit/component tests, and all 18 local
  desktop/mobile browser tests passed. No production deployment was performed.

On 2026-07-26, for the production question-bank key rotation:
- Rotated the public AES key in private question-bank commit `52a592b`, passed
  its typecheck, all 7 tooling tests, preflight, and encrypted asset build, then
  published the verified 407-question asset to the approved GCS bucket.
- The downloaded production object matched the local encrypted asset by
  SHA-256 and retained the intended one-hour cache plus localhost and production
  CORS policies.
- Frontend commit `f357c14` derives a short cache version from the imported key
  and appends it to the bucket request, preventing a rotated key from reusing a
  cached object associated with the prior key.
- Frontend typecheck, targeted lint, all 64 unit/component tests, all 18 local
  desktop/mobile browser tests against the live GCS object, and the Firebase-mode
  production build passed. The production build contains no question asset.
  Repository-wide lint remains blocked by 19,208 third-party errors under the
  ignored `.tmp/uv-cache`; the task-related files pass lint.
- Firebase Hosting deployment succeeded. Live smoke checks returned HTTP 200
  for all public routes, HTTP 404 for the retired Hosting question path, and
  HTTP 200 with the expected CORS/cache headers for the versioned GCS request.
  The deployed practice bundle matched the tested build by SHA-256. No live
  Firestore data or rules were changed.

On 2026-07-26, for independent Cloud Storage question-bank delivery:
- Removed frontend bank generation and local plaintext middleware. All frontend
  modes now fetch the encrypted asset directly from the approved public bucket;
  the production and normal local origins return the required CORS headers.
- Moved the sole AES key definition into a minimal private-repository module and
  inject it into the frontend bundle at build time. The existing encrypted CSV
  format and runtime parser remain unchanged.
- Exact learner totals remain derived from the loaded bank. Static public copy
  now uses `400+`, so a bank-only publication can change 407 active questions
  to 430 without stale exact claims or a frontend deployment.
- The private bank typecheck, all 7 tooling tests, preflight, and encrypted asset
  build passed. The frontend typecheck, all 64 unit/component tests, production
  build, and all 18 local desktop/mobile browser tests passed. The frontend
  production output contains no question-bank asset.

On 2026-07-26, for the FAQ privacy and storage clarification:
- Updated the visible FAQ and matching JSON-LD to describe saved answer outcomes, bookmarks, basic Google account data, Google/Firebase processing, non-sale and non-advertising sharing, Settings deletion controls, and separately stored voluntary question feedback.
- Typecheck, the production build, the JSON-LD consistency check, and diff checks passed.
- The local browser suite did not reach its assertions because its shared setup still expects `408 questions`; the current application correctly reports 407 active questions. No deployment was performed.

On 2026-07-26, for the corrected stratified-sampling question replacement:
- Retired PMLE-0152 and added PMLE-0409 with the revised prompt, answer B, and an explanation grounded in stratified splitting.
- The private bank typecheck, all 7 tooling tests, and preflight passed for 409 source rows, 407 active rows, 2 retired rows, and no invalid rows.
- The public application typecheck, all 63 unit/component tests, and the production build passed; the encrypted learner asset contains 407 active questions.

On 2026-07-25, for targeted answer and bookmark persistence:
- Typecheck, targeted lint, all 63 unit/component tests, all 13 Firestore rules/store emulator tests, the Firebase-mode production build, and all 18 local browser tests passed.
- Regression coverage confirms a failed answer is not retried by a later question submission, targeted Firestore transactions preserve unrelated answers from other tabs, and submitted answers plus bookmarks restore after reload on desktop and mobile.
- Browser accessibility and horizontal-overflow checks passed. The standard `npm run test:rules` launcher could not start a second Firestore emulator because port 8080 was already occupied; the same rules suite passed directly against that existing local emulator.
- Commit `04bbe9c` was pushed and the Hosting-only production deployment succeeded. Live smoke tests returned HTTP 200 with `no-cache` for all public routes and `/data/questions.bin`; the legacy plaintext CSV returned HTTP 404. The deployed encrypted bank matched the verified build by SHA-256, and the deployed practice bundle contained the targeted saving/success/failure states while omitting the old bulk-save UI strings. No live Firestore data or rules were changed.

On 2026-07-24, for the private question-bank tooling separation:
- The private question-bank repository typecheck and both duplicate-detector
  tests passed; its standalone asset builder validated all 408 rows and emitted
  an encrypted test asset.
- Preflight passed the CSV contract and reported 12 exact duplicate pairs plus
  6 likely near-duplicate pairs for editorial review. No question content was
  changed automatically.
- The public application typecheck, all 64 unit/component tests, targeted Vite
  configuration lint, and the production build passed.
- The production build's encrypted question asset decrypted to the exact source
  CSV bytes, and candidate/baseline comparison arguments continued to work
  through the public repository's delegated `npm run preflight` command.

On 2026-07-24, for the external private bank and encrypted production asset:
- The external CSV preflight passed for all 408 questions, and its SHA-256 matched the source before removal from the public working tree.
- Typecheck, targeted lint, all 64 unit/component tests, the Firebase-mode production build, and all 18 local browser tests passed.
- Production-output inspection confirmed the encrypted asset format, exact decrypted/source SHA-256 equality, absence of `dist/data/questions.csv`, and no canonical prompt outside the intentional static sample page.
- A local-mode production preview loaded the encrypted asset and displayed a real question in Chromium; the legacy CSV URL returned HTML rather than bank data. Firebase Hosting is expected to return 404 for that absent path after an approved deployment.
- Repository-wide lint remained blocked by 19,208 errors in third-party JavaScript under `.tmp/uv-cache`; all changed TypeScript files passed targeted lint.
- Commit `6827bbb` was pushed and the Hosting-only production deployment succeeded. Live smoke tests returned HTTP 200 with `no-cache` for all four public routes and `/data/questions.bin`; the legacy `/data/questions.csv` returned HTTP 404; and the deployed encrypted asset matched the verified production build by SHA-256.

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
