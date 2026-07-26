# Quiz Trail architecture

## System overview

Quiz Trail is a Vite multi-page site. The landing page, FAQ, and ten-question sample page are static HTML for fast, JavaScript-independent discovery. The full practice experience at `/practice/` is a client-rendered React and TypeScript application. The browser loads and decrypts the complete question bank, keeps quiz behavior in a reducer-driven domain model, and accesses identity and persistence through narrow adapters.

```text
private authored bank
          |
          v
 validation + independent encryption/publish
          |
          v
 public Cloud Storage questions.bin
          |
          v
 browser decryption <-> React app <-> quiz reducer/selectors
     |                    |
     v                    v
 AuthService          ProgressStore
     |                    |
 local/Firebase       localStorage/Firestore
```

Firebase Hosting serves the production build. Firebase Authentication supplies Google identity, and Cloud Firestore stores one compact progress document per cloud user.

## Runtime modes

`VITE_DATA_MODE` selects the application's adapters:

| Mode | Identity | Progress store | Intended use |
|---|---|---|---|
| `local` | Automatic `local-browser` identity | Browser `localStorage` | Default local development |
| `firebase-emulator` | Firebase Auth emulator | Firestore emulator | Firebase integration development and tests |
| `firebase` | Google via production Firebase Auth | Production Firestore | Production build |

Firebase modules are dynamically imported only for Firebase modes. Default local development therefore requires no Firebase configuration and does not initialize a cloud connection.

## Application composition

`practice/index.html` loads `src/main.tsx`, which creates runtime dependencies and renders the application. `src/app/createAppDependencies.ts` selects the authentication and persistence adapters. `src/app/App.tsx` coordinates authentication, question loading, reducer state, persistence, views, settings, and account actions.

The primary boundaries are:

- `AuthService`: subscribe to identity and perform sign-in, sign-out, reauthentication, and account deletion.
- `ProgressStore`: load, save, and reset a `UserProgress` snapshot.
- `QuizPreferences`: immediately load and save the active filter independently of progress.
- Question-bank loader/parser: download, decrypt, decode, validate, version, and shuffle the question bank.
- Quiz reducer and selectors: own domain transitions and derived views without depending on Firebase or browser storage.

## Startup and load flow

1. The application resolves the current identity through `AuthService`.
2. Once a user identity exists, it loads `questions.bin` from the public Cloud Storage bucket as bytes.
3. The browser decrypts the asset in memory, decodes UTF-8, validates every row, derives a bank version from the plaintext bytes, and shuffles the questions once.
4. The reducer receives the bank, and the stored filter preference is applied.
5. The selected `ProgressStore` loads saved progress.
6. Saved question IDs are reconciled against the current bank before entering reducer state.

The entire bank is rejected when loading or validation fails; the application does not silently run with a partial dataset.

## Domain and state model

`QuizQuestion` contains stable identity, question type, choices, correct answers, explanation, optional reference data, learner analytics categories, and internal editorial metadata.

`QuizState` contains:

- the loaded and shuffled questions plus bank version;
- latest correctness keyed by question ID;
- saved-for-later question IDs;
- the current question and active filter;
- user-facing storage errors surfaced by targeted answer and bookmark operations;
- an optional reconciliation notice.

The reducer owns state transitions such as bank load, answer submission, bookmark changes, filter and question navigation, progress load, and reset. Selectors derive filtered queues, counts, and analytics inputs.

The active question may be temporarily prepended to a filtered result so a newly submitted answer remains visible long enough for feedback.

## Progress persistence

The shared persisted contract is schema version 1:

```ts
interface UserProgress {
  schemaVersion: 1;
  questionBankVersion: string;
  progress: Record<string, boolean>;
  savedForLater: string[];
  lastQuestionId: string | null;
}
```

`progress` records only the latest correct/incorrect outcome. It does not record attempt counts or history. `lastQuestionId` remains in the persistence contract, but a new page load begins at the first question in the newly shuffled bank.

Submitting an answer updates the in-memory quiz state and independently attempts to persist only that question's latest outcome. The question UI reports `Saving…`, briefly confirms success, or reports failure without blocking navigation. A failed answer is not retried by later submissions. Bookmark toggles similarly persist only the affected question. Navigation and filter changes do not write progress.

### Local storage

`LocalStorageProgressStore` validates serialized progress with Zod and stores it under `quizTrail.progress.v1`. Invalid or inaccessible browser data produces a controlled error.

### Firestore

Cloud progress is stored at:

```text
userProgress/{uid}
```

The Firestore document adds:

- `revision`: a positive integer used for optimistic concurrency;
- `updatedAt`: the server timestamp required by security rules.

Each targeted answer or bookmark update runs in a transaction that reads the latest document, changes only the requested question, and increments the revision. Concurrent tabs therefore preserve unrelated answers and bookmarks; if they submit the same question, the latest successful transaction supplies its stored outcome.

Firestore rules restrict reads and writes to the authenticated owner, allow only the expected fields, validate schema and collection sizes, require monotonically increasing revisions, and require a server timestamp. Question text and account profile data are not stored in the progress document.

### Question feedback

After answering, any signed-in cloud learner can open More and submit feedback about the current question. Feedback is unavailable in local mode.

Bad question feedback is stored at:

```text
questionFeedback/{questionId}/submissions/{uid}
```

Each document contains:

