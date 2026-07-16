# Session handoff

Last updated: 2026-07-16

## Current status

- Phase 1 local MVP is implemented on `main` and ready for product-owner review.
- Phase 2 has not started. Do not add Firebase/GCP work without the product owner's explicit approval.
- The app was last started with `npm run dev -- --host 127.0.0.1 --port 5173`; restart it if that process is no longer running.
- `public/data/questions.csv` is the canonical question source. The legacy root `quiz-bank.csv` is ignored and not loaded.

## Product decisions

- Current bank: 339 valid questions, expected to grow toward approximately 500.
- Support both `single_choice` and `multiple_choice`; multiple choice uses exact-set grading.
- Keep answer choices in their original A–E order.
- Shuffle question order once on every page load. The shuffled order remains stable for that tab session, while saved progress stays keyed by permanent question IDs.
- Initial filter is Unanswered. A newly answered question remains visible long enough to read its feedback before navigation.
- The active filter is saved immediately in a separate browser preference and restored on refresh; it does not require Save Progress.
- Progress saves explicitly to browser `localStorage`; only the last explicitly saved state survives reload.
- The introductory headline is intentionally restrained and inline. “Keep moving forward.” is smaller than “One question at a time.”
- Long question prompts use readable body-sized text rather than large heading typography.

## Recent work

- Added repository session-continuity instructions to `Agents.md`.
- Added Fisher–Yates per-load question shuffling and a deterministic unit test.
- Updated browser tests so they do not assume a fixed first question or correct first option.
- Refined introductory and question-prompt typography based on product-owner feedback.
- Fixed the refresh bug where saved `lastQuestionId` overrode the newly shuffled first question. Saved outcomes and bookmarks restore, but each reload starts from the new shuffled order.
- Added persistent browser filter preferences with a safe Unanswered fallback.

## Verification

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass — 28 tests across 7 test files
- Latest full coverage gate before the filter-preference addition: pass — 26 tests, 92.24% line coverage
- `npm run build`: pass
- `npm run e2e`: pass — 4 Chromium tests across desktop and mobile, including accessibility and horizontal-overflow checks
- CSV preflight: 339 valid rows; 334 single-choice, 5 multiple-choice; 0 invalid rows

## Known limitations

- Phase 1 progress is browser/device-local and disappears if site data is cleared.
- Clicking Previous or Next changes the saved return point and therefore marks progress dirty, although that return point no longer overrides the next page load's shuffled start.
- Browser unload warnings are best-effort; reload should not warn when the UI still says “Progress saved.”
- PayPal and Venmo controls remain hidden until valid environment URLs are supplied.

## Recommended next steps

1. Product owner manually reviews the current local UI and study flow.
2. Address any remaining Phase 1 polish requests in small commits.
3. Begin Phase 2 only after an explicit GO and receipt of the Firebase/GCP inputs listed in `docs/implementation-plan.md` section 5.1.
