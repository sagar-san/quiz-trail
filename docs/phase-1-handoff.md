# Phase 1 handoff — local MVP

Date: 2026-07-16  
Status: Ready for product-owner review  
Phase 2: Not started

## Delivered behavior

- Loads and validates the complete canonical `public/data/questions.csv` file.
- Supports 334 single-choice and 5 multiple-choice questions.
- Shows immediate correctness feedback, explanation, and optional reference link.
- Tracks attempted, correct, incorrect, saved, and remaining counts.
- Provides All, Unanswered, Incorrect, and Saved views.
- Allows independent save-for-later state.
- Explicitly saves compact progress to `localStorage` and restores it after reload.
- Warns about unsaved changes when the browser supports unload warnings.
- Reconciles removed question IDs safely when the bank changes.
- Resets local progress only after confirmation.
- Works at desktop and representative mobile widths with keyboard/touch controls.
- Hides invalid or absent PayPal/Venmo links.

## CSV preflight

| Check | Result |
|---|---|
| Canonical file | `public/data/questions.csv` |
| Valid rows | 339 |
| Single choice | 334 |
| Multiple choice | 5 |
| Four-option rows | 334 |
| Five-option rows | 5 |
| Blank reference URLs | 0 |
| Invalid rows | 0 |
| SHA-256 | `0517e5274ba5475f68e748a1ca894fe6f511bd50bdebf58282f9e69ed4f9f475` |

## Automated gate

| Command | Result |
|---|---|
| `npm ci` | Pass |
| `npm run preflight` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:coverage` | Pass — 25 tests; 91.93% line coverage |
| `npm run build` | Pass |
| `npm run e2e` | Pass — 4 Chromium tests across desktop and mobile |

The browser suite covers the real CSV, answering three questions, correct/incorrect feedback, save for later, explicit save, reload/restore, filtering, removal from Saved, reset, serious/critical automated accessibility findings, and horizontal overflow.

## Product-plan decisions incorporated

- `public/data/questions.csv` is the application source of truth.
- The current bank is described as 339 questions, growing toward approximately 500.
- CSV field names exactly match the canonical file.
- Multiple choice uses checkbox selection and exact-set grading for comma-separated answer keys.
- The initial view is All so answer feedback remains on screen; filtering remains explicit.

## Known Phase 1 limitations

- Progress is limited to one browser/device and disappears if site data is cleared.
- Only explicitly saved changes survive reload; unload warnings are best-effort on mobile.
- The legacy root `quiz-bank.csv` remains on disk but is ignored and never loaded by the app.
- Payment links are absent until valid environment values are supplied.
- There is no identity, cross-device resume, Firestore, hosting configuration, or cloud security in Phase 1.

## Product-owner review

Run `npm run dev`, then follow the manual demo in `docs/implementation-plan.md` section 4.2. Phase 2 must not begin until the product owner explicitly approves the local quiz behavior and supplies the Firebase/GCP inputs listed in section 5.1.
