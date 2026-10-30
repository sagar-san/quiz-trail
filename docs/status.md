# Current status

Last reviewed: 2026-10-30

## Ready for approval: certification catalog and Agentic AI preview

- Implemented locally; production has **not** been deployed or changed during this work. The last recorded production release in the prior handoff was `dedb92f`; verify the deployed state before releasing.
- Homepage now says “GCP AI Certification practice,” with PMLE available and Agentic AI coming soon. Neutral surfaces and blue actions replace the green theme.
- PMLE keeps its existing URLs, permanent IDs, Firestore document, and browser keys. No progress migration is needed. Agentic AI uses separate certification-scoped progress; reset is scoped and account deletion enumerates all child progress documents. Certification switching waits for pending answer/bookmark writes.
- Agentic AI private route: `/practice/?cert=agentic-ai`. Firestore rules require the verified Google identity `ssanghani@gmail.com` to read its protected bank. Client checks are presentation only. Default local mode does not bypass access; use emulators for preview testing.
- Private repository: supplied folder organized into `agentic-ai-questions/`, preserving 150 PAA questions and their content. PMLE remains in `questions/`. Tooling selects banks with `QUESTION_BANK_ID`; feedback supports both prefixes. Private publication is dry-run by default and uses `privateQuestionBanks/agentic-ai`, never the public bucket.
- The pre-existing private `questions/PMLE-0011.json` edit was preserved and is excluded from these commits. Imported Agentic AI content was schema-validated, not independently fact-checked in this task.

## Verification

- Public typecheck, targeted ESLint across src/tests/e2e and Vite config, 74 unit/component tests, Firebase Auth emulator test, and 17 Firestore rule/storage tests passed.
- All 22 desktop/mobile local browser tests and four emulator browser flows passed. Coverage includes the catalog's accessibility/overflow, legacy PMLE sign-in/progress, private guest/non-owner denial, owner bank decryption, save/restore, and certification switching. Rules tests additionally deny unverified/non-Google identities and client bank writes, and verify reset/account-wide cleanup isolation.
- Firebase-mode production build passed. Homepage visually inspected in the in-app browser.
- Private typecheck, 20 tests, and preflight for both banks passed: PMLE 409 source / 407 active / 2 retired; Agentic AI 150 source / active, zero invalid rows and zero duplicate candidates. Private publication dry run succeeded with a 235,984-byte base64 asset. No remote publication ran.
- Repository-wide lint was not run because prior handoffs identify ignored third-party cache files as a blocker; all application/test sources passed targeted lint.

## Next steps and cautions

- Obtain explicit approval for production Firestore rules, private-bank publication, and Hosting deployment; follow `docs/release-runbook.md` for order and smoke checks.
- Do not publish Agentic AI to the public Cloud Storage bucket or embed its content in the frontend. The publisher enforces a 900,000-byte encoded budget for single-document delivery.
- Existing feedback-retention behavior is unchanged. An older Hosting rollback does not know about certification child documents during account deletion; account for this if rolling back.
- Verify local process state when resuming; do not assume dev servers or emulators remain running.
