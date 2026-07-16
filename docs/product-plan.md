# PMLE Quiz App Product Plan

A focused, resumable study experience for a growing PMLE bank (339 questions today, targeting approximately 500)

| **Status**           | MVP scope defined                      |
|----------------------|----------------------------------------|
| **Audience**         | PMLE learners practicing independently |
| **Primary platform** | Public responsive web application      |
| **Purpose**          | Input to the engineering plan          |

> **MVP in one sentence:** Users sign in with Google, work through the full CSV-based question bank in short bursts, explicitly save their progress, resume later, review incorrect or saved-for-later questions, and optionally support the project through PayPal or Venmo.

# 1. Product objective

Make a large PMLE question bank practical to complete over time. The product should reduce the friction of remembering where a learner stopped, make missed questions easy to revisit, and preserve the CSV as the maintainable source of truth.

# 2. Target user and job to be done

**Primary user:** A PMLE learner who wants to complete the growing question bank—339 questions at launch, targeting approximately 500—over multiple study sessions.

**Job to be done:** When I have a few minutes to study, help me answer 5–10 questions, understand whether I was correct, save my place, and return later without losing progress.

# 3. Product principles

- Small and focused: the MVP is a question-practice tool, not a full learning-management system.

- Explicit control: progress is saved to the cloud when the learner chooses Save Progress.

- Portable content: questions continue to live in one CSV file committed with the source code.

- Stable identity: Google sign-in connects saved progress to a user across devices.

- Low distraction: the tip jar is visible but never interrupts the study flow.

# 4. MVP scope

## 4.1 Included capabilities

| **Capability**           | **MVP behavior**                                                                                                  |
|--------------------------|-------------------------------------------------------------------------------------------------------------------|
| Google sign-in           | Users authenticate with Google; the app does not manage passwords.                                                |
| Full CSV load            | The browser loads and parses the complete question CSV at application startup.                                    |
| Continuous question pass | The user works through one logical pass of the full bank in any number of short visits.                           |
| Immediate feedback       | After answering, the user sees correct/incorrect status and the explanation supplied by the CSV.                  |
| Manual cloud save        | Save Progress writes the current user state to Firestore.                                                         |
| Resume                   | A returning signed-in user resumes from saved progress, including correct, incorrect, and saved-for-later states. |
| Progress views           | A segmented control provides All, Unanswered, Incorrect, and Saved views.                                         |
| Save for later           | Users can mark or unmark any question for later review.                                                           |
| Reset                    | Users can clear all saved progress after explicit confirmation.                                                   |
| Tip jar                  | PayPal and Venmo support links appear at the bottom of every question page.                                       |

## 4.2 Explicit non-goals

The following are intentionally excluded from the MVP. They may be evaluated later, but the engineering plan should not include them unless scope is changed explicitly.

- Timed mock exams or exam simulation

- Multiple named sessions, attempt history, or historical score reporting

- Adaptive learning, spaced repetition, confidence tracking, or readiness scoring

- Leaderboards, social features, or shared progress

- Admin UI for editing questions

- Custom username/password authentication

- Native iOS or Android applications

- In-app payment processing, donation history, or donor entitlements

- Complex dashboards or analytics beyond basic progress counts

# 5. Primary user experience

1.  A new user opens the public web app and selects Sign in with Google.

2.  The application loads and parses the entire CSV question bank.

3.  The user sees overall progress and enters the All or Unanswered view.

4.  The user answers a question and receives immediate correctness feedback and the CSV explanation.

5.  The user may select Save for later on any question, independent of whether it has been answered.

6.  The user navigates through as many questions as desired—typically 5–10 in a sitting.

7.  The user presses Save Progress. The complete compact progress state is written to Firestore.

8.  On a later visit or another device, the user signs in and resumes from the saved state.

# 6. Detailed product requirements

