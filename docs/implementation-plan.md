# PMLE Quiz App Implementation Plan

> A step-by-step implementation guide for a junior engineer

| Field | Value |
|---|---|
| Companion document | `docs/product-plan.md` |
| Delivery model | Phase 1 local-first; Phase 2 Firebase cloud integration |
| Phase 1 owner | Engineer works independently through the completion gate |
| Phase 2 gate | Product owner supplies Firebase/GCP project configuration |

> **Delivery rule:** Complete and demonstrate Phase 1 before starting any Firebase or GCP work. Phase 1 must be useful and fully testable without internet access after dependencies and the CSV are present.

> **Environment decision (2026-07-16):** The product owner designated the existing `quiz-trail` Firebase project as production and accepted occasional downtime for this small free app. Local emulators are the development environment; earlier recommendations for separate staging and production projects are superseded.

## How to use this plan

The Product Plan remains the source of truth for user behavior and scope. This implementation plan translates it into technical decisions, ordered tasks, tests, and handoff gates. When the two documents conflict, stop and ask the product owner rather than expanding scope.

- Execute tasks in order; do not skip the test or documentation work at the end of a task.
- Keep each pull request small enough to review and revert independently.
- Do not add features listed as product non-goals.
- Record assumptions and deviations in README.md under “Implementation Notes.”

## Outcome

At the Phase 1 gate, a learner can load the full question bank, answer and review questions, filter progress, explicitly save to the browser, close the tab, reopen the app, and resume. At the Phase 2 gate, the same behavior uses Google identity and one secured Firestore document per user.

## 1. Locked technical decisions

| **Area**        | **Decision**                                        | **Reason**                                                                               |
|-----------------|-----------------------------------------------------|------------------------------------------------------------------------------------------|
| Frontend        | React + TypeScript + Vite                           | Small client-only application with fast local development and a static production build. |
| Package manager | npm                                                 | Lowest setup burden; commit package-lock.json for repeatable installs.                   |
| Runtime         | Node.js 22 LTS; commit .nvmrc                       | Stable, supported baseline. Do not change major Node versions mid-project.               |
| State           | React useReducer + context                          | The state model is compact; Redux or another state framework is unnecessary.             |
| CSV             | Papa Parse + Zod validation                         | Correctly handles quoted multiline cells, commas, and runtime schema validation.         |
| Phase 1 storage | localStorage through ProgressStore                  | Persists across reloads while keeping the storage implementation replaceable.            |
| Phase 2 storage | Cloud Firestore through the same interface          | One compact current-state document per authenticated user.                               |
| Authentication  | No auth in Phase 1; Firebase Google auth in Phase 2 | Keeps Phase 1 independent from cloud configuration.                                      |
| Testing         | Vitest + Testing Library + Playwright               | Covers pure logic, components, persistence, and critical browser journeys.               |
| Styling         | Plain responsive CSS                                | Avoids introducing a UI framework for a small, single-screen MVP.                        |

### 1.1 Scope controls

- Do not build a custom backend, Cloud Functions, database for questions, admin console, analytics dashboard, timer, attempt history, leaderboard, or payment processing.
- The CSV stays in the repository and is served as a static application asset. Do not create a second hand-maintained JSON question source.
- The PayPal and Venmo controls are ordinary external links. Never collect payment or quiz data in the link payload.
- Use stable question_id values everywhere. Never persist array indexes or CSV row numbers.

### 1.2 Supported question types

**MVP decision:** Phase 1 supports both `question_type=single_choice` and `question_type=multiple_choice`. Single-choice rows accept exactly one answer key. Multiple-choice rows accept a comma-separated answer set and are correct only when the selected set exactly matches the answer set. During CSV preflight, report every distinct `question_type`; stop for any type beyond these two.

### 1.3 Definition of local versus cloud

| **Concern**          | **Phase 1**                            | **Phase 2**                                                   |
|----------------------|----------------------------------------|---------------------------------------------------------------|
| Identity             | Single local browser profile           | Firebase authenticated UID                                    |
| Progress persistence | localStorage key `quizTrail.progress.v1` | Firestore document `userProgress/{uid}`                       |
| Cross-device resume  | Not available                          | Available after cloud save                                    |
| Questions            | Static CSV                             | The same static CSV                                           |
| Save behavior        | Explicit button writes browser storage | Explicit button writes Firestore                              |
| Reset behavior       | Clear local record after confirmation  | Clear memory and delete Firestore document after confirmation |

