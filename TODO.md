# Quiz Trail TODO

Durable follow-up items that are intentionally deferred. Detailed implementation sequencing remains in `docs/implementation-plan.md`; current-session status remains in `session.md`.

## Phase 2 staging

- [ ] Configure Firebase App Check for the staging web app in monitoring/non-enforcing mode.
- [ ] Verify legitimate staging traffic and App Check metrics before considering enforcement.
- [ ] Do not enable App Check enforcement without explicit product-owner approval.

## Account and feedback

- [ ] Add a focused Account & Data settings page with account identity, sign out, reset progress, data-storage information, and a support/contact link.
- [ ] Add account deletion that removes both the signed-in user's Firebase Authentication identity and `userProgress/{uid}` Firestore document, with strong confirmation and Google reauthentication when Firebase requires a recent login.
- [ ] Add a “Report this question” action and define where reports are submitted, including the question ID and useful review context.

## Production readiness

- [ ] Create a separate production Firebase/GCP project before production launch.
- [ ] Choose and connect a custom production domain, then add it to Firebase Authentication authorized domains.
- [ ] Identify the billing and budget-alert owner before enabling paid services or production billing changes.
- [ ] Configure budget alerts and review expected Firestore and Hosting usage before launch.
- [ ] Obtain explicit product-owner approval before production deployment, billing changes, OAuth consent changes, domain verification, or other console-sensitive actions.

## Optional contribution links

- [ ] Decide later whether to add a Venmo URL; keep the Venmo control hidden until a valid URL is supplied.