| **ID** | **Area**         | **Requirement**                                                                                                         |
|--------|------------------|-------------------------------------------------------------------------------------------------------------------------|
| FR-01  | Authentication   | Provide Google sign-in and sign-out. Associate all persisted progress with the authenticated Firebase user ID.          |
| FR-02  | CSV loading      | Load the complete CSV at startup. Do not convert it into a separately maintained JSON source.                           |
| FR-03  | CSV validation   | Reject duplicate or blank question IDs and rows missing the question, choices, correct answer, or required explanation. |
| FR-04  | Question display | Show one question with its answer choices and position within the active filtered view.                                 |
| FR-05  | Answering        | Allow one answer selection per question and show immediate feedback after submission.                                   |
| FR-06  | Explanation      | Display the explanation provided by the CSV after the learner answers.                                                  |
| FR-07  | Progress model   | Represent each attempted question by stable question ID and outcome: correct or incorrect.                              |
| FR-08  | Save for later   | Allow any question ID to be added to or removed from the saved-for-later set.                                           |
| FR-09  | Filtering        | Provide mutually exclusive All, Unanswered, Incorrect, and Saved views using a segmented control.                       |
| FR-10  | Save Progress    | Persist the compact current state only when Save Progress is selected; clearly confirm successful saving.               |
| FR-11  | Unsaved changes  | Indicate when local progress differs from the last cloud save. Warn before destructive navigation when practical.       |
| FR-12  | Resume           | Load saved state after authentication and restore progress and saved-for-later selections.                              |
| FR-13  | Reset            | Require confirmation, then clear progress and saved-for-later state locally and in Firestore.                           |
| FR-14  | Progress summary | Show attempted, correct, incorrect, saved, and remaining counts derived from the current CSV and user state.            |
| FR-15  | Tip jar          | Show PayPal and Venmo links below question content, feedback, and navigation on every question page.                    |
| FR-16  | Responsive UI    | Support current mobile and desktop browsers with keyboard- and touch-friendly controls.                                 |

# 7. Information architecture and page behavior

**Primary screen:** The quiz is a single primary experience rather than a multi-page application. It includes the progress summary, filter control, question card, feedback, navigation, Save Progress action, and tip jar.

**Filter control:** Use a segmented control because All, Unanswered, Incorrect, and Saved are mutually exclusive views. On narrow screens the control may wrap or use an accessible select control.

**Save for later:** Use a bookmark icon with the explicit label Save for later. After selection, display Saved for later and allow removal.

**Tip jar placement:** Always below the question experience and primary controls. Never use pop-ups, interstitials, or blocking prompts.

# 8. Content and CSV contract

The CSV is the source of truth and is loaded in full by the frontend. It is committed to the GitHub repository and deployed as an application asset. The app must reference questions by stable IDs rather than row number.

| **Field**           | **Status**  | **Product use**                                                                          |
|---------------------|-------------|------------------------------------------------------------------------------------------|
| question_id         | Required    | Permanent unique ID used by saved progress; must not change after release.               |
| question_type       | Required    | `single_choice` or `multiple_choice`; controls radio versus checkbox selection.           |
| question            | Required    | Question prompt.                                                                         |
| option_a … option_e | Required    | Available answer choices; at least two must be nonblank.                                  |
| correct_answer      | Required    | One choice key for single choice, or a comma-separated set for multiple choice.           |
| explanation         | Required    | Feedback shown after answering.                                                          |
| topic               | Recommended | Supports future organization; not required for the MVP filters.                          |
| reference_url       | Optional    | Reference displayed when present.                                                        |
| chatgpt_verified    | Optional    | Existing verification metadata may be displayed later; not required for MVP.             |

> **Stable-ID rule:** Rows may be reordered and question text may be corrected. Existing IDs must not be reused for different questions or changed casually, because user progress is keyed to those IDs.

# 9. Persisted user state

Firestore stores one compact current-state document per user. It does not store the CSV questions or a detailed click history.

| **Field**           | **Type**           | **Purpose**                                                                    |
|---------------------|--------------------|--------------------------------------------------------------------------------|
| schemaVersion       | Number             | Supports safe future data migrations.                                          |
| questionBankVersion | String             | Identifies the CSV version used when progress was saved.                       |
| progress            | Map\<ID, boolean\> | Question ID exists if attempted; true means correct and false means incorrect. |
| savedForLater       | Array\<ID\>        | Question IDs the learner explicitly saved.                                     |
| lastQuestionId      | String or null     | Best-effort return point after resume.                                         |
| updatedAt           | Timestamp          | Server timestamp of the last cloud save.                                       |