## 2. Target architecture and repository layout

Keep domain logic independent from browser storage and Firebase. UI components call application services; application services depend on small interfaces; adapters implement those interfaces.

```text
UI components
  ↓ dispatch actions / call services
Quiz domain (types, reducer, selectors, validation)
  ↓ interfaces
QuestionBankLoader        ProgressStore        AuthService
CSV implementation       localStorage         local dev identity   [Phase 1]
CSV implementation       Firestore            Firebase Auth        [Phase 2]
```

### 2.1 Required repository layout

```text
quiz-trail/
├── public/
│   └── data/questions.csv
├── src/
│   ├── app/App.tsx
│   ├── auth/AuthService.ts
│   ├── components/
│   │   ├── ProgressSummary.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── QuestionNavigation.tsx
│   │   ├── QuizFilters.tsx
│   │   ├── SaveProgressButton.tsx
│   │   └── TipJar.tsx
│   ├── data/csv/
│   │   ├── loadQuestionBank.ts
│   │   ├── parseQuestionBank.ts
│   │   └── questionCsvSchema.ts
│   ├── domain/
│   │   ├── quizReducer.ts
│   │   ├── selectors.ts
│   │   └── types.ts
│   ├── storage/
│   │   ├── ProgressStore.ts
│   │   └── LocalStorageProgressStore.ts
│   ├── styles/
│   └── test/
├── e2e/
├── .env.example
├── .nvmrc
├── README.md
└── package.json
```

*Phase 2 adds FirebaseAuthService.ts, FirestoreProgressStore.ts, firebase.ts, firestore.rules, firestore.indexes.json, and firebase.json. Do not add placeholder Firebase files during Phase 1.*

### 2.2 Core domain contracts

```ts
type ChoiceKey = 'A' | 'B' | 'C' | 'D' | 'E';

interface QuizQuestion {
  questionId: string;
  questionType: 'single_choice' | 'multiple_choice';
  prompt: string;
  options: Array<{ key: ChoiceKey; text: string }>;
  correctAnswers: ChoiceKey[];
  explanation: string;
  referenceUrl?: string;
  chatgptVerified?: boolean;
}

interface UserProgress {
  schemaVersion: 1;
  questionBankVersion: string;
  progress: Record<string, boolean>;
  savedForLater: string[];
  lastQuestionId: string | null;
}

interface ProgressStore {
  load(userId?: string): Promise<UserProgress | null>;
  save(progress: UserProgress, userId?: string): Promise<void>;
  reset(userId?: string): Promise<void>;
}
```

### 2.3 State behavior

- Keep unsaved working progress in React memory. Set dirty=true whenever an answer, saved marker, or return point changes.
- Save Progress writes the complete compact state and sets dirty=false only after a successful write.
- `progress[questionId]=true` means the latest submitted answer was correct; `false` means incorrect; absence means unanswered.
- savedForLater is independent of correctness. An answered question may remain saved.
- On load, discard progress IDs that no longer exist in the CSV, discard invalid saved IDs, and clear an invalid lastQuestionId. Show a non-blocking reconciliation notice.
- Compute questionBankVersion from the exact fetched CSV bytes using browser SHA-256 and store a short prefixed value such as sha256:4fe83a2d991c.

## 3. Phase 1 — Local build and test

**Phase objective:** Deliver the complete quiz experience with localStorage persistence and no Firebase SDK, account, key, emulator, or cloud resource.

### Task 1 — Bootstrap the application

1.  Work from the existing `quiz-trail/` repository root. Scaffold Vite into the current directory, set the `package.json` name to `quiz-trail`, and do not create a nested project folder.
2.  Commit .nvmrc, package-lock.json, .editorconfig, and the existing ESLint configuration.
3.  Install papaparse and zod. Add @types/papaparse, Vitest, jsdom, Testing Library, user-event, Playwright, and Vitest coverage as development dependencies.
4.  Add scripts: dev, build, typecheck, lint, test, test:coverage, and e2e.
5.  Add public/data/questions.csv and verify that Vite serves it at /data/questions.csv.
6.  Create .env.example with VITE_PAYPAL_URL and VITE_VENMO_URL placeholders. The actual local .env file stays uncommitted.

