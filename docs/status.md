# Current status

Last reviewed: 2026-11-03

## Shared discussion implementation — awaiting production approval

- Shared comments replace the private feedback form after answering. Cloud learners can post, edit/delete their own comments, Like/Dislike, and navigate ten-item cursor pages ranked by net score, creation time and ID. Guests get a sign-in invitation; local mode makes no comment requests.
- Additive Firestore rules enforce paired reaction/count changes, PAA preview access, author-only edits and tombstones, and the write-disable switch. Legacy feedback documents, privacy rules and private reviewer tooling remain unchanged.
- Account deletion marks cleanup, removes comment text/attribution and own votes in bounded batches, then deletes progress and identity. Failure stops before identity deletion; Settings → Delete account resumes. Other tabs cannot add comment data after the marker.
- Verification passed: typecheck, ESLint, 82 unit/component tests, one Auth emulator test, 26 Firestore rules/storage tests, 24 desktop/mobile browser checks, seven Firebase browser flows, and the six-entry Firebase-mode build. Final discussion styling was rechecked with the two desktop/mobile flows; mobile screenshot inspected. Security tests include all reaction transitions, concurrent users, forged writes, nanosecond/tied pagination, disabled writes, multi-batch cleanup, interrupted cleanup, and preview restrictions.
- Build compilation passed, but production web configuration and live index readiness have not been verified in this checkout. Browser flows used explicit emulator-only placeholder configuration. Rebuild with verified production configuration before deploying.
- No production deployment, config initialization, rules/index update or data migration was performed. After approval follow `release-runbook.md`: deploy indexes and wait until ready, deploy additive rules and initialize `config/comments.enabled`, deploy the frontend, then smoke-test. A missing comments config intentionally disables new writes.

## Existing production release

- The last recorded Hosting release is frontend commit `5e5d55d` at https://quiz-trail.web.app/, with homepage/navigation/FAQ/sign-in/tip-link changes. It still has the private feedback interface until the discussion release is approved.
- Previously deployed Firestore rules from `e035664` and private-bank publication from private commit `4892a87` protect PAA with the verified Google preview-owner predicate. Those live rules do not yet include this checkout's additive comments rules. Production access was not rechecked during this implementation.
- PMLE retains legacy URLs, permanent IDs, storage paths and browser keys. PAA uses certification-scoped progress. Reset is scoped; account deletion is account-wide.

## Preserved bank state and cautions

- The sibling bank's pre-existing change to `questions/PMLE-0011.json` remains untouched. No bank source/tooling changes were needed, so question-bank preflight was not rerun. PAA content was not independently fact-checked.
- Never publish PAA to the public bucket or frontend assets. Existing private-feedback retention is unchanged; old reports are never converted to shared comments.
- A Hosting rollback must account for older clients lacking comment cleanup during account deletion. Preserve the updated deletion path or handle cleanup explicitly; never delete comment data as a rollback shortcut.
- Verify local processes when resuming; do not assume test servers or emulators remain running.
