# Current status

Last reviewed: 2026-10-30

## Pending Hosting update: homepage sign-in and certification UI

- Homepage Sign in now authenticates in place and stays at the catalog. The verified preview owner sees a direct PAA practice link; ordinary accounts do not. The PMLE-specific continue link retains its explicit destination. Local mode is labeled without offering Google sign-in.
- Practice navigation now matches the homepage's plain text styling. Home replaces Certifications; certification-specific FAQ and summary links are in the footer and each homepage entry. FAQ/sample headers also use simple, clearly scoped links.
- Added a public PAA FAQ at `/agentic-ai/faq/`. PMLE and PAA summaries have direct `view=summary` links, certification-specific headings, and browser history support. The PAA summary retains the existing owner-only gate. Existing URLs, authentication, and persisted keys are unchanged.
- Included earlier pending corrections: the official “Professional Agentic Architect” title/PAA label, and sample typography matching the homepage.
- Verification: typecheck, targeted ESLint, 76 unit/component tests, 24 desktop/mobile browser checks, one Auth emulator test, 17 Firestore tests, five Firebase emulator browser flows, and Firebase-mode build passed. Browser checks cover homepage sign-in staying in place, session restoration, shared identity with practice, sign-out, PAA owner-only access, and independent summary counts. Visually reviewed the homepage in the in-app browser.
- These updates are committed for review but not deployed. Hosting deployment still requires explicit product-owner approval; no new live rules, data, or bank publication is needed. The previous release below remains live.

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
