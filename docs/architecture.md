# Quiz Trail architecture

## System overview

Quiz Trail is a client-rendered React and TypeScript application built with Vite. The browser loads the complete CSV question bank, keeps quiz behavior in a reducer-driven domain model, and accesses identity and persistence through narrow adapters.

```text
public/data/questions.csv
          |
          v
 CSV validation + versioning
          |
          v
 React app <-> quiz reducer/selectors
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

`src/main.tsx` creates runtime dependencies and renders the application. `src/app/createAppDependencies.ts` selects the authentication and persistence adapters. `src/app/App.tsx` coordinates authentication, question loading, reducer state, persistence, views, settings, and account actions.

The primary boundaries are:

- `AuthService`: subscribe to identity and perform sign-in, sign-out, reauthentication, and account deletion.
- `ProgressStore`: load, save, and reset a `UserProgress` snapshot.
- `QuizPreferences`: immediately load and save the active filter independently of progress.
- CSV loader/parser: download, decode, validate, version, and shuffle the question bank.
- Quiz reducer and selectors: own domain transitions and derived views without depending on Firebase or browser storage.

## Startup and load flow

1. The application resolves the current identity through `AuthService`.
2. Once a user identity exists, it loads `/data/questions.csv` as bytes.
3. The browser decodes UTF-8, validates every row, derives a bank version, and shuffles the questions once.
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
- dirty/save status and user-facing storage errors;
- an optional reconciliation notice.

The reducer owns state transitions such as bank load, answer submission, bookmark changes, filter and question navigation, progress load, save state, and reset. Selectors derive filtered queues, counts, analytics inputs, and the persisted snapshot.

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

Saving is explicit. Answer and bookmark changes set the reducer's dirty state; successful Save Progress clears it. Navigation and filter changes do not themselves create unsaved progress.

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

The store remembers the revision it loaded. Each save runs in a transaction and succeeds only if the stored revision still matches; otherwise the user must reload rather than silently overwrite newer progress from another tab or device.

Firestore rules restrict reads and writes to the authenticated owner, allow only the expected fields, validate schema and collection sizes, require monotonically increasing revisions, and require a server timestamp. Question text and account profile data are not stored in the progress document.

## Question-bank identity and reconciliation

`public/data/questions.csv` is the canonical and only runtime question source. The normal HTTPS path derives a shortened SHA-256 version marker from the exact file bytes. In insecure local-network contexts without Web Crypto, the loader uses a deterministic FNV-1a fallback marker.

Permanent question IDs decouple saved progress from CSV order and page-load shuffling. When a bank changes, reconciliation:

- retains outcomes and bookmarks for IDs still present;
- removes references to deleted IDs;
- treats new IDs as unanswered;
- updates the saved bank version;
- produces a notice when saved references were removed.

The full CSV contract and safe-edit rules live in [`question-bank.md`](question-bank.md).

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

Exam sections, objectives, topics, and difficulty support learner-facing summaries. Source, review status, and terminology fields remain internal and are passed to the question UI only after an answer and only when `?debug=true` enables maintainer details.

## Hosting and caching

Vite emits the static application to `dist/`. Firebase Hosting rewrites unknown routes to `index.html`.

- Hashed assets use long-lived immutable caching.
- `index.html` uses `no-cache`.
- `/data/questions.csv` uses `no-cache` so clients revalidate the canonical bank.

The committed Firebase alias `production` targets the single live `quiz-trail` project. Local Firebase emulators are the development environment; there is no separate staging project.

See [`release-runbook.md`](release-runbook.md) before starting Firebase services, running Firebase integration tests, building a cloud release, deploying, or rolling back.

## Code map

| Area | Location |
|---|---|
| Application composition and flows | `src/app/` |
| Authentication adapters | `src/auth/` |
| React UI components | `src/components/` |
| Runtime mode configuration | `src/config/` |
| CSV loading and validation | `src/data/csv/` |
| Quiz state, reducer, selectors, analytics, and types | `src/domain/` |
| Firebase initialization and configuration | `src/firebase/` |
| Local and Firestore persistence | `src/storage/` |
| Styling | `src/styles/index.css` |
| Question-bank tooling | `scripts/preflight-csv.ts` |
| Unit and component tests | Colocated `*.test.ts` and `*.test.tsx` files |
| Browser tests | `e2e/` |
| Firebase integration tests | `tests/` and `e2e/firebase-emulator.spec.ts` |
| Firestore access control | `firestore.rules` |
| Hosting and emulator configuration | `firebase.json` |

## Architectural invariants

- The CSV is the only question source.
- Question IDs are permanent progress keys, never row positions.
- Domain logic must remain independent of Firebase-specific APIs.
- Progress remains a compact per-user snapshot unless a separately reviewed schema and rules migration changes it.
- Cloud access remains owner-scoped and stale saves must not silently overwrite newer data.
- Firebase must not initialize in default local mode.
- Production or console-sensitive changes require explicit human approval.
