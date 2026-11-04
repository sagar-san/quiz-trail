# Quiz Trail decisions

This log records meaningful durable choices and why they were made. It is not a changelog or a place for routine implementation details. New decisions should be appended; when a choice changes, mark the earlier entry superseded and add the replacement.

## D001 — Keep practice questions in one canonical CSV

- **Status:** Superseded by D012 and D014; static SEO snapshot exception added by D011
- **Decision:** `public/data/questions.csv` is the practice application's only runtime question source. The browser loads and validates it directly; no separately maintained runtime JSON or Firestore question collection is used.
- **Why:** The question bank needs to remain portable, reviewable in source control, and editable without database migrations or an admin application.
- **Consequences:** The whole bank is deployed as an asset, invalid rows reject the bank, and CSV changes go through preflight validation.

## D002 — Use permanent question IDs as progress keys

- **Status:** Accepted
- **Decision:** Outcomes and bookmarks are keyed by `question_id`, never CSV row or shuffled position. Changes that materially alter what a question tests or its correct answer receive a new ID.
- **Why:** Question ordering and content evolve, while saved learner progress must remain attached to the same logical question.
- **Consequences:** Reordering is safe, additions appear unanswered, removals reconcile away, and content editors must treat IDs as a persistent data contract.

## D003 — Persist progress only on explicit save

- **Status:** Superseded by D013
- **Decision:** Answer and bookmark changes remain in memory until the learner selects Save Progress. The active filter is stored separately and immediately.
- **Why:** Explicit control is a product principle and makes the persistence boundary visible to learners.
- **Consequences:** The UI tracks meaningful dirty state, warns about unsaved changes when appropriate, and navigation alone does not cause a save or dirty state.

## D004 — Store one compact progress snapshot per cloud user

- **Status:** Accepted
- **Decision:** Firestore stores one `userProgress/{uid}` document containing latest outcomes, saved IDs, a return-point field, schema/bank versions, revision, and timestamp. Question text and derived analytics are not stored.
- **Why:** The expected scale is small, reads and writes should remain simple, and question content already has a canonical source.
- **Consequences:** Analytics are derived client-side. Attempt counts and first/latest comparisons require a separately reviewed schema and Firestore-rules migration.

## D005 — Reject stale cloud saves with revision transactions

- **Status:** Superseded by D013
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

- **Status:** Accepted; extended by D018 to clean up comments and reactions first
- **Decision:** Account deletion requires confirmation and recent Google authentication, then deletes the user's progress document before the Firebase Authentication identity.
- **Why:** Deleting identity first could leave user-owned progress data without a normal authenticated path to remove it.
- **Consequences:** Cross-service deletion is not atomic, so the application must report the partial outcome if progress is deleted but identity deletion fails.

## D010 — Store one feedback document per learner and question

- **Status:** Superseded for new frontend submissions by D018; retained for legacy private reports
- **Decision:** Cloud question feedback is stored at `questionFeedback/{questionId}/submissions/{uid}`. A later submission replaces that learner's earlier feedback for the same question. Feedback is not stored in local mode, and review happens through the private question-bank repository's local downloader and editor rather than the learner UI.
- **Why:** Direct document access is efficient for a learner's own feedback, per-question and cross-question review remain queryable, and feedback from different learners does not accumulate toward a single Firestore document-size limit.
- **Consequences:** Learners cannot list other submissions, existing array-based feedback is not migrated, and the private review command requires trusted Application Default Credentials. Downloads are nondestructive by default; optional remote deletion requires an exact per-report confirmation after the local file is verified.

## D011 — Separate static discovery pages from the practice application

- **Status:** Accepted
- **Decision:** Serve the landing page, FAQ, and ten-question sample page as static HTML, and host the React/Firebase application at `/practice/`. The static sample page intentionally copies ten selected questions for SEO rather than generating them from the canonical bank.
- **Why:** Public discovery content should expose complete headings, links, and useful copy without requiring JavaScript. Keeping the samples as a small static snapshot makes the public pages simple and fast.
- **Consequences:** Firebase Hosting no longer uses a global SPA fallback, unknown paths return 404, and the copied samples can drift from the canonical bank. Their permanent IDs remain in `data-question-id` attributes so maintainers can compare and update the snapshot deliberately.

## D012 — Keep the source bank private and deploy an encrypted asset