- [ ] `npm ci` succeeds from a clean checkout.
- [ ] `npm run dev` opens the starter app without console errors.
- [ ] `npm run build`, `npm run typecheck`, and `npm run lint` all pass.

### Task 2 — Preflight and parse the CSV

7.  Write a small development-only preflight script that parses the complete CSV and reports row count, duplicate/blank IDs, distinct question_type values, option counts, invalid correct answers, missing explanations, and malformed URLs.
8.  Run it before building UI. Save the summary in the Phase 1 handoff notes, but do not generate another question-data file.
9.  Implement loadQuestionBank: fetch the raw CSV, fail clearly for HTTP errors, calculate the bank hash, parse with header mode and greedy empty-line skipping, then validate every row.
10. Normalize surrounding whitespace and a UTF-8 BOM in headers. Preserve intentional line breaks inside quoted fields.
11. Convert nonblank option_a through option_e fields into ordered choices. Require at least two options and require every correct_answer key to reference a nonblank option. Parse comma-separated answer sets for multiple-choice rows.
12. Treat blank reference_url as absent. Parse chatgpt_verified case-insensitively from TRUE/FALSE; do not make it required for quiz operation.
13. If any row is invalid, reject the entire bank and show a clear error with CSV row number, question ID when available, and reason. Do not partially load a corrupted bank.

#### CSV parser acceptance tests

- [ ] Parses the supplied quoted multiline question and multiline answer choices.
- [ ] Accepts an empty option_e and retains options A–D.
- [ ] Rejects blank and duplicate question_id values.
- [ ] Rejects an answer key that points to a blank or nonexistent option.
- [ ] Rejects fewer than two nonblank options, a blank prompt, or a blank explanation.
- [ ] Accepts `single_choice` and `multiple_choice`, rejects other question_type values, and lists the distinct values found.
- [ ] Handles commas, quotes, CRLF/LF line endings, and a header BOM.

### Task 3 — Implement domain state and selectors

14. Implement quizReducer with actions for bank loaded, answer submitted, saved marker toggled, filter changed, next/previous navigation, progress loaded, save succeeded/failed, and reset.
15. Implement selectors for All, Unanswered, Incorrect, and Saved. Filters are mutually exclusive.
16. Implement derived counts: total, attempted, correct, incorrect, saved, and remaining. Never store derived counts.
17. Track position by question ID, not array index. After a filter changes, choose the current question if it remains visible; otherwise choose the first visible question.
18. After a user submits an answer, lock the selection for that display, reveal correctness and explanation, and update the current outcome. When revisiting, allow a new submission; the latest outcome replaces the prior outcome.
19. Handle an empty filtered view with explanatory copy and a button back to Unanswered or All.

#### Domain tests

- [ ] Every filter returns exactly the expected IDs, including zero-result cases.
- [ ] Counts remain correct when a previously incorrect answer becomes correct.
- [ ] Save-for-later remains independent from answer state.
- [ ] CSV reorder does not change progress because IDs are stable.
- [ ] Deleting a CSV question safely reconciles old local progress.
- [ ] Navigation never produces an out-of-range or missing current question.

### Task 4 — Implement local persistence

20. Implement `LocalStorageProgressStore` using the single key `quizTrail.progress.v1`.
21. Serialize only UserProgress. Never store the CSV, explanations, selected UI filter, transient feedback, or payment URLs.
22. Validate stored JSON on load with Zod. If invalid, show a recoverable error and offer Reset local progress; do not silently continue with malformed data.
23. Save only when Save Progress is activated. Display Saving, Saved, and Save failed states. Disable duplicate saves while one is active.
24. Set a dirty indicator after local changes and install a best-effort beforeunload warning. Confirm before sign-out or reset when there are unsaved changes; sign-out is added in Phase 2.
25. Reset requires explicit confirmation, clears storage and in-memory progress, returns to the first unanswered question, and shows confirmation.