- `text`: the learner's feedback, from 1 to 1000 characters;
- `submittedAt`: a Firestore server timestamp.

The authenticated user's UID is the submission document ID, so each learner has at most one feedback document per question. Submitting again replaces that document. Learners can read only their own direct document and cannot list feedback. The external review exporter uses privileged Application Default Credentials to run a collection-group query across `submissions`; no reviewer access exists in the learner UI.

### Kill-switch config

A config document at:

```text
config/feedback
```

contains an `enabled` boolean flag. Firestore security rules read this document to dynamically block incoming feedback writes if spamming occurs.

## Question-bank identity and reconciliation

The canonical source bank and all editorial/build tooling live in a separate
private repository. That repository validates and AES-GCM encrypts the learner
asset, which is published independently at
`https://storage.googleapis.com/quiz-trail-question-banks/questions.bin`.
The frontend imports only the intentionally public key from the sibling
repository at build time. The browser bundle necessarily contains that key, so
encryption prevents casual plain-file downloads but is not intended to resist a
determined extractor. A short version derived from the key is appended to the
bucket URL so key rotations do not reuse a cached object from the prior key.
The browser derives a shortened SHA-256 version marker from the decrypted
payload bytes.

The private tooling also performs exact and similarity-based duplicate review.
It owns the encryption key and format used to build the asset. The frontend
retains the matching decryptor and runtime parser. Duplicate matches are
reported for editorial review and are never automatically removed.

The static `/sample-questions/` page deliberately contains a manually copied SEO snapshot of ten selected questions. It is not loaded by the practice application and does not participate in progress identity or grading. Its `data-question-id` attributes identify the corresponding canonical questions for maintenance.

Permanent question IDs decouple saved progress from source order and page-load shuffling. When a bank changes, reconciliation:

- retains outcomes and bookmarks for IDs still present;
- removes references to deleted IDs;
- treats new IDs as unanswered;
- updates the saved bank version;
- produces a notice when saved references were removed.

The full source contract and safe-edit rules live in [`question-bank.md`](question-bank.md).

## Authentication and account deletion

Local mode supplies an immediate synthetic user and no-op account operations. Firebase modes persist the Firebase Authentication session locally and use Google popup authentication.

Cloud account deletion is deliberately ordered:

1. Require typed confirmation in the UI.
2. Reauthenticate the current user with Google.
3. Delete `userProgress/{uid}`.
4. Delete the Firebase Authentication identity.

This avoids leaving progress behind after a successful identity deletion. Because the operations are not an atomic cross-service transaction, the UI reports when progress deletion succeeded but identity deletion failed.

## Analytics and metadata visibility

Analytics are derived entirely in the browser by joining CSV subject metadata to the latest outcomes and saved IDs. No analytics aggregate is persisted.

Exam sections, objectives, topics, and difficulty support learner-facing summaries. Source, review status, outdated status, and terminology fields remain internal and are passed to the question UI only after an answer and only when `?debug=true` enables maintainer details.

## Hosting and caching

Vite emits four HTML entry points to `dist/`:

- `/` — static landing page;
- `/faq/` — static FAQ with FAQ structured data;
- `/sample-questions/` — static sample-question snapshot;
- `/practice/` — React/Firebase practice application.

Firebase Hosting serves those files directly. There is no catch-all rewrite, so unknown paths return a normal 404 instead of the landing page.

- Hashed assets use long-lived immutable caching.
- Public HTML and `practice/index.html` use `no-cache`.
- The Cloud Storage `questions.bin` object uses a one-hour public cache; publishing a new object updates clients without a frontend deployment.

The committed Firebase alias `production` targets the single live `quiz-trail` project. Local Firebase emulators are the development environment; there is no separate staging project.

See [`release-runbook.md`](release-runbook.md) before starting Firebase services, running Firebase integration tests, building a cloud release, deploying, or rolling back.

## Code map

| Area | Location |
|---|---|
| Static public pages | `index.html`, `faq/`, `sample-questions/` |
| Application composition and flows | `practice/index.html`, `src/app/` |
| Authentication adapters | `src/auth/` |
| React UI components | `src/components/` |
| Runtime mode configuration | `src/config/` |
| CSV loading and validation | `src/data/csv/` |
| Quiz state, reducer, selectors, analytics, and types | `src/domain/` |
| Firebase initialization and configuration | `src/firebase/` |
| Local and Firestore persistence | `src/storage/` |
| Styling | `src/styles/index.css` |
| Question-bank tooling | Private sibling repository `quiz-trail-question-bank/scripts/` |
| Question-bank build integration | `vite.config.ts` |
| Unit and component tests | Colocated `*.test.ts` and `*.test.tsx` files |
| Browser tests | `e2e/` |
| Firebase integration tests | `tests/` and `e2e/firebase-emulator.spec.ts` |
| Firestore access control | `firestore.rules` |
| Hosting and emulator configuration | `firebase.json` |

## Architectural invariants

- The private CSV is the only authored question source; production runs from its encrypted build artifact.
- Question IDs are permanent progress keys, never row positions.
- Domain logic must remain independent of Firebase-specific APIs.
- Progress remains a compact per-user snapshot unless a separately reviewed schema and rules migration changes it.
- Cloud access remains owner-scoped and stale saves must not silently overwrite newer data.
- Firebase must not initialize in default local mode.
- Production or console-sensitive changes require explicit human approval.
