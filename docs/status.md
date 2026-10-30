# Current status

Last reviewed: 2026-10-30

## Pending Hosting update: official exam title and sample typography

- Updated learner-facing titles, homepage metadata, and review-prompt context to the official “Professional Agentic Architect” name, with PAA as the short label. Internal `agentic-ai` routes and storage keys are unchanged.
- Sample-page typography now uses the homepage’s shared heading weight, lighter question headings, muted kicker, and monospace question labels. Four targeted desktop/mobile browser checks and the Firebase-mode build passed; visually reviewed the local sample page.
- These display corrections are not yet deployed; the previous release below remains live. Public typecheck, targeted lint, 74 unit tests, 22 desktop/mobile browser tests, and Firebase-mode build passed; private typecheck and 20 tests passed. Auth/rules tests were not rerun because access and persistence logic are unchanged.

## Live: certification catalog and Agentic AI preview

- With explicit product-owner approval on 2026-10-30, deployed Firestore rules and Firebase Hosting from frontend commit `e035664`, and published the private Agentic AI bank from private commit `4892a87`. Production is https://quiz-trail.web.app/. No user-progress migration or PMLE asset publication was performed.
- Homepage now says “GCP AI Certification practice,” with PMLE available and Agentic AI coming soon. Neutral surfaces and blue actions replace the green theme.
- PMLE keeps its existing URLs, permanent IDs, Firestore document, and browser keys. No progress migration is needed. Agentic AI uses separate certification-scoped progress; reset is scoped and account deletion enumerates all child progress documents. Certification switching waits for pending answer/bookmark writes.
- Agentic AI private route: `/practice/?cert=agentic-ai`. Firestore rules require the verified Google identity `ssanghani@gmail.com` to read its protected bank. Client checks are presentation only. Default local mode does not bypass access; use emulators for preview testing.
- Private repository: supplied folder organized into `agentic-ai-questions/`, preserving 150 PAA questions and their content. PMLE remains in `questions/`. Tooling selects banks with `QUESTION_BANK_ID`; feedback supports both prefixes. Private publication is dry-run by default and uses `privateQuestionBanks/agentic-ai`, never the public bucket.
- The pre-existing private `questions/PMLE-0011.json` edit was preserved and is excluded from these commits. Imported Agentic AI content was schema-validated, not independently fact-checked in this task.

## Verification

- Public typecheck, targeted ESLint across src/tests/e2e and Vite config, 74 unit/component tests, Firebase Auth emulator test, and 17 Firestore rule/storage tests passed.
- All 22 desktop/mobile local browser tests and four emulator browser flows passed. Coverage includes the catalog's accessibility/overflow, legacy PMLE sign-in/progress, private guest/non-owner denial, owner bank decryption, save/restore, and certification switching. Rules tests additionally deny unverified/non-Google identities and client bank writes, and verify reset/account-wide cleanup isolation.
- Firebase-mode production build passed. Homepage visually inspected in the in-app browser.
- Private typecheck, 20 tests, and preflight for both banks passed: PMLE 409 source / 407 active / 2 retired; Agentic AI 150 source / active, zero invalid rows and zero duplicate candidates. Private publication succeeded with a 235,984-byte base64 asset; an authenticated read verified exact equality with the locally generated encrypted payload.
- Repository-wide lint was not run because prior handoffs identify ignored third-party cache files as a blocker; all application/test sources passed targeted lint.

## Production verification (2026-10-30)

- Confirmed the approved owner account, project quiz-trail, number 724933345983, and production alias before deployment.
- Deployed rules exactly match the tested source. Firebase Rules API tests against that deployed source passed guest denial, ordinary Google-user denial, unverified-owner denial, and verified Google-owner allowance. Unauthenticated HTTP reads returned 403 both before and after publication.
- All four public routes returned HTTP 200 with no-cache; unknown routes returned 404. Deployed practice JavaScript/CSS matched the Firebase-mode build byte-for-byte. PMLE bank remained HTTP 200 with its one-hour cache and production-origin CORS header.
- In-app browser verified the live catalog, signed-out private-preview gate, and a ten-question PMLE guest session with successful answer grading. No signed-in progress was modified. Live owner sign-in/account operations were not exercised; these flows passed emulator tests in the implementation turn.

## Next steps and cautions

- Release is complete. Future production changes still require their own explicit approval. The preview owner can sign in at https://quiz-trail.web.app/practice/?cert=agentic-ai.
- Do not publish Agentic AI to the public Cloud Storage bucket or embed its content in the frontend. The publisher enforces a 900,000-byte encoded budget for single-document delivery.
- Existing feedback-retention behavior is unchanged. An older Hosting rollback does not know about certification child documents during account deletion; account for this if rolling back.
- Verify local process state when resuming; do not assume dev servers or emulators remain running.