#### Persistence tests

- [ ] Save → new store instance → load returns the same state.
- [ ] Unsaved reducer changes are not present after a simulated reload.
- [ ] Reset removes the storage key.
- [ ] Corrupt JSON and a future schemaVersion produce a recoverable error.
- [ ] Storage quota or SecurityError failures are surfaced without marking the state saved.

### Task 5 — Build the primary quiz screen

Build one responsive screen in this visual order:

26. Application header and local-mode label.
27. Progress summary with attempted, correct, incorrect, saved, and remaining counts.
28. Mutually exclusive All, Unanswered, Incorrect, and Saved segmented control. Use an accessible select fallback on narrow screens if needed.
29. Question card with position in the active filtered set, prompt, and choices.
30. Submit Answer action. Disable it until an option is selected.
31. Immediate feedback, explanation, and optional reference link after submission.
32. Save for later / Saved for later toggle with both icon and text.
33. Previous and Next navigation.
34. Save Progress, dirty status, and Reset Progress controls.
35. Restrained PayPal and Venmo links below the full quiz experience.

#### UI behavior requirements

- Use semantic fieldset/legend or an equivalent accessible radio-group pattern for answer choices.
- Place feedback in an aria-live region and move focus only when it materially helps keyboard and screen-reader users.
- Open reference and tip links in a new tab with rel=noopener noreferrer. Validate configured URLs and hide a link if it is absent or invalid.
- Never render CSV content as HTML. Render it as React text so question content cannot inject markup.
- Use visible focus styles, 44px minimum touch targets, and sufficient color contrast. Correctness must not be communicated by color alone.
- Support 320px-wide mobile screens without horizontal page scrolling.
- Show a loading state while fetching/parsing the bank and a dedicated fatal-error state when loading fails.

### Task 6 — Component and end-to-end tests

| **Layer**     | **Minimum coverage**                                                                                                                                    |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| Component     | Choice selection; disabled submit; correct/incorrect feedback; explanation; saved toggle; filter changes; empty views; save states; reset confirmation. |
| Accessibility | Keyboard-only pass; programmatic labels; focus visibility; live feedback; no automated serious violations in the primary screen.                        |
| Playwright    | Fresh load; answer 3 questions; save; reload; verify restore; use Incorrect and Saved filters; remove saved marker; reset; confirm empty progress.      |
| Responsive    | Playwright desktop and representative mobile viewport; no horizontal overflow; controls remain usable.                                                  |
| Failure       | Missing CSV, invalid CSV, corrupt local state, invalid payment URL, and localStorage write failure.                                                     |

### Task 7 — Documentation and cleanup

36. Write README setup instructions: prerequisites, npm ci, environment variables, npm run dev, tests, production build, and how to replace the CSV safely.
37. Document the stable-ID rule and CSV validation rules.
38. Document localStorage limitations: same browser/device only, clearing site data removes progress, and there is no account in Phase 1.
39. Add a short architecture section describing the storage adapter seam that Phase 2 will use.
40. Remove starter assets, dead code, debug logs, unused packages, and untracked generated files.

## 4. Phase 1 completion gate

**Hard stop:** After every item below passes, prepare the Phase 1 handoff and wait for the product owner’s explicit GO. Do not install or configure Firebase yet.

### 4.1 Automated gate

```bash
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm run e2e
```

- [ ] All commands exit successfully from a clean checkout.
- [ ] No test is skipped unless README records the reason and owner approval.
- [ ] No severe browser console error occurs during the Playwright flow.

### 4.2 Manual demo script

41. Start with cleared site data and load the complete CSV. Confirm the displayed total matches the preflight row count.
42. Answer at least five questions with a mix of correct and incorrect outcomes; inspect each explanation.
43. Save two questions for later, including one already answered question.
44. Demonstrate All, Unanswered, Incorrect, and Saved filters and their counts.
45. Show the dirty indicator, press Save Progress, and confirm the Saved state.
46. Close and reopen the browser; verify outcomes, saved markers, counts, and return point.
47. Make an unsaved change, reload without saving, and verify that the last explicitly saved state returns.
48. Confirm reset requires approval and then clears all local progress.
49. Repeat the primary flow at desktop width and 320–390px mobile width using keyboard and touch/mouse controls.

