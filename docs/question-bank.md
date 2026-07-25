# Question bank guide

The canonical `questions.csv` and its validation/build scripts live in the
separate private `quiz-trail-question-bank` repository. With the two
repositories cloned as siblings, its default local path is:

```text
../quiz-trail-question-bank/questions.csv
```

The public application repository must not contain or commit a plaintext copy. A production build validates the external CSV and emits only the AES-GCM-encrypted `/data/questions.bin` runtime asset. Set `QUESTION_BANK_PATH` to use a different local or CI location.

The static SEO page at `sample-questions/index.html` is a deliberate exception: it contains a manually copied snapshot of ten questions and is not consumed by the practice application. Each sample retains its permanent ID in a `data-question-id` attribute. When one of those canonical CSV questions changes, review the static snapshot separately and update it when the public sample should reflect the change.

The app consumes subject metadata for learner analytics and post-answer context. Semicolon-separated `exam_objectives` and `topics` values are treated as independent categories. Source, review-status, and terminology fields remain internal and appear post-answer only when `?debug=true` is present.

## Updating questions

After editing the CSV, run these commands from the private question-bank
repository:

```bash
npm test
npm run preflight
```

`preflight` validates and summarizes the bank and reports exact and likely
near-duplicate prompts. Run `npm run duplicates` when only the duplicate report
is needed. Duplicate findings are review candidates; tooling never removes or
merges questions automatically.

To validate a candidate file before replacing the canonical bank, pass its
path. Add `--compare` to summarize permanent-ID, prompt, and answer changes
against the current bank:

```bash
npm run preflight -- /path/to/questions_candidate.csv --compare questions.csv
```

For convenience, `npm run preflight` in the public application repository
delegates to the private repository.

An invalid row rejects the entire bank, preventing a silently incomplete dataset from reaching learners. The browser derives the question-bank version automatically from the exact CSV bytes using SHA-256; there is no manual version field to update.

`question_id` is permanent identity:

- Give every new question a new unique ID.
- Never delete, renumber, recycle, or reuse an existing ID or its source row.
- Keep the same ID for wording, explanation, or reference corrections when saved outcomes should remain attached.
- Use a new ID when changing what the question tests or changing its correct
  answer, so learners receive it as unanswered; retain the prior ID and row for
  historical continuity.

The treatment of duplicate, outdated, or invalid questions is intentionally
deferred for product review in the private question-bank repository. There is
currently no retirement mechanism. Do not delete a row, materially replace its
question under the same ID, add build filtering, or assume that
`is_outdated`/`review_status` removes it from learner delivery.

## Required columns

```text
question_id,question_type,question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,reference_url,chatgpt_verified,terminology_status,terminology_notes,exam_section,exam_objectives,topics,difficulty,question_source,review_status,is_outdated
```

Question content and metadata remain in the CSV; learner progress continues to join by permanent `question_id`.

## Validation rules

- `question_type` must be `single_choice` or `multiple_choice`.
- Single-choice answers use one key such as `A`.
- Multiple-choice answers use a comma-separated set such as `A,D` and are graded as an exact set.
- Each question needs at least two nonblank options; options A–E are supported.
- `correct_answer` may reference only nonblank options.
- `question`, `explanation`, and a valid answer are required.
- `reference_url` may be blank; when present it must use HTTP(S).
- `chatgpt_verified` may be `TRUE`, `FALSE`, or blank.

After preflight, run the public application's normal tests and production build
before committing and deploying the updated bank. The application build calls
the private repository's validated AES-GCM asset builder. `QUESTION_BANK_PATH`
can select a candidate CSV, but the private tooling repository must remain
available beside the application.
