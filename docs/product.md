# Quiz Trail product

## Purpose

Quiz Trail is a practice application for Google Cloud AI certifications. PMLE is available; Professional Agentic Architect is in an owner-only preview. It makes a large question bank practical to complete over multiple short study sessions while keeping learners in control of when progress is saved.

The public application is <https://quiz-trail.web.app>.

## Target learner and core job

The primary user is an independent PMLE learner who wants to answer a small group of questions, receive immediate feedback, identify weak areas, and safely resume later.

Quiz Trail is intentionally a practice tool rather than a learning-management system or full exam simulator.

## Main experience

1. A visitor can choose a certification at `/`, browse certification-specific FAQs and ten PMLE sample questions, and open PMLE practice at `/practice/`. The homepage's returning-learner links request Google sign-in on entry, while Practice PMLE opens guest practice.
2. In cloud mode, guests can try ten questions in memory, while a concise banner offers Google sign-in for the complete question bank and saved progress. Signed-in learners receive the complete bank.
3. The learner works through a shuffled sequence of single- and multiple-choice questions.
4. Submitting an answer shows correctness, an explanation, reference material when available, and learner-safe subject metadata.
5. The learner can review All, Unanswered, Incorrect, and Saved queues. The progress panel shows overall coverage and the percentage of attempted questions answered correctly.
6. The Summary view reports coverage and current accuracy by exam section, objective, topic, and difficulty, and links to useful review queues.
7. For signed-in cloud learners and local-mode development, submitting an answer saves that question's latest outcome and toggling Save for later saves that bookmark independently. Guest changes remain only in the current session.
8. Settings provides data information and progress reset. Cloud users can also sign out or delete their account. Contribution, GitHub issue, repository, and star links remain available only in maintainer debug mode.
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
- Previous and Next navigation do not write progress by themselves.
- The Unanswered view reports remaining questions against the full bank. All, Incorrect, and Saved report the current position within their respective queues.

### Progress and saving

- Answer outcomes and saved-for-later bookmarks are keyed by permanent question ID.
- For local and signed-in cloud learners, submitting an answer attempts to save only that question. A small status reports saving, success, or failure without blocking navigation.
- For local and signed-in cloud learners, toggling Save for later persists only that question's bookmark state.
- Guest sessions are limited to ten questions. Their answers, bookmarks, and filter changes remain in memory and clear on reload or sign-in; guest UI never reports them as saved.
- The active question filter is a separate browser preference and is stored immediately outside guest sessions.
- Local mode saves in the current browser. Firebase modes save only to the signed-in account.
- Reset all progress is destructive, requires confirmation, and lives in Settings.

### Review and analytics

- The primary queues are All, Unanswered, Incorrect, and Saved.
- Summary analytics use the latest recorded outcome for each question. Attempt history, first-attempt accuracy, and improvement reporting are not currently available.
- Strength and weak-area guidance is sample-gated so very small samples are not presented as meaningful conclusions.
- Editorial source, review-status, and terminology metadata is hidden from ordinary learners. Maintainers can inspect it after answering by loading the page with `?debug=true`.
- The post-answer AI review prompt directs third-party agents to solve independently before auditing the question bank's answer and explanation as untrusted claims.
- After answering, signed-in cloud learners can report an incorrect, unclear, or outdated question through the feedback form in More. Opening More loads that learner's existing report for the question into the same form, where it can be edited and resubmitted. A later report for the same question replaces the earlier report.
- Post-answer metadata is collapsed behind a Question details disclosure.

## Accounts and data

- Production authentication uses Google through Firebase Authentication; Quiz Trail does not manage passwords.
- Authentication is optional for practice. An anonymous cloud visitor receives no synthetic account and no progress writes.
- Cloud progress is scoped to the signed-in Firebase user and can resume across devices.
- Quiz Trail uses basic Google account details only to identify the learner's account. It does not sell learner data or share it with advertisers or unrelated third parties; Google and Firebase process the data required to provide authentication and cloud storage.
- Account deletion requires typed `DELETE` confirmation and Google reauthentication. It deletes the user's progress document and then the Firebase Authentication identity.
- If identity deletion fails after progress deletion, the app reports the partial result instead of claiming complete deletion.
- The application stores the latest answer outcome by question ID and saved-for-later bookmarks, not copies of question text. Voluntary question feedback is stored separately for review.

## Question content

The canonical source bank is maintained in a separate private question-bank repository. That repository validates, encrypts, and independently publishes the practice application's runtime `questions.bin` asset to Cloud Storage. It contains question content, answer data, learner analytics metadata, and internal editorial metadata. The static sample page is an intentional public SEO snapshot of ten selected questions and is maintained manually.

Question IDs are permanent progress keys. Wording, explanation, and reference corrections may retain an ID when saved outcomes should remain attached. A change to what a question tests or to its correct answer requires a new ID so learners receive it as unanswered.

See [`question-bank.md`](question-bank.md) for the data contract and editing workflow.

## Product boundaries

- The question bank remains versioned outside the public application repository and is published as an encrypted Cloud Storage asset, not live Firestore content. Bank updates do not require a frontend deployment.
- The static landing, FAQ, and sample pages remain usable without JavaScript; the React/Firebase practice application lives at `/practice/`.
- Signed-in answers and bookmark toggles persist as explicit, targeted actions rather than bulk client snapshots; guest activity is session-only.
- The app uses one production Firebase project and local emulators for development. Occasional live downtime is acceptable for this small free project.
- The supported production domain is `quiz-trail.web.app`; a custom domain is optional.
- Contribution and GitHub support links are optional, non-blocking, and shown only in `?debug=true` maintainer mode; monetary links also require valid configured URLs.
- The product does not currently provide timed mock exams, named study sessions, attempt history, spaced repetition, adaptive learning, readiness scoring, leaderboards, social features, native mobile apps, or an admin question editor.
- Internal editorial notes must not be exposed to learners without deliberate product review.

## Product safeguards

- A deferred backlog item is not authorization to implement it.
- Production deployment, billing changes, App Check enforcement, OAuth consent changes, domain verification, and other console-sensitive actions require explicit product-owner approval.
- Reliability, correct cross-user isolation, safe question-bank evolution, accessibility, and mobile usability take priority over growth features.

## Certification catalog

The homepage is titled “GCP AI Certification practice,” with an available PMLE entry and a Professional Agentic Architect “Coming soon” entry. Its neutral surfaces, dark typography, blue actions, and ruled rows replace the green landing-page presentation. PMLE URLs and existing progress remain compatible. The existing FAQ and samples remain explicitly PMLE-specific. PAA has its own public FAQ at `/agentic-ai/faq/`.

The signed-in preview owner can open Professional Agentic Architect from practice navigation, or visit `/practice/?cert=agentic-ai`. Other accounts and guests see a coming-soon screen without loading private questions. Signing in retains the certification selection. Professional Agentic Architect currently contains 150 supplied questions under review; it is not a public guest bank. Progress, bookmarks, filters, summaries, reset, and copied review-prompt context are certification-specific. Account deletion remains account-wide.

The official display name is [Professional Agentic Architect](https://cloud.google.com/learn/certification/agentic-architect), abbreviated PAA. The stable internal ID remains `agentic-ai`; this wording correction does not change routes or persisted keys.

The practice header uses plain text links matching the homepage: Home, the other certification for the preview owner, and account controls. Certification-specific FAQ and summary links live in the footer and in each homepage entry. PMLE summary opens at `/practice/?view=summary`; PAA summary opens at `/practice/?cert=agentic-ai&view=summary` and retains the private-preview restriction. Summary headings name the certification. Refresh and browser back/forward preserve the selected view.
