# Quiz Trail

Quiz Trail is a focused, responsive PMLE practice app. It loads the canonical CSV question bank in the browser, supports single- and multiple-choice questions, gives immediate feedback, filters progress, and explicitly saves a compact progress record.

The current bank contains 339 questions and is expected to grow toward 500. Phase 1 local persistence is complete. Phase 2 Firebase Authentication and Firestore integration is in progress, beginning with local emulators and restrictive security rules.

## Prerequisites

- Node.js 22 LTS (`.nvmrc` is included)
- npm
- Java 21 or newer for the Firestore emulator
- Chromium installed for Playwright (`npx playwright install chromium`)

## Setup

```bash
nvm use
npm ci
cp .env.example .env
npm run dev
```

Contribution links are optional. Set `VITE_PAYPAL_URL` and `VITE_VENMO_URL` to valid HTTP(S) URLs to display them; blank or invalid values are hidden. Firebase variable names are documented in `.env.example`; real environment values stay in ignored environment files.

`VITE_DATA_MODE` defaults to `local`, including when it is omitted. A fresh checkout therefore needs no Firebase configuration, Java runtime, emulator, or account to run the quiz. The other accepted values are `firebase-emulator` and `firebase`; their application adapters are being added during Phase 2.

## Commands

```bash
npm run preflight       # validate and summarize the canonical CSV
npm run dev:firebase    # run Vite against already-running Firebase emulators
npm run typecheck
npm run lint
npm run test
npm run test:auth      # test authentication lifecycle against Auth emulator
npm run test:rules     # start Firestore emulator and test security rules
npm run test:coverage
npm run build
npm run e2e
npm run e2e:firebase   # with emulators + dev:firebase already running
npm run emulators      # Auth, Firestore, Hosting, and Emulator UI
```

The local services use Auth `9099`, Firestore `8080`, Hosting `5002`, and Emulator UI `4000`. Hosting uses `5002` because macOS commonly reserves `5000` for AirPlay Receiver.

Set `VITE_DATA_MODE=firebase-emulator` when running Firebase application adapters against local emulators. `VITE_DATA_MODE=firebase` selects the configured real Firebase project. Firebase initialization refuses to run in the default `local` mode, preventing an accidental cloud connection. The committed `staging` Firebase alias points to project `quiz-trail`; deployment is always a separate, explicitly approved operation.

Firebase modes use Google authentication with browser-persistent Firebase sessions and store one compact Firestore document at `userProgress/{uid}`. Saves are explicit. Transactional revision checks stop an older tab or device from silently overwriting newer progress.

On Apple Silicon, the emulator commands automatically include Homebrew's `openjdk@21` location. Other platforms should make a Java 21+ `java` executable available on `PATH`.

## Question bank

`public/data/questions.csv` is the only application data source. The root-level `quiz-bank.csv` is not loaded by the app and should not be edited as a second source.

The required headers are exactly:

```text
question_id,question_type,question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,reference_url,chatgpt_verified
```

- `question_id` is permanent and unique. Never reuse an existing ID for different content.
- `question_type` is `single_choice` or `multiple_choice`.
- A single-choice answer is one key such as `A`; a multiple-choice answer is a comma-separated set such as `A,D`.
- Two or more nonblank options are required. Options A–E are supported.
- `correct_answer` must reference nonblank options.
- `question`, `explanation`, and a valid answer are required.
- `reference_url` may be blank; when present it must use HTTP(S).
- `chatgpt_verified` may be `TRUE`, `FALSE`, or blank.
- Any invalid row rejects the entire bank so learners never receive a silently partial dataset.

Run `npm run preflight` after every CSV change. The browser computes a SHA-256-derived bank version from the exact deployed bytes.

## Architecture

The UI dispatches actions to a pure quiz reducer and reads derived selectors. CSV parsing, persistence, and identity are adapters behind narrow contracts. React components never access `localStorage` or Firestore directly. This seam allows Phase 2 to replace local identity and storage with Firebase Authentication and Firestore without rewriting the quiz domain.

Progress stores only outcomes keyed by stable question ID, saved-for-later IDs, the last question ID, schema version, and question-bank version. It never stores question text or explanations.

## Phase 1 persistence limitations

- Progress stays in the current browser and device.
- Answers remain in memory until **Save progress** is selected.
- Reloading with unsaved changes restores the last explicitly saved state.
- Clearing browser site data removes saved progress.
- Browser unload warnings are best-effort and may not appear on every mobile browser.
- There is no account or cross-device resume until the separately approved Phase 2.

## Implementation notes

- The initial view is **Unanswered**. A newly answered question remains visible long enough to read its feedback before the learner navigates.
- The active filter is saved immediately as a browser preference and restored after refresh; this is independent from the explicit progress-save action.
- Question order is shuffled once on every page load and remains stable for that tab session. Saved outcomes and bookmarks are restored by permanent question ID, but the prior return point does not override the new shuffled starting question.
- Revisiting an answered question allows another submission; the most recent outcome replaces the prior outcome.
- Navigation changes the saved return point and therefore marks progress dirty.
- The app uses local system fonts and needs no network after dependencies and the CSV are present.
- `public/data/questions.csv` currently preflights as 339 valid rows: 334 single-choice and 5 multiple-choice.
