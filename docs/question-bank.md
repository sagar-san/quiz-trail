# Question bank guide

`public/data/questions.csv` is the application's only question source. Do not maintain a second copy elsewhere in the repository.

The app consumes subject metadata for learner analytics and post-answer context. Semicolon-separated `exam_objectives` and `topics` values are treated as independent categories. Source, review-status, and terminology fields remain internal and appear post-answer only when `?debug=true` is present.

## Updating questions

After editing the CSV, run:

```bash
npm run preflight
```

To validate a candidate file before replacing the canonical bank, pass its path. Add
`--compare` to summarize permanent-ID, prompt, and answer changes against the current bank:

```bash
npm run preflight -- public/data/questions_candidate.csv --compare public/data/questions.csv
```

An invalid row rejects the entire bank, preventing a silently incomplete dataset from reaching learners. The browser derives the question-bank version automatically from the exact CSV bytes using SHA-256; there is no manual version field to update.

`question_id` is permanent identity:

- Give every new question a new unique ID.
- Keep the same ID for wording, explanation, or reference corrections when saved outcomes should remain attached.
- Use a new ID when changing what the question tests or changing its correct answer, so learners receive it as unanswered.
- Removing an ID safely removes its saved outcome and bookmark when progress is next reconciled.

## Required columns

```text
question_id,question_type,question,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,reference_url,chatgpt_verified
```

Analytics also requires `exam_section`, `exam_objectives`, `topics`, `difficulty`, `question_source`, `review_status`, `is_outdated`, `terminology_status`, and `terminology_notes`. Question content and metadata remain in the CSV; learner progress continues to join by permanent `question_id`.

## Validation rules

- `question_type` must be `single_choice` or `multiple_choice`.
- Single-choice answers use one key such as `A`.
- Multiple-choice answers use a comma-separated set such as `A,D` and are graded as an exact set.
- Each question needs at least two nonblank options; options A–E are supported.
- `correct_answer` may reference only nonblank options.
- `question`, `explanation`, and a valid answer are required.
- `reference_url` may be blank; when present it must use HTTP(S).
- `chatgpt_verified` may be `TRUE`, `FALSE`, or blank.

After preflight, run the normal tests and production build before committing and deploying the updated bank.
