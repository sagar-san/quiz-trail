# Development guide

## Prerequisites

- Node.js 22 LTS (`.nvmrc` is included)
- npm
- Java 21 or newer when running the Firestore emulator
- Chromium for Playwright browser tests (`npx playwright install chromium`)

## Environment

Copy `.env.example` to an ignored environment file when Firebase or contribution-link configuration is needed. Never commit real environment values.

`VITE_DATA_MODE` accepts:

- `local` — the default; uses browser `localStorage` and needs no Firebase configuration
- `firebase-emulator` — uses local Firebase Authentication and Firestore emulators
- `firebase` — uses the configured Firebase project

Clone the private `quiz-trail-question-bank` repository beside this application
repository at `../quiz-trail-question-bank/`. Vite imports the intentionally
public AES decryption key from that repository at build time. Production downloads the encrypted bank directly from its public Cloud Storage
URL. The development server fetches and decrypts that same public PMLE asset
through `/__dev/question-bank.csv`, allowing HTTP LAN previews without bucket
CORS or browser secure-context failures. This endpoint is absent from production
builds and never serves the private PAA bank or authored source files.

The Buy Me a Coffee footer link is public. In `?debug=true` maintainer mode, the app also reveals its larger contribution panel, Settings support controls, and GitHub links. The Buy Me a Coffee link defaults to the project's support page and can be overridden with a valid HTTP(S) `VITE_BUY_ME_A_COFFEE_URL`; a valid `VITE_VENMO_URL` is also displayed when configured. Ordinary learner visits show only the footer tip link; blank or invalid optional URLs keep the corresponding additional monetary controls hidden in debug mode.

## Commands

```bash
npm run dev             # local-storage mode
npm run emulators       # Auth, Firestore, Hosting, and Emulator UI
npm run dev:firebase    # app connected to already-running emulators
npm run preflight       # validate and summarize the question bank
npm run typecheck
npm run lint
npm run test
npm run test:auth       # Auth emulator integration test
npm run test:rules      # Firestore rules and adapter tests
npm run test:coverage
npm run build
npm run e2e
npm run e2e:firebase    # emulators and dev:firebase must already be running
```

`npm run preflight` delegates to the sibling private repository. Candidate
directory or generated-CSV selection and all source validation remain
private-repository concerns.
Duplicate-detector unit tests and a duplicate-only report can be run there with
`npm test` and `npm run duplicates`.

The local public landing page is `/`; the React practice application is `/practice/`. The general FAQ is `/faq/`. PMLE resources are `/pmle/faq/`, `/sample-questions/`, and `/practice/?view=summary`. PAA has a public FAQ at `/agentic-ai/faq/` and a signed-in summary at `/practice/?cert=agentic-ai&view=summary`.

Question-feedback download and local review are owned by the sibling private
question-bank repository. Run its `npm run feedback:download` command before
opening its local editor. The public application repository does not store
downloaded learner feedback or reviewer credentials.

Local emulator ports:

| Service | Port |
|---|---:|
| Emulator UI | 4000 |
| Firebase Hosting | 5002 |
| Firestore | 8080 |
| Authentication | 9099 |

Hosting uses port 5002 because macOS commonly reserves port 5000 for AirPlay Receiver. On Apple Silicon, repository emulator scripts include Homebrew's `openjdk@21` path automatically. Other platforms need Java 21+ available on `PATH`.

## Architecture

See [`architecture.md`](architecture.md) for the implemented component boundaries, state model, persistence contract, authentication flow, and Firebase design. Development commands and environment setup remain owned by this guide.

## Firebase and deployment

The committed `production` Firebase alias points to the live `quiz-trail` project. Local emulators are the development environment; there is intentionally no separate staging project for this small free app. Firebase initialization is disabled in default local mode to prevent accidental cloud connections.

Build the cloud version with:

```bash
VITE_DATA_MODE=firebase npm run build
```

Deployment requires an authenticated Firebase CLI account with access to the target project. Confirm the authenticated account and exact project before deploying. Production deployment, billing changes, App Check enforcement, OAuth changes, and domain changes remain explicit approval operations.

The public production site is [quiz-trail.web.app](https://quiz-trail.web.app).

## Certification development

`/practice/` and `?cert=pmle` use legacy PMLE storage. `?cert=agentic-ai` uses the protected Firestore bank and requires a verified Google account in Firebase modes. Default local mode shows a clear Firebase-mode requirement for PAA instead of loading the PMLE bank. Emulator browser tests seed a synthetic encrypted PAA bank and verify ordinary-learner access, sign-in gating, separate progress and discussion. `PLAYWRIGHT_BASE_URL` can override their base URL. Never run the destructive browser setup against a developer's populated emulator: use an isolated Auth instance and Firestore namespace as described in current status.
