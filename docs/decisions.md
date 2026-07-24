# Quiz Trail decisions

This log records meaningful durable choices and why they were made. It is not a changelog or a place for routine implementation details. New decisions should be appended; when a choice changes, mark the earlier entry superseded and add the replacement.

## D001 — Keep practice questions in one canonical CSV

- **Status:** Superseded by D012; static SEO snapshot exception added by D011
- **Decision:** `public/data/questions.csv` is the practice application's only runtime question source. The browser loads and validates it directly; no separately maintained runtime JSON or Firestore question collection is used.
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

## D010 — Store one feedback document per learner and question

- **Status:** Accepted
- **Decision:** Cloud question feedback is stored at `questionFeedback/{questionId}/submissions/{uid}`. A later submission replaces that learner's earlier feedback for the same question. Feedback is not stored in local mode, and review happens through a privileged external script rather than the learner UI.
- **Why:** Direct document access is efficient for a learner's own feedback, per-question and cross-question review remain queryable, and feedback from different learners does not accumulate toward a single Firestore document-size limit.
- **Consequences:** Learners cannot list other submissions, existing array-based feedback is not migrated, and the review script requires trusted Application Default Credentials.

## D011 — Separate static discovery pages from the practice application

- **Status:** Accepted
- **Decision:** Serve the landing page, FAQ, and ten-question sample page as static HTML, and host the React/Firebase application at `/practice/`. The static sample page intentionally copies ten selected questions for SEO rather than generating them from the CSV.
- **Why:** Public discovery content should expose complete headings, links, and useful copy without requiring JavaScript. Keeping the samples as a small static snapshot makes the public pages simple and fast.
- **Consequences:** Firebase Hosting no longer uses a global SPA fallback, unknown paths return 404, and the copied samples can drift from the canonical CSV. Their permanent IDs remain in `data-question-id` attributes so maintainers can compare and update the snapshot deliberately.

## D012 — Keep the source bank private and deploy an encrypted asset

- **Status:** Accepted
- **Decision:** Maintain the canonical `questions.csv` in a separate private repository. The public application repository reads it from `QUESTION_BANK_PATH` at development and build time. Production builds validate and AES-GCM encrypt the CSV into `/data/questions.bin`; the browser decrypts that asset in memory.
- **Why:** The authored question bank should not be obtainable by cloning the public application repository or opening a readable production CSV URL.
- **Consequences:** Local development and deployment require access to the private bank. The browser still receives the complete bank and its public decryption material, so encryption is a download deterrent rather than a security boundary. Stronger extraction resistance would require server-side question delivery and grading. Versions previously committed to the public repository must be treated as already disclosed.
