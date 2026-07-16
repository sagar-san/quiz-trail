# Session handoff

Last updated: 2026-07-16

## Current status

- Phase 1 local MVP is implemented on `main` and ready for product-owner review.
- Phase 2 has not started. Do not add Firebase/GCP work without the product owner's explicit approval.
- Product owner ended the session before granting the Phase 2 development GO. Ask again before installing Firebase dependencies, implementing cloud integration, or using the staging project from application code.
- Phase 2 setup input received: staging Firebase/GCP project ID `quiz-trail`; project number `724933345983`.
- Staging Firebase web app registered. Configuration received (API key intentionally omitted):
  - `authDomain`: `quiz-trail.firebaseapp.com`
  - `projectId`: `quiz-trail`
  - `storageBucket`: `quiz-trail.firebasestorage.app`
  - `messagingSenderId`: `724933345983`
  - `appId`: `1:724933345983:web:ce7254b42b50b5f2b93c0a`
  - `measurementId`: `G-C6KV642866`
  - Web API key received and stored in gitignored `.env.local`; its value is intentionally omitted from this handoff.
- Google Authentication provider enabled for staging; project support email selected; public-facing project name set to `quiz-trail`.
- Cloud Firestore enabled for staging using Standard edition in `us-west1` (Oregon), initialized in Production mode with restrictive rules.
- Firebase Authentication authorized domains currently use the defaults: `localhost`, `quiz-trail.firebaseapp.com`, and `quiz-trail.web.app`.
- Use Firebase default domains for staging; custom and production domains are deferred until later.
- Contribution links: PayPal set to `https://paypal.me/SagarSanghani`; Venmo deferred and remains hidden.
- Deferred console and production-readiness work is tracked in `TODO.md`, including App Check monitoring before enforcement, a separate production project/domain, billing ownership and budget alerts, and optional Venmo setup.
- The app was last started with `npm run dev -- --host 127.0.0.1 --port 5173`; restart it if that process is no longer running.
- `public/data/questions.csv` is the canonical question source. The legacy root `quiz-bank.csv` is ignored and not loaded.

## Product decisions

- Current bank: 339 valid questions, expected to grow toward approximately 500.
- Support both `single_choice` and `multiple_choice`; multiple choice uses exact-set grading.
- Keep answer choices in their original A–E order.
- Shuffle question order once on every page load. The shuffled order remains stable for that tab session, while saved progress stays keyed by permanent question IDs.
- Initial filter is Unanswered. A newly answered question remains visible long enough to read its feedback before navigation.
- The active filter is saved immediately in a separate browser preference and restored on refresh; it does not require Save Progress.
- Progress saves explicitly to browser `localStorage`; only the last explicitly saved state survives reload.
- The introductory headline is intentionally restrained and inline. “Keep moving forward.” is smaller than “One question at a time.”
- Long question prompts use readable body-sized text rather than large heading typography.

## Recent work

- Added repository session-continuity instructions to `Agents.md`.
- Added Fisher–Yates per-load question shuffling and a deterministic unit test.
- Updated browser tests so they do not assume a fixed first question or correct first option.
- Refined introductory and question-prompt typography based on product-owner feedback.
- Fixed the refresh bug where saved `lastQuestionId` overrode the newly shuffled first question. Saved outcomes and bookmarks restore, but each reload starts from the new shuffled order.
- Added persistent browser filter preferences with a safe Unanswered fallback.

## Verification

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass — 28 tests across 7 test files
- Latest full coverage gate before the filter-preference addition: pass — 26 tests, 92.24% line coverage
- `npm run build`: pass
- `npm run e2e`: pass — 4 Chromium tests across desktop and mobile, including accessibility and horizontal-overflow checks
- CSV preflight: 339 valid rows; 334 single-choice, 5 multiple-choice; 0 invalid rows

## Known limitations

- Phase 1 progress is browser/device-local and disappears if site data is cleared.
- Clicking Previous or Next changes the saved return point and therefore marks progress dirty, although that return point no longer overrides the next page load's shuffled start.
- Browser unload warnings are best-effort; reload should not warn when the UI still says “Progress saved.”
- PayPal is configured locally and will be available after the app restarts; Venmo remains hidden until a valid URL is supplied.

## Recommended next steps

1. Ask the product owner for an explicit Phase 2 development GO.
2. After approval, begin Phase 2 against local Firebase emulators and the configured staging project.
3. Continue to require separate approval for production deployment, billing changes, App Check enforcement, OAuth consent changes, domain verification, or other console-sensitive actions.
