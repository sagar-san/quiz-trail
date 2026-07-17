# Quiz Trail backlog

This file contains durable work that has been deliberately deferred. It records future scope, not authorization to implement it. Work only on items within the human's current request or separately approved scope.

## Account and feedback

- [x] Add a Report this question action and define where reports are submitted, including the question ID and useful review context.

## Learning analytics

- [ ] Track attempt counts and first/latest outcomes per `question_id`, then add first-attempt accuracy and improvement reporting. This requires a separately reviewed progress-schema and Firestore-rules migration; current analytics intentionally reports only the latest recorded outcome.
- [ ] Consider surfacing `terminology_status` for maintainers through a validation report or protected content-review tool. Do not expose internal editorial notes to learners without review.

## Development workflow

- [ ] Consider making Firebase browser integration tests self-starting so `npm run e2e:firebase` manages its emulator and Vite dependencies automatically.

## Live Firebase project

- [ ] Configure Firebase App Check for the production web app in monitoring/non-enforcing mode.
- [ ] Verify legitimate production traffic and App Check metrics before considering enforcement.
- [ ] Do not enable App Check enforcement without explicit product-owner approval.

## Operational readiness

- [ ] Optionally choose a custom domain later; `quiz-trail.web.app` remains the supported production URL.
- [ ] Identify the billing and budget-alert owner before enabling paid services or production billing changes.
- [ ] Configure budget alerts and review expected usage before enabling paid services.
- [ ] Obtain explicit product-owner approval before production deployment, billing changes, OAuth consent changes, domain verification, or other console-sensitive actions.

## Optional contribution links

- [ ] Decide later whether to add a Venmo URL; keep the Venmo control hidden until a valid URL is supplied.
