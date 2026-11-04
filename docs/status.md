# Current status

Last reviewed: 2026-11-03

## Production release — deployed 2026-11-03

- Removed the ten-question interactive guest trial and its banner. Cloud practice and summaries show a Google sign-in gate before any bank, progress, or preference reads. Existing signed-in and local-development flows remain supported.
- Kept ten PMLE samples and added ten static PAA samples at `/agentic-ai/sample-questions/`, linked from the catalog, FAQ, and practice gate/footer. Both pages work without JavaScript or an account. Full PAA practice and summary remain restricted to the preview owner.
- Updated public copy, sitemap, shared certification paths, and the explicit sample-publication exception. The canonical bank was not modified. Public PAA references were checked and four links refined to support their explanations more directly.
- Verification: typecheck, lint, 94 unit/component tests, one Auth emulator test, 26 Firestore rules/storage tests, seven-entry Firebase-mode build, four desktop/mobile no-JavaScript sample checks, two desktop/mobile LAN accessibility/layout checks, and all seven Firebase browser flows passed. No serious/critical accessibility issues were found in the new gate or PAA samples; screenshots inspected.
- Firebase browser checks used an isolated Auth emulator on 9199 and Firestore namespace `quiz-trail-signin-test`. Full Chromium and explicit opener focus resolved a headless-shell popup stall; the checked-in browser configuration/helpers now use that setup.
- Deployed frontend commit `19548f0` to https://quiz-trail.web.app/ with explicit owner approval. Verified project `quiz-trail` / `724933345983`, built with production web configuration retrieved from the existing Hosting Firebase configuration endpoint, deployed the discussion composite index and waited for READY, deployed additive rules, initialized previously absent `config/comments.enabled=true`, then deployed Hosting. No question-bank publication or progress migration occurred.

## Included changes and live verification

- Monospace identity refresh: shared neutral theme tokens and locally bundled IBM Plex fonts, 17px reading text, restrained controls, correct/incorrect feedback precedence, and plain copy icon. Included in this release.
- Shared question discussion replaces private feedback after answering. Includes posting/editing/deleting, Like/Dislike, ten-item ranked pages, and resumable account-deletion cleanup. Its additive rules and index are deployed and comments are enabled. Legacy private feedback remains private.
- Live checks confirmed all seven HTML pages return 200, built assets load, the signed-out practice/summary gate makes no bank requests, both public sample pages work without JavaScript, and desktop/mobile layouts have no serious/critical accessibility violations. PMLE bank CORS/cache headers are correct; unauthenticated access to the private PAA bank returns 403.
- Live signed-in writes were not exercised: no authenticated browser session was available, and native-browser access was unavailable while the Mac was locked. The seven emulator flows passed before release, covering sign-in, restored progress, comments/reactions, account deletion, and owner/non-owner PAA access. A live signed-in answer/reload and discussion check remains recommended.
- Production web configuration is in ignored `.env.production.local`; no credentials or API keys are tracked. Existing Google default credentials authorized the deployment; there was no repository-scoped Firebase login session.

## Local verification cautions

- The user's local emulator contains seeded PMLE comments and personal test state. Do not run the Firebase browser suite against it: the suite clears accounts/data. Use a separate Auth emulator and separate Firestore project for integration checks; Auth popup endpoints ignore the API key and use their emulator's default project.
- The LAN preview configuration `.tmp/lan.vite.ts` is ignored. It proxies Auth, Firestore streaming and `/v1/projects`, plus the encrypted PMLE bank. The earlier missing-theme error cleared after restarting Vite; latest signed-out gate and PAA samples pass at the direct-IP HTTPS URL.
- PMLE retains legacy URLs, permanent IDs, storage paths and browser keys. PAA uses certification-scoped progress. Reset is scoped; account deletion is account-wide. The earlier private-bank publication is unchanged.

## Preserved bank state and cautions

- The sibling bank's pre-existing change to `questions/PMLE-0011.json` remains untouched. No bank source/tooling changes were needed, so question-bank preflight was not rerun. The ten newly public PAA samples were checked against linked official references; the rest of the PAA bank was not re-reviewed.
- Never publish the full PAA bank to the public bucket or frontend assets. Only the ten static samples listed in `question-bank.md` are approved for public use. Existing private-feedback retention is unchanged; old reports are never converted to shared comments.
- A Hosting rollback must account for older clients lacking comment cleanup during account deletion. Preserve the updated deletion path or handle cleanup explicitly; never delete comment data as a rollback shortcut.
- Verify local processes when resuming; do not assume test servers or emulators remain running.
