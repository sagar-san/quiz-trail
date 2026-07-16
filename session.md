# Session handoff

Last updated: 2026-07-16

## Current status

- Phase 1 local MVP is implemented on `main`.
- Product owner granted the Phase 2 development GO on 2026-07-16.
- Phase 2 Firebase foundation is committed on `main`: SDK/tooling dependencies, validated web configuration, explicit emulator wiring, project alias, Hosting configuration, restrictive Firestore rules, and emulator-backed rules tests.
- Phase 2 authentication and Firestore persistence are committed on `main`: mode-based dependency selection, persistent Firebase Google authentication, signed-out/signed-in UI, actionable auth errors, dirty-progress sign-out confirmation, transactional cloud saves, stale-write rejection, cloud reset, and cross-session resume.
- No Firebase deployment or staging data write has been performed. Continue to require separate approval for production deployment, billing changes, App Check enforcement, OAuth consent changes, domain verification, or other console-sensitive actions.
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
- Progress saves only when Save Progress is selected. Local mode writes browser `localStorage`; Firebase modes write the authenticated user's Firestore document.
- The introductory headline is intentionally restrained and inline. “Keep moving forward.” is smaller than “One question at a time.”
- Long question prompts use readable body-sized text rather than large heading typography.
- Datastore mode defaults to `local` when `VITE_DATA_MODE` is blank or omitted, keeping a fresh checkout runnable without Firebase or Java. The only other valid values are `firebase-emulator` and `firebase`.

## Recent work

- Added `FirestoreProgressStore` for `userProgress/{uid}`. It validates loaded documents, remembers each UID's loaded revision, writes complete progress in transactions with server timestamps, rejects stale devices, and deletes only the requested UID during reset.
- Replaced Firebase mode's temporary browser store with Firestore while preserving the default local mode and the shared `ProgressStore` contract.
- Added five Firestore adapter emulator tests covering new-user save/resume, revision increments, stale-device rejection, UID-isolated reset/fresh save, malformed documents, and required load/UID boundaries.
- Added a full Firebase emulator browser test proving new Google-emulator sign-in, real CSV answer, Firestore save, sign-out, sign-in as the same identity, and restored progress.
- Moved local Hosting emulator from port 5000 to 5002 because macOS Control Center/AirPlay reserves port 5000 on this machine.
- Expanded `AuthService` into an observable sign-in/sign-out contract, added `FirebaseAuthService` with Google popup auth and browser-local session persistence, and kept `LocalAuthService` automatic for the default local mode.
- Added signed-out, signed-in identity, mode badge, sign-out, auth failure, and unsaved-progress warning behavior to the application.
- Added mode-based dependency construction with lazy Firebase imports. Local mode selects browser storage; Firebase modes select authenticated Firestore persistence.
- Added an Auth emulator integration test proving UID issuance, auth-state observation, and sign-out, plus component tests for sign-in and dirty sign-out behavior.
- Installed `firebase`, `firebase-tools`, and `@firebase/rules-unit-testing`; the shipped production dependency audit is clean. Moderate audit findings are limited to transitive Firebase CLI development dependencies.
- Added a single validated `VITE_DATA_MODE` selector with a safe `local` default. Firebase initialization is lazy, refuses to run in local mode, and targets Auth on 9099 and Firestore on 8080 only in `firebase-emulator` mode.
- Added Firebase project/Hosting/emulator configuration, the explicit `staging` alias for `quiz-trail`, and cache headers for hashed assets, `index.html`, and the canonical CSV.
- Added default-deny Firestore rules for `userProgress/{uid}` with ownership, allowed-field, schema, size, timestamp, and revision checks.
- Added emulator-backed tests proving unauthenticated and cross-user access denial, own-document CRUD, and invalid-field/schema rejection.
- Installed Homebrew `openjdk@21` with product-owner approval for the Firestore emulator. Repository scripts locate it without `sudo` or shell-profile changes.
- Added repository session-continuity instructions to `Agents.md`.
- Added Fisher–Yates per-load question shuffling and a deterministic unit test.
- Updated browser tests so they do not assume a fixed first question or correct first option.
- Refined introductory and question-prompt typography based on product-owner feedback.
- Fixed the refresh bug where saved `lastQuestionId` overrode the newly shuffled first question. Saved outcomes and bookmarks restore, but each reload starts from the new shuffled order.
- Added persistent browser filter preferences with a safe Unanswered fallback.

## Verification

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass — 39 tests across 10 test files
- `npm run test:auth`: pass — Auth emulator session lifecycle
- `npm run test:rules`: pass — 9 Firestore rules and adapter tests against the local emulator
- Latest full coverage gate before the filter-preference addition: pass — 26 tests, 92.24% line coverage
- `npm run build`: pass
- `npm run e2e`: pass — 4 Chromium tests across desktop and mobile, including accessibility and horizontal-overflow checks
- `npm run e2e:firebase`: pass — emulator sign-in, Firestore save, sign-out/in, and restore
- CSV preflight: 339 valid rows; 334 single-choice, 5 multiple-choice; 0 invalid rows

## Known limitations

- Phase 1 progress is browser/device-local and disappears if site data is cleared.
- Clicking Previous or Next changes the saved return point and therefore marks progress dirty, although that return point no longer overrides the next page load's shuffled start.
- Browser unload warnings are best-effort; reload should not warn when the UI still says “Progress saved.”
- PayPal is configured locally and will be available after the app restarts; Venmo remains hidden until a valid URL is supplied.

## Recommended next steps

1. Product owner reviews local mode and the Firebase-emulator sign-in/save/resume flow.
2. Add focused UI coverage for stale-write recovery guidance and cloud reset failure behavior if review finds the current messages insufficient.
3. After approval, perform the first limited staging verification with real Google sign-in and Firestore; do not deploy or alter console configuration without the applicable approval.
4. Continue to require separate approval for production deployment, billing changes, App Check enforcement, OAuth consent changes, domain verification, or other console-sensitive actions.