### 4.3 Handoff package

- [ ] Repository with clean working tree and tagged milestone phase-1-local-mvp.
- [ ] README with exact setup and test commands.
- [ ] CSV preflight summary: row count, question types, invalid rows, and bank hash.
- [ ] Short list of known limitations and any deviations from the Product Plan.
- [ ] Phase 1 demo result and automated command output summarized in the pull request.

### 4.4 Product-owner review

The product owner validates the user flow and confirms whether to begin Phase 2. A Phase 1 approval means the local quiz behavior is accepted; it does not yet approve cloud security, Google sign-in, or production deployment.

## 5. Phase 2 — Firebase cloud integration

**Entry condition:** Phase 1 is approved and the product owner has supplied the Firebase project information listed below. The engineer must still use local emulators before writing production data.

### 5.1 Product-owner setup and inputs

| **Owner action**                          | **Input delivered to engineer**                                                                           |
|-------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Create or choose the Firebase/GCP project | Firebase project ID and environment name; preferably separate staging and production projects.            |
| Register the web application              | Firebase web configuration values for the approved environment.                                           |
| Enable Google sign-in                     | Confirmation that the Google provider is enabled and the support email is set.                            |
| Create Firestore                          | Database location and confirmation that Firestore is enabled. Start with restrictive rules.               |
| Approve domains                           | Localhost plus the staging/production domains authorized for Firebase Authentication.                     |
| Provide contribution links                | Final PayPal and Venmo URLs.                                                                              |
| App protection                            | Decision and setup inputs for Firebase App Check; production enforcement happens only after verification. |
| Operations                                | Billing/budget-alert owner and the person who can approve production deployment.                          |

*Firebase’s browser configuration, including the API key, identifies the Firebase project but is not a server secret. Security must come from Authentication, Firestore Security Rules, App Check, and restricted administration access. Keep environment-specific values out of source control anyway.*

### 5.2 Add Firebase configuration safely

50. Install the modular firebase package and firebase-tools as a development dependency. Pin changes in package-lock.json.
51. Create `src/firebase/firebase.ts` that reads `VITE_FIREBASE_*` values and fails with a clear configuration error when required values are missing.
52. Add all variable names—not values—to .env.example. Keep .env.local and environment-specific files ignored.
53. Add firebase.json, .firebaserc or documented CLI project aliases, firestore.rules, and firestore.indexes.json.
54. Configure the Authentication, Firestore, and Hosting emulators. Application code must connect to them only when the explicit VITE_USE_FIREBASE_EMULATORS flag is true.

### 5.3 Implement Firebase authentication

55. Implement FirebaseAuthService behind the existing AuthService interface.
56. Show a signed-out landing state with Sign in with Google. Do not load or write cloud progress before auth state is resolved.
57. Use the authenticated Firebase UID as the only progress owner key. Do not use email address as a document ID.
58. Show a minimal signed-in identity indicator and Sign out control. Warn when signing out with dirty progress.
59. Handle popup cancellation, popup blocking, network failure, disabled account, and unauthorized domain errors with understandable messages.
60. Test first with the Authentication emulator, then with the real Google provider in staging.

### 5.4 Implement Firestore persistence

61. Implement FirestoreProgressStore using document path userProgress/{uid}. Keep the existing ProgressStore contract unchanged.
62. Store schemaVersion, questionBankVersion, progress, savedForLater, lastQuestionId, updatedAt using serverTimestamp, and a numeric revision field for stale-write detection.
63. On sign-in, load once and reconcile IDs against the current CSV. Do not add a realtime listener; manual save is the product behavior.
64. Save the complete compact document in a transaction. If the cloud revision advanced after the page loaded, stop the save and ask the user to reload rather than silently overwriting another device.
65. Reset deletes the authenticated user’s progress document after confirmation and clears in-memory state only after the deletion succeeds.
66. Do not upload the CSV or question text to Firestore.

#### Recommended Firestore shape

```text
userProgress/{uid}
{
  schemaVersion: 1,
  questionBankVersion: 'sha256:4fe83a2d991c',
  progress: { 'PMLE-0001': true, 'PMLE-0002': false },
  savedForLater: ['PMLE-0014'],
  lastQuestionId: 'PMLE-0003',
  revision: 4,
  updatedAt: <server timestamp>
}
```

