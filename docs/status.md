# Current status

Last reviewed: 2026-10-30

## Current production release

- With explicit product-owner approval, deployed Firebase Hosting from frontend commit `5e5d55d` to https://quiz-trail.web.app/. All requested homepage, navigation, FAQ, sign-in, typography, and tip-link updates are live. No rules, question-bank data, or user-progress migration was changed in this release.
- Restored Buy Me a Coffee links are live in public-page and practice footers. Larger contribution panels, Settings support controls, and GitHub links remain in debug mode.
- Homepage sign-in stays on the certification catalog. The verified preview owner sees a PAA preview link. Public Agentic Architect practice has a grey disabled button. The homepage footer has one FAQ link; the FAQ page and certification entries lead to the exam-specific FAQs. Practice and sample typography match the homepage.
- General product questions live at `/faq/`, PMLE questions at `/pmle/faq/`, and PAA questions at `/agentic-ai/faq/`. Summaries use `/practice/?view=summary` and `/practice/?cert=agentic-ai&view=summary`; PAA practice and summary remain restricted.

## Access verification

- Live Firestore rules exactly match the tested committed source. Reading `privateQuestionBanks/agentic-ai` requires the verified Google identity `ssanghani@gmail.com`. Guests, other users, unverified identities, non-Google providers, collection listing, and client writes are denied. The client gate is presentation only.
- Firebase Rules API simulations against the live rule source passed guest denial, ordinary Google-user denial, unverified-owner denial, and verified Google-owner allowance. Direct unauthenticated reads returned HTTP 403 before and after the earlier full release, and again after the latest tip-link deployment.
- Emulator browser tests passed actual sign-in, private-bank decryption for the preview owner, denial for other users, saved answers/bookmarks, certification switching, and independent summaries. Live owner sign-in and account mutations were not exercised; the production browser smoke test used a guest session.

## Release verification

- Latest tip-link release: typecheck, 76 unit/component tests, 24 desktop/mobile browser checks, and the six-entry Firebase-mode build passed. The browser checks include visible tip links across public pages and practice, with maintainer support controls still hidden.
- The earlier full release also passed one Auth emulator test, 17 Firestore rules/storage tests, and five Firebase emulator browser flows. Those suites were not rerun for the tip-link-only change; authentication, rules, data, and private-bank access did not change.
- ESLint passed across the repository with ignored local cache/tool directories (`.tmp`, `.agents`, `.codex`) excluded. Targeted lint of application/test sources and Vite configuration also passed.
- Confirmed Firebase account, project `quiz-trail`, project number `724933345983`, production alias, frontend configuration, clean working tree, and pushed release commit before deployment.
- All six production pages returned HTTP 200 with `no-cache`; served HTML and referenced JS/CSS matched the release build byte-for-byte. Unknown routes returned 404. The PMLE encrypted bank returned HTTP 200 with its expected one-hour cache and production-origin CORS header.
- In-app browser verified the restored tip link in the live homepage footer. The earlier full release also verified the signed-out PAA gate, PMLE guest answer grading, and guest reset on reload. No signed-in production progress was changed.

## Preserved bank state and cautions

- The previous approved multi-certification release deployed the current Firestore rules from `e035664` and published the private bank from private commit `4892a87`. PMLE retains legacy URLs, permanent IDs, Firestore location, and browser keys; PAA uses separate certification-scoped progress. Reset is scoped and account deletion enumerates certification children.
- The private repository contains 150 PAA source questions in `agentic-ai-questions/`. Its pre-existing human edit to `questions/PMLE-0011.json` remains outside these releases. Question-bank preflight was not rerun for this frontend-only release; the earlier publication passed preflight for both banks. Imported PAA content has not been independently fact-checked in this work.
- Never publish PAA to the public Cloud Storage bucket or include its content in frontend assets. The private publisher enforces a 900,000-byte encoded budget. Existing feedback retention is unchanged.
- Older Hosting rollbacks do not know about certification child documents during account deletion. Preserve the current account-deletion behavior and restrictive rules when planning rollback.
- Session complete: all requested updates are committed, pushed, and deployed; no pending release work. Future production changes require fresh product-owner approval. Verify local process state when resuming; do not assume previews or emulators remain running.
