# Quiz Trail product

## Purpose

Quiz Trail is a focused practice application for learners preparing for Google Cloud's Professional Machine Learning Engineer certification. It makes a large question bank practical to complete over multiple short study sessions while keeping learners in control of when progress is saved.

The public application is <https://quiz-trail.web.app>.

## Target learner and core job

The primary user is an independent PMLE learner who wants to answer a small group of questions, receive immediate feedback, identify weak areas, and safely resume later.

Quiz Trail is intentionally a practice tool rather than a learning-management system or full exam simulator.

## Main experience

1. A visitor can read the static public PMLE overview at `/`, browse the static FAQ and ten sample questions, and open the full practice application at `/practice/`.
2. In cloud mode, the learner signs in with Google before the practice app loads and validates the complete question bank.
3. The learner works through a shuffled sequence of single- and multiple-choice questions.
4. Submitting an answer shows correctness, an explanation, reference material when available, and learner-safe subject metadata.
5. The learner can review All, Unanswered, Incorrect, and Saved queues. The progress panel shows overall coverage and the percentage of attempted questions answered correctly.
6. The Summary view reports coverage and current accuracy by exam section, objective, topic, and difficulty, and links to useful review queues.
7. Save Progress explicitly persists the current answer and bookmark state.
8. Settings provides data information, progress reset, contribution links, and a free GitHub-star support option. Cloud users can also sign out or delete their account.
9. A static public FAQ answers common PMLE practice, question-source, progress, and contribution questions at `/faq/`.
10. A static public sample page presents a deliberately copied snapshot of ten curated questions, with answer explanations and references, at `/sample-questions/`.
11. A manually curated `/llms.txt` summarizes the application, its public pages, access requirements, and authoritative certification source for AI agents.

## Behavioral rules

### Answering and navigation

- Single-choice questions accept one answer. Multiple-choice questions require an exact match to the correct answer set.
- Feedback appears immediately after submission.
- A newly answered question remains visible even if its outcome would normally remove it from the active filtered queue.
- Question order is shuffled once per page load and remains stable within that tab.
- Each page load starts at the first question in its new shuffle; a stored return point does not override the new order.
- Previous and Next navigation do not create unsaved changes by themselves.
- The Unanswered view reports remaining questions against the full bank. All, Incorrect, and Saved report the current position within their respective queues.

### Progress and saving

- Answer outcomes and saved-for-later bookmarks are keyed by permanent question ID.
- Answer and bookmark changes are not persisted until the learner selects Save Progress.
- The active question filter is a separate browser preference and is stored immediately.
- The app indicates meaningful unsaved progress changes and uses a browser unload warning when supported.
- After ten distinct questions have unsaved answers, a warning above the progress-saving panel reminds the learner to save.
- Local mode saves in the current browser. Firebase modes save to the signed-in account.
- Reset all progress is destructive, requires confirmation, and lives in Settings.

### Review and analytics

- The primary queues are All, Unanswered, Incorrect, and Saved.
- Summary analytics use the latest recorded outcome for each question. Attempt history, first-attempt accuracy, and improvement reporting are not currently available.
- Strength and weak-area guidance is sample-gated so very small samples are not presented as meaningful conclusions.
- Editorial source, review-status, and terminology metadata is hidden from ordinary learners. Maintainers can inspect it after answering by loading the page with `?debug=true`.
- The post-answer AI review prompt directs third-party agents to solve independently before auditing the question bank's answer and explanation as untrusted claims.
- After answering, signed-in cloud learners can report an incorrect, unclear, or outdated question through the feedback form in More. A later report for the same question replaces that learner's earlier report.
- Post-answer metadata is collapsed behind a Question details disclosure.

## Accounts and data

- Production authentication uses Google through Firebase Authentication; Quiz Trail does not manage passwords.
- Cloud progress is scoped to the signed-in Firebase user and can resume across devices.
- Sign-out warns before discarding unsaved changes.
- Account deletion requires typed `DELETE` confirmation and Google reauthentication. It deletes the user's progress document and then the Firebase Authentication identity.
- If identity deletion fails after progress deletion, the app reports the partial result instead of claiming complete deletion.
- The application stores progress state, not copies of question text.

## Question content

`public/data/questions.csv` is the practice application's sole runtime question source. It contains question content, answer data, learner analytics metadata, and internal editorial metadata. The static sample page is an intentional SEO snapshot of ten selected questions and is maintained manually.

Question IDs are permanent progress keys. Wording, explanation, and reference corrections may retain an ID when saved outcomes should remain attached. A change to what a question tests or to its correct answer requires a new ID so learners receive it as unanswered.

See [`question-bank.md`](question-bank.md) for the data contract and editing workflow.

## Product boundaries

- The question bank remains a versioned CSV deployed with the application, not live Firestore content.
- The static landing, FAQ, and sample pages remain usable without JavaScript; the React/Firebase practice application lives at `/practice/`.
- Saving remains explicit rather than automatic.
- The app uses one production Firebase project and local emulators for development. Occasional live downtime is acceptable for this small free project.
- The supported production domain is `quiz-trail.web.app`; a custom domain is optional.
- Contribution links are optional, non-blocking, and shown only when configured with valid URLs.
- The product does not currently provide timed mock exams, named study sessions, attempt history, spaced repetition, adaptive learning, readiness scoring, leaderboards, social features, native mobile apps, or an admin question editor.
- Internal editorial notes must not be exposed to learners without deliberate product review.

## Product safeguards

- A deferred backlog item is not authorization to implement it.
- Production deployment, billing changes, App Check enforcement, OAuth consent changes, domain verification, and other console-sensitive actions require explicit product-owner approval.
- Reliability, correct cross-user isolation, safe question-bank evolution, accessibility, and mobile usability take priority over growth features.