### 5.5 Security Rules and emulator tests

Default-deny the database. The only allowed client access is an authenticated user reading, creating, updating, or deleting the document whose ID equals that user’s UID.

```text
match /databases/{database}/documents {
  match /userProgress/{userId} {
    allow read, create, update, delete:
      if request.auth != null && request.auth.uid == userId;
  }
}
```

*Strengthen the rule with an allowed-field list and basic type/size checks where practical. Do not make rules so complex that nested progress-map validation becomes unreliable; the ownership rule is the non-negotiable boundary.*

#### Required rules tests

- [ ] Unauthenticated read, create, update, and delete are denied.
- [ ] User A can read and write userProgress/A.
- [ ] User A cannot read, write, or delete userProgress/B.
- [ ] Unexpected top-level fields and obviously invalid schemaVersion values are denied when field validation is enabled.
- [ ] Reset deletes only the current user’s document.

### 5.6 Hosting, caching, and environment separation

67. Configure Firebase Hosting to serve the Vite dist directory and fall back to index.html for client navigation.
68. Serve hashed JS/CSS assets with long immutable caching. Serve index.html and /data/questions.csv with revalidation/no-cache behavior so a question-bank update is not hidden behind a stale asset.
69. Use Firebase project aliases so staging and production cannot be confused. Never deploy by relying on whichever project happened to be selected previously.
70. Deploy a preview channel or staging project first. Verify Google sign-in, save/resume, reset, security rules, mobile layout, and external links there.
71. Enable and observe App Check in non-enforcing mode first; enforce it only after legitimate staging and production traffic is verified.
72. Configure budget alerts and review Firestore usage before production launch. Do not rely on an alert as a hard spending cap.

### 5.7 Phase 2 tests

| **Test area** | **Pass condition**                                                                                                   |
|---------------|----------------------------------------------------------------------------------------------------------------------|
| Auth          | Sign in, cancellation, sign out, auth persistence, unauthorized domain, and dirty-sign-out warning behave correctly. |
| Cloud resume  | Save on browser/device A; sign in on B; exact compact state and return point load.                                   |
| Isolation     | Rules test suite proves cross-user access is denied.                                                                 |
| Stale write   | A second device saves first; the older page detects revision mismatch and does not overwrite.                        |
| Reset         | Confirmation deletes only the current UID document and UI returns to fresh state.                                    |
| CSV update    | Reordered and corrected CSV retains known-ID progress; removed IDs reconcile safely.                                 |
| Deployment    | Direct URL, refresh, mobile viewport, caching headers, and external links work on staging.                           |

## 6. Phase 2 completion and production launch

### 6.1 Automated gate

- [ ] All Phase 1 commands still pass.
- [ ] Firebase emulator integration tests and Security Rules tests pass.
- [ ] Production build contains no local emulator connection unless explicitly enabled.
- [ ] No environment file containing real values is tracked by Git.

### 6.2 Staging sign-off

- [ ] Real Google sign-in works on every authorized staging domain.
- [ ] Cloud save and cross-device resume match the Product Plan.
- [ ] A second test account cannot access the first account’s progress.
- [ ] Reset, CSV reconciliation, stale-write handling, and failure messages are demonstrated.
- [ ] PayPal and Venmo links are final, correctly placed, and contain no quiz state.
- [ ] App Check status, usage metrics, and budget alert ownership are documented.

### 6.3 Production deployment

73. Record the exact commit and CSV hash approved in staging.
74. Run all automated gates from that commit.
75. Deploy Firestore rules before or atomically with the client that depends on them.
76. Deploy the Hosting build to the explicit production project alias.
77. Complete the smoke test with a real account: sign in, answer, save, reload, sign out/in, and reset using test progress.
78. Record deployment time, commit, Firebase project, test result, and rollback command in the release notes.

### 6.4 Rollback

- Hosting rollback: restore the last known-good Hosting release.
- Rules rollback: restore the last known-good restrictive rules only after verifying compatibility with the restored client.
- CSV rollback: redeploy the last approved CSV and build together; never reuse a question ID for different content.
- Do not delete user progress as part of an application rollback.

