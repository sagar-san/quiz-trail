# Current status

Last reviewed: 2026-11-03

## Sign-in required and public samples — not deployed

- Removed the ten-question interactive guest trial and its banner. Cloud practice and summaries show a Google sign-in gate before any bank, progress, or preference reads. Existing signed-in and local-development flows remain supported.
- Kept ten PMLE samples and added ten static PAA samples at `/agentic-ai/sample-questions/`, linked from the catalog, FAQ, and practice gate/footer. Both pages work without JavaScript or an account. Full PAA practice and summary remain restricted to the preview owner.
- Updated public copy, sitemap, shared certification paths, and the explicit sample-publication exception. The canonical bank was not modified. Public PAA references were checked and four links refined to support their explanations more directly.
- Verification: typecheck, lint, 94 unit/component tests, one Auth emulator test, 26 Firestore rules/storage tests, seven-entry Firebase-mode build, four desktop/mobile no-JavaScript sample checks, two desktop/mobile LAN accessibility/layout checks, and all seven Firebase browser flows passed. No serious/critical accessibility issues were found in the new gate or PAA samples; screenshots inspected.
- Firebase browser checks used an isolated Auth emulator on 9199 and Firestore namespace `quiz-trail-signin-test`. Full Chromium and explicit opener focus resolved a headless-shell popup stall; the checked-in browser configuration/helpers now use that setup.
- Deployment remains paused at the user's request. No production Hosting, rules, index, configuration, or bank writes were performed. Production credentials and frontend configuration still need verification before release.

## Prior changes awaiting release

- Monospace identity refresh: shared neutral theme tokens and locally bundled IBM Plex fonts, 17px reading text, restrained controls, correct/incorrect feedback precedence, and plain copy icon. Previously verified with 24 desktop/mobile flows and four theme/accessibility checks.
- Shared question discussion replaces private feedback after answering. Includes posting/editing/deleting, Like/Dislike, ten-item ranked pages, and resumable account-deletion cleanup. Additive rules and indexes are ready but not deployed; legacy private feedback remains private.
- Release order in `release-runbook.md`: deploy indexes and wait for readiness, deploy additive rules and initialize `config/comments.enabled`, then deploy the frontend built with verified production configuration and smoke-test. Missing comments config intentionally disables writes.
- Local user's emulator contains seeded PMLE comments and personal test state. Do not run the Firebase browser suite against it: the suite clears accounts/data. Use a separate Auth emulator and separate Firestore project for integration checks; Auth popup endpoints ignore the API key and use their emulator's default project.
- The LAN preview configuration `.tmp/lan.vite.ts` is ignored. It proxies Auth, Firestore streaming and `/v1/projects`, plus the encrypted PMLE bank. The earlier missing-theme error cleared after restarting Vite; latest signed-out gate and PAA samples pass at the direct-IP HTTPS URL.

## Existing production release

- The last recorded Hosting release is frontend commit `5e5d55d` at https://quiz-trail.web.app/, with homepage/navigation/FAQ/sign-in/tip-link changes. It still has the private feedback interface until the discussion release is approved.
- Previously deployed Firestore rules from `e035664` and private-bank publication from private commit `4892a87` protect PAA with the verified Google preview-owner predicate. Those live rules do not yet include this checkout's additive comments rules. Production access was not rechecked during this implementation.
- PMLE retains legacy URLs, permanent IDs, storage paths and browser keys. PAA uses certification-scoped progress. Reset is scoped; account deletion is account-wide.

## Preserved bank state and cautions

- The sibling bank's pre-existing change to `questions/PMLE-0011.json` remains untouched. No bank source/tooling changes were needed, so question-bank preflight was not rerun. The ten newly public PAA samples were checked against linked official references; the rest of the PAA bank was not re-reviewed.
- Never publish the full PAA bank to the public bucket or frontend assets. Only the ten static samples listed in `question-bank.md` are approved for public use. Existing private-feedback retention is unchanged; old reports are never converted to shared comments.
- A Hosting rollback must account for older clients lacking comment cleanup during account deletion. Preserve the updated deletion path or handle cleanup explicitly; never delete comment data as a rollback shortcut.
- Verify local processes when resuming; do not assume test servers or emulators remain running.
