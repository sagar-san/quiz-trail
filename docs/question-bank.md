# Question bank guide

`public/data/questions.csv` is the application's only question source. Do not maintain a second copy elsewhere in the repository.

Additional editorial columns are allowed and preserved even when the app does not consume them. The current bank includes `terminology_status` and `terminology_notes` for content maintenance.

## Updating questions

After editing the CSV, run:

```bash
npm run preflight
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