## 7. Pull-request sequence

| **PR** | **Scope**                                      | **Exit check**                          |
|--------|------------------------------------------------|-----------------------------------------|
| 1      | Vite scaffold, tooling, base layout, CSV asset | Clean install, typecheck, lint, build   |
| 2      | CSV preflight, loader, schema, parser tests    | Full bank validates; parser suite green |
| 3      | Domain types, reducer, selectors, tests        | Filters/counts/navigation green         |
| 4      | ProgressStore and localStorage adapter         | Save/load/reset/failure tests green     |
| 5      | Quiz UI, responsive CSS, accessibility         | Component suite and keyboard pass       |
| 6      | Playwright flows, README, Phase 1 cleanup      | Complete Phase 1 gate and demo          |
| 7      | Firebase config and Emulator Suite             | Emulators start consistently            |
| 8      | Google auth adapter                            | Auth emulator and staging tests green   |
| 9      | Firestore adapter, rules, stale-write handling | Ownership and integration tests green   |
| 10     | Hosting, App Check, staging and release docs   | Phase 2 staging gate passes             |

## 8. Junior-engineer guardrails

### Ask before proceeding when

- The CSV contains a question_type other than single_choice or multiple_choice.
- A product requirement conflicts with this plan or two acceptance criteria cannot both be satisfied.
- A change requires a custom backend, Cloud Function, new database collection, paid service, or additional user data.
- A production security rule must be weakened to make the app work.
- The engineer needs production console access, billing changes, domain verification, OAuth consent changes, or App Check enforcement.

### Proceed independently when

- Refactoring keeps the public behavior, data contract, and adapter boundaries unchanged.
- Adding tests, accessible labels, error messages, loading states, or documentation needed by the stated acceptance criteria.
- Fixing a build, type, lint, responsive-layout, or test failure without expanding product scope.

### Code-quality rules

- No any types in application code without a local explanation and a follow-up issue.
- No business logic inside JSX event handlers; dispatch named actions or call named services.
- No direct localStorage or Firestore calls from React components.
- No manual CSV splitting or regex parsing.
- No secrets, real environment files, service-account credentials, or admin SDK in the browser repository.
- No disabled lint rules or skipped tests solely to make CI pass.
- Every user-visible failure has an actionable message and preserves the last known-good in-memory state when possible.

## 9. Requirements traceability

| **Product capability**   | **Phase 1 implementation**                         | **Phase 2 addition**                      |
|--------------------------|----------------------------------------------------|-------------------------------------------|
| CSV load/validation      | Static asset, Papa Parse, Zod, fatal validation UI | Hosting cache policy                      |
| Answer and explanation   | Reducer + QuestionCard                             | No change                                 |
| Progress filters/counts  | Selectors + segmented control                      | No change                                 |
| Save for later           | Reducer + persisted ID set                         | Same state in Firestore                   |
| Save Progress            | LocalStorageProgressStore                          | FirestoreProgressStore                    |
| Resume                   | Same browser/device                                | Same authenticated user across devices    |
| Reset                    | Confirmed local deletion                           | Confirmed authenticated document deletion |
| Google sign-in           | Not present                                        | FirebaseAuthService                       |
| User isolation           | Not applicable                                     | Firestore rules + tests                   |
| Tip jar                  | Configured external links                          | Production environment values             |
| Responsive/accessibility | CSS, semantic controls, tests                      | Regression verification                   |

## 10. Reference links

- Firebase Authentication emulator: https://firebase.google.com/docs/emulator-suite/connect_auth
- Cloud Firestore emulator: https://firebase.google.com/docs/emulator-suite/connect_firestore
- Firebase Hosting preview and deployment: https://firebase.google.com/docs/hosting/test-preview-deploy
- Firebase Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase App Check for web: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- Vite React guide: https://vite.dev/guide/
- Vitest: https://vitest.dev/guide/
- Playwright: https://playwright.dev/docs/intro

**Final instruction:** The engineer should optimize for correctness, clear failure behavior, and maintainability—not feature count. A small, reliable quiz that preserves progress is the MVP.