- **Status:** Accepted
- **Decision:** Maintain the canonical source bank, validation, encryption, and publishing workflow in a separate private repository. Publish the AES-GCM-encrypted `questions.bin` independently to the approved public Cloud Storage bucket. The frontend fetches that object directly and imports only the intentionally public decryption key from the sibling repository at build time.
- **Why:** The authored question bank should not be obtainable by cloning the public application repository or opening a readable production CSV URL.
- **Consequences:** Frontend builds require the private bank repository beside
  the application only for the public key. That repository owns source
  preflight, duplicate review, encrypted-asset construction, and publishing,
  while the public application retains its runtime parser and decryptor.
  Question content can change independently without rebuilding or deploying
  the frontend; clients may use the prior object for up to its one-hour cache.
  The browser still receives the complete bank and its public decryption
  material, so encryption is a download deterrent rather than a security
  boundary. Stronger extraction resistance would require server-side question
  delivery and grading. Versions previously committed to the public repository
  must be treated as already disclosed.

## D013 — Persist submitted answers and bookmarks as targeted actions

- **Status:** Accepted
- **Decision:** Submitting an answer immediately attempts to persist only that question's latest outcome. Toggling Save for later persists only that bookmark. Navigation remains independent, and later submissions do not retry a failed answer.
- **Why:** Mobile browsers may reload inactive tabs, which made explicitly batched in-memory progress easy to lose and caused answered questions to reappear. A submitted answer should have one clear save attempt without adding a separate Save Progress step.
- **Consequences:** The bulk Save Progress panel, dirty-state warnings, and unload prompt are removed. Saving status appears with the submitted question and does not block navigation. Firestore transactions merge each targeted mutation into the latest user document, preserving unrelated changes from other tabs while retaining one compact document per user.

## D014 — Keep each canonical question in its own JSON file

- **Status:** Accepted
- **Decision:** The private question-bank repository stores each authored
  question as `questions/<question_id>.json`. Validation and asset builds
  deterministically assemble those files into the existing CSV contract before
  encryption; generated CSV is ignored and is never an authored source.
- **Why:** Per-question JSON produces focused Git diffs, simple human and AI
  edits, isolated merge conflicts, natural arrays and booleans, and direct local
  editor saves without introducing a database or changing the frontend runtime
  format.
- **Consequences:** Filenames must match permanent IDs, deleting an existing
  file is prohibited, complete-bank validation still runs after edits, and the
  CSV exporter is a compatibility boundary whose deterministic behavior is
  covered by round-trip tests.

## D015 — Allow guest practice but persist only authenticated cloud progress

- **Status:** Accepted
- **Decision:** Load ten questions from the shuffled practice bank for anonymous
  cloud visitors and let them answer, bookmark, filter, and inspect session
  analytics in memory. Load the complete bank after sign-in.
  Do not read or write progress, preferences, or feedback for guests. Offer
  Google sign-in as the way to save across devices; signing in discards the
  temporary guest session and loads the account's existing progress.
- **Why:** Learners should be able to experience the real product before being
  asked for an account, while a clear ten-question boundary gives sign-in a
  useful purpose and avoids ambiguous guest-to-account merging.
- **Consequences:** `/practice/` remains a client-rendered, `noindex` product
  route, while the static landing, FAQ, and sample pages remain the indexable
  discovery surfaces. Guest UI must not claim that answers or bookmarks are
  saved, and account-only feedback and settings remain unavailable until sign-in.

## D016 — Preserve PMLE storage while adding certification-scoped progress

- **Status:** Accepted
- **Decision:** Keep the existing PMLE document, browser keys, question IDs, and default practice URL. Route new certifications to child progress documents and suffixed browser keys through the storage adapters.
- **Why:** Existing users and older PMLE tabs continue working without data migration or competing copies of progress.
- **Consequences:** PMLE is a deliberate adapter-level exception. Account deletion must enumerate children even when the legacy parent does not exist. Adding a certification requires explicit registry and security-rule changes.

## D017 — Protect the Agentic AI preview with server-side authorization

- **Status:** Accepted
- **Decision:** Deliver the small preview bank from a protected Firestore document readable only by the owner's verified Google account. Never publish the preview to PMLE's public bucket. Public visitors see “Coming soon.”
- **Why:** Public encryption keys cannot enforce private access; hiding navigation is insufficient.
- **Consequences:** Publication requires approved Firestore rules and a separate approved private-document write. The private publisher checks a 900,000-byte encoded budget. A larger or public release requires revisiting delivery and access deliberately.

## D018 — Share question discussion with client transactions and cursor pagination

- **Status:** Accepted
- **Decision:** Replace the private feedback form with shared signed-in comments, one Like/Dislike per learner, and net-score ranking. Enforce aggregate/vote consistency in both directions with Firestore rules and atomic transactions. Use simple bounded cursor pages; rankings can change between requests.
- **Why:** Learners can share corrections and useful explanations within the existing browser/Firebase architecture without adding a server or live ranking service.
- **Consequences:** Existing private reports stay private. Comments use tombstones so other users' reactions need no cascading deletion. Account deletion blocks new comment writes, resumes bounded comment/vote cleanup, and stops on failure before deleting the identity. PAA stays restricted. No replies, moderation dashboard, automated hiding, or stable pagination snapshot is introduced.
