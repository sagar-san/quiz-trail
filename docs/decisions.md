# Quiz Trail decisions

This log records meaningful durable choices and why they were made. It is not a changelog or a place for routine implementation details. New decisions should be appended; when a choice changes, mark the earlier entry superseded and add the replacement.

## D001 — Keep questions in one canonical CSV

- **Status:** Accepted
- **Decision:** `public/data/questions.csv` is the only question source. The browser loads and validates it directly; no separately maintained JSON or Firestore question collection is used.
- **Why:** The question bank needs to remain portable, reviewable in source control, and editable without database migrations or an admin application.
- **Consequences:** The whole bank is deployed as an asset, invalid rows reject the bank, and CSV changes go through preflight validation.

## D002 — Use permanent question IDs as progress keys

- **Status:** Accepted
- **Decision:** Outcomes and bookmarks are keyed by `question_id`, never CSV row or shuffled position. Changes that materially alter what a question tests or its correct answer receive a new ID.
- **Why:** Question ordering and content evolve, while saved learner progress must remain attached to the same logical question.
- **Consequences:** Reordering is safe, additions appear unanswered, removals reconcile away, and content editors must treat IDs as a persistent data contract.

## D003 — Persist progress only on explicit save

- **Status:** Accepted
- **Decision:** Answer and bookmark changes remain in memory until the learner selects Save Progress. The active filter is stored separately and immediately.
- **Why:** Explicit control is a product principle and makes the persistence boundary visible to learners.
- **Consequences:** The UI tracks meaningful dirty state, warns about unsaved changes when appropriate, and navigation alone does not cause a save or dirty state.

## D004 — Store one compact progress snapshot per cloud user

- **Status:** Accepted
- **Decision:** Firestore stores one `userProgress/{uid}` document containing latest outcomes, saved IDs, a return-point field, schema/bank versions, revision, and timestamp. Question text and derived analytics are not stored.
- **Why:** The expected scale is small, reads and writes should remain simple, and question content already has a canonical source.
- **Consequences:** Analytics are derived client-side. Attempt counts and first/latest comparisons require a separately reviewed schema and Firestore-rules migration.

## D005 — Reject stale cloud saves with revision transactions

- **Status:** Accepted
- **Decision:** Each Firestore save must increment the revision loaded by that client. A conflicting revision fails and asks the learner to reload.
- **Why:** A learner may use multiple tabs or devices, and an older snapshot must not silently overwrite newer saved progress.
- **Consequences:** Saves use Firestore transactions, security rules enforce sequential revisions, and the store must load before it can save.

## D006 — Use adapters for runtime identity and persistence modes

- **Status:** Accepted
- **Decision:** Quiz behavior depends on `AuthService` and `ProgressStore` contracts. Local mode uses a synthetic identity and browser storage; Firebase modes use Firebase Authentication and Firestore.
- **Why:** Ordinary development should work without credentials or cloud access, while the same domain and UI support production behavior.
- **Consequences:** Firebase code is dynamically loaded only outside local mode, and emulator coverage verifies cloud-specific behavior.

## D007 — Use one live Firebase project and local emulators

- **Status:** Accepted
- **Decision:** The existing `quiz-trail` Firebase project is production. Local Firebase emulators are the development environment; there is intentionally no separate staging project.
- **Why:** This is a small free application whose owner accepts occasional live downtime and does not need the operational cost of another environment.
- **Consequences:** Production changes need explicit approval and careful release verification. Emulator tests are the required integration environment before live changes.

## D008 — Keep editorial metadata internal by default

- **Status:** Accepted
- **Decision:** Learners see useful subject metadata after answering. Source, review-status, and terminology metadata remains maintainer-only behind post-answer `?debug=true` behavior.
- **Why:** Editorial fields help maintain the bank but may be confusing, incomplete, or unsuitable for learner-facing presentation.
- **Consequences:** New UI must not expose internal notes without deliberate product review.

## D009 — Delete progress before deleting a cloud identity

- **Status:** Accepted
- **Decision:** Account deletion requires confirmation and recent Google authentication, then deletes the user's progress document before the Firebase Authentication identity.
- **Why:** Deleting identity first could leave user-owned progress data without a normal authenticated path to remove it.
- **Consequences:** Cross-service deletion is not atomic, so the application must report the partial outcome if progress is deleted but identity deletion fails.
