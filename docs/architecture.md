# Quiz Trail architecture

## System overview

Quiz Trail is a Vite multi-page site. The landing page, FAQ, and ten-question sample pages are static HTML for fast, JavaScript-independent discovery. The full practice experience at `/practice/` is a client-rendered React and TypeScript application. The browser loads and decrypts the complete question bank, keeps quiz behavior in a reducer-driven domain model, and accesses identity and persistence through narrow adapters.

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

Firebase Hosting serves the production build. Firebase Authentication supplies Google identity, and Cloud Firestore stores compact progress documents per user and certification; PMLE retains its legacy location.

## Runtime modes

`VITE_DATA_MODE` selects the application's adapters:

| Mode | Identity | Progress store | Intended use |
|---|---|---|---|
| `local` | Automatic `local-browser` identity | Browser `localStorage` | Default local development |
| `firebase-emulator` | Firebase Auth emulator user | Firestore emulator when signed in | Firebase integration development and tests |
| `firebase` | Google user | Production Firestore when signed in | Production build |

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

1. The application resolves the current identity through `AuthService`. A null cloud identity shows a sign-in gate for practice and summary, with a link to public samples.
2. Only after identity and certification authorization succeed does it load the bank: PMLE from public Cloud Storage, PAA from protected Firestore.
3. The browser decrypts the asset in memory, decodes UTF-8, validates every row, derives a bank version, and shuffles the questions once.
4. The reducer receives the complete authorized bank and stored filter preference.
5. `ProgressStore` loads saved progress for the authenticated (or local-development synthetic) user.
6. Saved question IDs are reconciled against the current bank before entering reducer state. Signing out cancels the active load and returns to the gate; it does not load an anonymous bank.

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

Submitting an answer always updates the in-memory quiz state. Local and signed-in cloud sessions independently attempt to persist only that question's latest outcome; the question UI reports `Saving…`, briefly confirms success, or reports failure without blocking navigation. A failed answer is not retried by later submissions. Their bookmark toggles similarly persist only the affected question. Guest answers, bookmarks, and filters remain in memory, use session-specific wording, and are discarded on reload or sign-in. Navigation does not write progress.

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

### Shared question discussion

`CommentStore` is separate from quiz state and progress. `FirestoreCommentStore` is dynamically imported in cloud modes only. `QuestionDiscussion` owns automatic post-answer loading, cursor history, drafts and mutation state; it is mounted outside the grading status region and keyed by user, certification and question. App tracks its mutations before leaving, signing out or deleting an account.

- `questionComments/{id}` stores certification/question scope, author UID and a first-name display label (first word of the Firebase display name, with “Learner” fallback), plain text, creation/edit timestamps, integer like/dislike counts, net score, and a deletion flag.
- `commentReactions/{uid}/votes/{commentId}` stores that learner's `like`/`dislike` value and server update timestamp. Only that learner can read/list it.
- `commentAccounts/{uid}` contains `{deleting: true}` once account deletion starts. The marker blocks new comments, edits and reactions across tabs. Removal remains available; retrying Delete account resumes cleanup. The marker remains after successful identity deletion and contains no profile or comment text.
- `config/comments` contains `{enabled: true}` to permit new comments, edits and reactions. Missing/false config disables them; removals and cleanup remain available.

Page queries filter certification, question and `deleted == false`, order by score descending, creation ascending and document ID ascending, and fetch 11 documents to display ten. An opaque cursor holds the last displayed Firestore snapshot, preserving nanosecond timestamp precision. Previous navigation refetches stored cursors. Rankings may change between requests; stable snapshots and cross-page deduplication are intentionally absent.

Reaction transactions read the comment and own vote, derive the delta for the requested desired state, then atomically update both. Count transforms are checked in both directions by rules against the previous and resulting vote; independent increments, vote-only writes and forged scores are denied. Transforms also allow concurrent transactions to reach Firestore's version-conflict retry instead of failing validation against stale literal totals. Repeating the same desired reaction is a no-op. Submission retries reuse their original ID and text.

Only authors edit text or tombstone comments. Tombstones clear text, author name and UID while preserving scope, timestamps and counters; they cannot be restored or receive new reactions. Existing votes may be removed. PMLE requires authentication and PAA retains the verified Google preview-owner predicate. Question prefix validation does not prove a question exists. Cleanup queries can read the user's authored comments despite revoked certification access; while deletion is marked, direct reads of comments with that user's votes also allow those votes to be removed. This does not permit listing the restricted discussion.

Cleanup marks the account first, queries authored comments in bounded batches of 20 and tombstones them, then removes the user's votes in bounded batches of 20 with matching aggregate updates. Each successful mutation removes that item from subsequent cleanup queries. Failures stop before progress/identity deletion and are resumable. Other learners' votes on tombstones are retained.

### Legacy private feedback

`questionFeedback/{questionId}/submissions/{uid}` and `config/feedback` retain their existing schema, privacy rules and write switch for older clients. The new frontend no longer reads or writes private feedback. No reports are migrated to comments. The sibling private repository's reviewer tooling and existing retention are unchanged.

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

The static `/sample-questions/` and `/agentic-ai/sample-questions/` pages each contain a manually copied public snapshot of ten selected questions. Neither is loaded by the practice application or participates in progress identity or grading. Their `data-question-id` attributes identify the corresponding canonical questions for maintenance.

Permanent question IDs decouple saved progress from source order and page-load shuffling. When a bank changes, reconciliation:

- retains outcomes and bookmarks for IDs still present;
- removes references to deleted IDs;
- treats new IDs as unanswered;
- updates the saved bank version;
- produces a notice when saved references were removed.

