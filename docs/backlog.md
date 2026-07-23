# Quiz Trail backlog

This file contains durable work that has been deliberately deferred. It records future scope, not authorization to implement it. Work only on items within the human's current request or separately approved scope.

## Account and feedback

- [x] Add a Report this question action and define where reports are submitted, including the question ID and useful review context.

## Learning analytics

- [ ] Track attempt counts and first/latest outcomes per `question_id`, then add first-attempt accuracy and improvement reporting. This requires a separately reviewed progress-schema and Firestore-rules migration; current analytics intentionally reports only the latest recorded outcome.
- [ ] Consider surfacing `terminology_status` for maintainers through a validation report or protected content-review tool. Do not expose internal editorial notes to learners without review.

## Progress saving

- [ ] Replace the explicit Save Progress flow with automatic Firestore saving when the learner selects Next after changing progress or toggles Save for later. Do not write when nothing changed and do not add a local pending-write cache. Await a successful save before navigating; on failure, keep the current question visible and show an error with a retry action. Remove the Save Progress button, unsaved-answer reminder, and unload warning, and supersede decision D003 when this product change is approved for implementation.

## Development workflow

- [ ] Consider making Firebase browser integration tests self-starting so `npm run e2e:firebase` manages its emulator and Vite dependencies automatically.

## Question review tooling

- [ ] Build a small local-only Python question-review agent under `tools/question-review-agent/` using `uv` and one Google ADK `root_agent`. Review one `question_id` at a time from `public/data/questions.csv` with the hardcoded `gemini-2.5-pro` model and ADK's Google Search tool; prefer current official Google Cloud, certification, and release-note sources; display the recommendation (`keep`, `update`, `drop`, or `needs_research`), reasoning, proposed field changes, confidence, model, citations, and only the grounding/search metadata actually returned by the API. Load `GEMINI_API_KEY` from an ignored `.env`, commit only a placeholder `.env.example`, never fall back silently to Flash, and do not use `agents-cli`, Vertex/Agent Platform, Node wrappers, subprocess model calls, or browser automation.
- [ ] Keep review runs read-only until an exact, deterministic human approval phrase is entered outside the model. On the first approved mutation, create `questions_candidate.csv` as a full copy of the canonical bank; preserve IDs for ordinary corrections, generate a new UUID when the correct answer changes, remove dropped rows, never modify `public/data/questions.csv`, and never overwrite an existing candidate with a fresh copy. Add deterministic tests for parsing, mutations, ID handling, and approval behavior, plus concise setup instructions and the repository question-bank preflight.
- [ ] Optionally allow the review agent to read relevant Firebase context and include it in the review prompt. Keep this disabled by default and read-only, minimize the fields retrieved, avoid logging sensitive data, distinguish Firebase context from grounded web evidence, and require explicit product-owner approval plus verified project/auth configuration before accessing the live Firebase project. Do not add feedback-download or Firebase write integration as part of the initial agent.
- [ ] Preserve provider-neutral boundaries around CSV, review-schema, rendering, and approval code so a future DeepSeek model adapter can be evaluated through ADK/LiteLLM. DeepSeek would require separate credentials and a provider-neutral search implementation; it must not claim Gemini Google Search grounding or metadata.

## Live Firebase project

- [ ] Configure Firebase App Check for the production web app in monitoring/non-enforcing mode.
- [ ] Verify legitimate production traffic and App Check metrics before considering enforcement.
- [ ] Do not enable App Check enforcement without explicit product-owner approval.

## Operational readiness

- [ ] Optionally choose a custom domain later; `quiz-trail.web.app` remains the supported production URL.
- [ ] Identify the billing and budget-alert owner before enabling paid services or production billing changes.
- [ ] Configure budget alerts and review expected usage before enabling paid services.
- [ ] Obtain explicit product-owner approval before production deployment, billing changes, OAuth consent changes, domain verification, or other console-sensitive actions.

## Discovery and audience growth

- [ ] Add `https://quiz-trail.web.app/` to Google Search Console as a URL-prefix property, verify ownership, submit `/sitemap.xml`, request homepage indexing, and review crawl or rendering issues. Treat account verification and other external-console changes as requiring explicit product-owner approval.
- [ ] Create an indexable public landing page for free Google Cloud PMLE practice questions. Explain that the bank contains 408 carefully curated questions, show a small set of representative sample questions with original explanations, link into the practice experience, and clearly state that Quiz Trail is independent and not affiliated with Google.
- [ ] Consider additional original, indexable PMLE study content organized around genuine learner needs and the current official exam guide, such as an exam guide, study plan, and focused pages for Vertex AI, BigQuery ML, MLOps, generative AI, and model monitoring. Avoid thin, repetitive, or search-engine-only pages.
- [ ] Prepare a one-time, helpful launch for relevant Google Cloud certification communities, LinkedIn, GitHub, and appropriate study groups. Emphasize that Quiz Trail is free and open source, describe how questions are curated, invite content feedback, follow each community's promotion rules, and do not imply that the bank contains leaked exam material.
- [ ] Consider privacy-safe sharing features such as milestone cards, copyable progress summaries, a question-of-the-day link, or a short PMLE study challenge. Do not expose account details, answer history, or other private learner data.
- [ ] Use Search Console first to measure queries, impressions, click-through rate, and indexed pages. Review any broader acquisition analytics and privacy implications before adding tracking for visits, practice starts, first answers, return visits, sign-ins, or completion milestones.

## Optional contribution links

- [ ] Decide later whether to add a Venmo URL; keep the Venmo control hidden until a valid URL is supplied.
