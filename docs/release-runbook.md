# Quiz Trail release runbook

Use this guide to start the app, run Firebase integration checks, deploy production, or recover a release. Read `docs/status.md` and check `git status --short` first.

## Targets and safety

- Production URL: <https://quiz-trail.web.app>
- Firebase project ID: `quiz-trail`
- Firebase project number: `724933345983`
- Committed Firebase alias: `production`
- Development backend: local Firebase emulators
- GitHub: `git@github.com:Ameenota/quiz-trail.git`

Never infer permission to deploy from a TODO or prior deployment. Obtain explicit product-owner approval for each production deployment and for live Firestore rules, billing, App Check enforcement, OAuth, or domain changes. Never print or commit `.env.local`, API keys, or Firebase CLI credentials.

Repository Firebase commands use the ignored config directories:

```bash
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache
```

## Run locally

Local browser-storage mode needs no Firebase configuration:

```bash
nvm use
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Open <http://127.0.0.1:5173> for the static landing page or <http://127.0.0.1:5173/practice/> for the practice application.

## Run with Firebase emulators

Use two terminals.

Terminal 1:

```bash
npm run emulators
```

Wait for Auth `9099`, Firestore `8080`, Hosting `5002`, and Emulator UI `4000` to report ready.

Terminal 2:

```bash
npm run dev:firebase -- --host 127.0.0.1 --port 5173
```

Open the app at <http://127.0.0.1:5173/practice/> and the Emulator UI at <http://127.0.0.1:4000>.

Stop both processes with Ctrl-C when finished. Do not start duplicate emulator processes; inspect current terminal/process state first.

## Verification gates

For ordinary application changes:

```bash
npm run typecheck
npm run lint
npm test
npm run e2e
```

For question-bank changes, also run:

```bash
npm run preflight
```

For authentication, Firestore, security-rule, Settings, or account-deletion changes, also run:

```bash
npm run test:auth
npm run test:rules
```

Then start `npm run emulators` and a Firebase-mode app on the port expected by `playwright.firebase.config.ts`:

```bash
npm run dev:firebase -- --host 127.0.0.1 --port 5174
npm run e2e:firebase
```

`e2e:firebase` currently expects already-running emulators and the app at `127.0.0.1:5174`.

## Build a production release

The Vite build reads Firebase web configuration from the ignored local environment file. Confirm it exists without displaying sensitive values.

```bash
VITE_DATA_MODE=firebase npm run build
```

Inspect `dist/index.html`, the other public HTML entry points, and `dist/practice/index.html` when titles, metadata, routing, or asset loading changed. Do not deploy a local-mode build.

## Authenticate and verify the target

If the repository-scoped Firebase CLI session is not authenticated:

```bash
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache ./node_modules/.bin/firebase login
```

Before every deployment, verify all of the following:

```bash
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache ./node_modules/.bin/firebase login:list
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache ./node_modules/.bin/firebase projects:list
sed -n '1,80p' .firebaserc
git status --short --branch
git log -1 --oneline
```

Stop if the authenticated account lacks access, the alias does not resolve to `quiz-trail`, the project number is not `724933345983`, the intended release is not committed, or unrelated changes remain.

## Commit and push

Review the diff, stage only intended files, commit, and push before deployment:

```bash
git diff --check
git status --short
git add <intended-files>
git commit -m "<release message>"
git push origin main
```

Do not overwrite or discard unrelated user changes.

## Deploy

Hosting-only release:

```bash
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache ./node_modules/.bin/firebase deploy --only hosting --project production
```

Deploy rules or indexes only when they changed, passed emulator tests, and were explicitly approved:

```bash
XDG_CONFIG_HOME=.tmp/firebase-config XDG_CACHE_HOME=.tmp/firebase-cache ./node_modules/.bin/firebase deploy --only firestore:rules,firestore:indexes --project production
```

## Smoke-test production

At minimum:

```bash
curl -sS -I https://quiz-trail.web.app/
curl -sS -I https://quiz-trail.web.app/practice/
curl -sS -I https://quiz-trail.web.app/faq/
curl -sS -I https://quiz-trail.web.app/sample-questions/
curl -sS -I https://quiz-trail.web.app/data/questions.csv
curl -sS https://quiz-trail.web.app/
```

Confirm HTTP 200 responses, expected HTML metadata and asset names, and `Cache-Control: no-cache` for the CSV. In a browser, test sign-in, one answer, Save Progress, reload/restore, avatar menu, and Settings when those flows changed.

Record the deployed commit, verification results, and remaining work in `docs/status.md`, then commit and push that handoff update.

## Rollback

For an urgent Hosting-only rollback, use Firebase Console → Hosting → Release history to roll back to the last known-good release. Record which release was restored.

For a source-controlled correction, prefer `git revert <bad-commit>`, rerun the verification gates, rebuild in `firebase` mode, push the revert, and deploy Hosting again. Do not use `git reset --hard` or rewrite shared history.

Firestore rule and data changes need case-specific recovery; a Hosting rollback does not revert them. Stop and obtain product-owner approval before changing live rules or data.

## Common failures

- **Firebase CLI unauthenticated:** run the repository-scoped login command, then verify account and project again.
- **Firestore emulator cannot find Java:** use Java 21+. Apple Silicon scripts already include Homebrew's `/opt/homebrew/opt/openjdk@21/bin`.
- **Port 5000 unavailable:** this repository intentionally uses Hosting emulator port 5002 because macOS may reserve 5000.
- **Port permission or occupancy errors:** stop duplicate processes or approve local listening when the execution sandbox requests it.
- **`e2e:firebase` connection refused:** start the Firebase-mode Vite server on port 5174; confirm emulators are also running.
- **Google sign-in says unauthorized domain:** do not alter OAuth or authorized-domain settings without explicit approval.
- **Stale Firestore write:** reload the app before saving so newer progress is not overwritten.