The full source contract and safe-edit rules live in [`question-bank.md`](question-bank.md).

## Authentication and account deletion

Local mode supplies an immediate synthetic user and no-op account operations. Firebase modes show a sign-in gate for null identity, persist authenticated Firebase sessions locally, and use Google popup authentication. The homepage’s `src/catalog.ts` enhances the static catalog with the existing AuthService: Google sign-in stays on the catalog, restored sessions update its controls, and no question bank or progress is loaded. Local mode uses LocalAuthService without initializing Firebase. Certification-specific sign-in links retain the one-time query parameter that the practice application removes before opening the popup, so refreshes do not repeat the request. After sign-in, the application loads the complete authorized bank and that account's saved progress.

Cloud account deletion is deliberately ordered:

1. Require typed confirmation in the UI.
2. Reauthenticate the current user with Google.
3. Mark comment-account deletion, tombstone authored comments, and remove own reactions with paired count updates. Stop on failure; retry resumes remaining work.
4. Enumerate and delete `userProgress/{uid}/certifications/*`, then delete the legacy `userProgress/{uid}` document.
5. Delete the Firebase Authentication identity.

This avoids leaving comment content, reactions or progress behind after a successful identity deletion. Because the operations are not an atomic cross-service transaction, the UI reports when progress deletion succeeded but identity deletion failed.

## Analytics and metadata visibility

The `view=summary` query selects the summary within the existing certification-scoped practice app. Internal practice/summary navigation updates browser history without reloading the bank or losing in-progress selections; popstate restores the view. The same certification authorization gate protects both views.

Analytics are derived entirely in the browser by joining CSV subject metadata to the latest outcomes and saved IDs. No analytics aggregate is persisted.

Exam sections, objectives, topics, and difficulty support learner-facing summaries. Source, review status, outdated status, and terminology fields remain internal and are passed to the question UI only after an answer and only when `?debug=true` enables maintainer details. The same flag reveals preserved contribution and GitHub support UI in the practice app and static public pages; those links remain hidden during ordinary learner visits.

## Hosting and caching

Vite emits seven HTML entry points to `dist/`:

- `/` — static landing page;
- `/faq/` — static general FAQ with FAQ structured data;
- `/pmle/faq/` — static PMLE FAQ with FAQ structured data;
- `/agentic-ai/faq/` — static public PAA FAQ with FAQ structured data;
- `/sample-questions/` — static PMLE sample snapshot;
- `/agentic-ai/sample-questions/` — static PAA sample snapshot;
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
| Static public pages | `index.html`, `faq/`, `pmle/faq/`, `agentic-ai/faq/`, `sample-questions/`, `agentic-ai/sample-questions/` |
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

- Private per-question JSON banks are the only authored sources; CSV is generated compatibility output.
- Question IDs are permanent progress keys, never row positions.
- Domain logic must remain independent of Firebase-specific APIs.
- Progress remains a compact per-user snapshot unless a separately reviewed schema and rules migration changes it.
- Cloud access remains owner-scoped and stale saves must not silently overwrite newer data.
- Firebase must not initialize in default local mode.
- Production or console-sensitive changes require explicit human approval.

## Multiple certifications and restricted previews

`src/config/certifications.ts` defines stable IDs, labels, question prefixes, and preview status. `/practice/` defaults to PMLE; `/practice/?cert=agentic-ai` selects Agentic AI. Unknown IDs fail explicitly. Switching uses full-page navigation, retaining Firebase identity while constructing a fresh bank loader and scoped stores; no in-flight bank request is reused across certifications. Navigation waits for pending answer and bookmark saves.

PMLE retains `userProgress/{uid}`, `quizTrail.progress.v1`, and `quizTrail.filter.v1` without migration. Agentic AI uses `userProgress/{uid}/certifications/agentic-ai` and browser keys suffixed `.agentic-ai`. The existing progress schema and targeted transactional updates are unchanged. Reset affects only the selected certification. Account deletion removes all child progress documents before the legacy parent and Auth identity; feedback retention is unchanged.

PMLE keeps its public encrypted asset. The full Agentic AI bank must never be published into that bucket or bundled with frontend assets. The ten explicitly approved static PAA samples are the only public exception (see `question-bank.md`). Its encrypted base64 payload is read from `privateQuestionBanks/agentic-ai`, using a server read without persistent offline caching. Rules require the verified Google identity `ssanghani@gmail.com`; guests, other users, unverified identities, non-Google providers, collection listing, and client writes are denied. The client check only controls presentation; rules enforce access. The private publisher refuses assets over 900,000 encoded bytes; larger banks will require a separate delivery design. Existing encryption remains a format compatibility measure, not the authorization boundary.

Feedback keeps globally unique PMLE/PAA IDs and its current path; PAA feedback requires preview authorization. New certification IDs require explicit registry, loader, and rule entries rather than automatically exposing arbitrary paths.

## Deployment-time certification availability

`release.config.json.agenticAiPublic` is the single deployment-time PAA switch, default false. The certification registry derives preview status from it. Vite resolves static availability blocks and generates the Firestore rules from the same value, keeping all public copy, navigation and authorization aligned. Firebase deploy hooks check the build/config match. This adds no runtime config fetch or cloud flag document.

False preserves the existing verified Google preview-owner access. True permits any verified Google learner to get the protected PAA bank, write their own PAA progress, and participate in discussion. Existing permanent IDs, storage paths, account cleanup, and private feedback permissions are unchanged. Only the ten approved static samples are published as plaintext; the full bank stays in Firestore.