Illustrative state:

```json
{
  "schemaVersion": 1,
  "questionBankVersion": "2026-07",
  "progress": {"PMLE-001": true, "PMLE-002": false},
  "savedForLater": ["PMLE-014"],
  "lastQuestionId": "PMLE-003"
}
```

# 10. Acceptance criteria

| **ID** | **Acceptance criterion**                                                                                           |
|--------|--------------------------------------------------------------------------------------------------------------------|
| AC-01  | A user can sign in with Google without creating an app-specific password.                                          |
| AC-02  | The application loads all valid rows from the provided CSV and reports a clear error if the file cannot be parsed. |
| AC-03  | A user can answer a question and see whether the answer is correct plus its explanation.                           |
| AC-04  | After answering several questions and selecting Save Progress, a success confirmation appears.                     |
| AC-05  | After signing out and returning on the same or another device, the saved correct/incorrect state is restored.      |
| AC-06  | A question can be saved for later and later removed; the Saved view reflects the change.                           |
| AC-07  | All, Unanswered, Incorrect, and Saved display the correct question sets and only one filter is active.             |
| AC-08  | Reset requires confirmation and clears progress and saved questions for that user.                                 |
| AC-09  | One user cannot read or write another user’s Firestore state.                                                      |
| AC-10  | PayPal and Venmo links appear below every question page and open externally without sharing quiz data.             |
| AC-11  | The primary flow is usable on a modern phone and desktop browser without horizontal page scrolling.                |
| AC-12  | Question order changes in the CSV do not corrupt saved progress because state is keyed by stable IDs.              |

# 11. Success measures

The MVP should be judged first by reliability and usefulness, not growth. Initial measures can be observed manually or through lightweight privacy-conscious analytics.

- Users can complete short study bursts and successfully resume later.

- No loss or cross-user leakage of saved progress is observed.

- CSV updates can be deployed without manual database changes.

- Most users can understand Save for later and the four progress views without instruction.

- Infrastructure remains within the expected Firebase no-cost usage range for approximately 10 daily active users.

# 12. Risks and mitigations

| **Risk**                      | **Impact**                           | **Mitigation**                                                                                    |
|-------------------------------|--------------------------------------|---------------------------------------------------------------------------------------------------|
| CSV IDs change                | Existing progress becomes orphaned.  | Validate uniqueness; document IDs as permanent; version the bank.                                 |
| User forgets to save          | Recent answers are lost.             | Show an unsaved indicator and confirmation before sign-out/reset; consider browser draft storage. |
| Public links are abused       | Unexpected traffic or cost.          | Use Firebase security rules, App Check, quotas, and budget alerts.                                |
| Question bank contains errors | Learners receive incorrect guidance. | Preserve verification fields and source references; add reporting only after MVP if needed.       |
| Tip jar distracts             | Reduced trust or learning focus.     | Keep it below primary controls with restrained copy and no modal prompts.                         |

# 13. Engineering-plan inputs

The engineering plan should translate this product scope into architecture, milestones, implementation tasks, test strategy, deployment steps, and operational safeguards. The expected technical direction is:

- React + TypeScript frontend, optimized as a client-side responsive application

- Firebase Authentication with Google provider

- Cloud Firestore for one compact progress-state document per user

- Firebase Hosting for the public web application

- Complete CSV loaded and parsed by the client at startup

- PayPal and Venmo URLs supplied through deployment configuration

- GitHub as the source repository

# 14. Configuration inputs required before launch

- Canonical CSV is `public/data/questions.csv`; its exact launch headers and single/multiple-choice shape are defined above

- Firebase project and authorized production domain

- Google sign-in configuration

- PayPal payment link

- Venmo business/profile payment link

- Public product name and minimal footer/privacy copy

> **Scope guardrail:** If a proposed engineering task does not support an included capability, an acceptance criterion, security, deployment, or required quality assurance, it should be excluded from the MVP plan or explicitly approved as a scope change.
