# Question bank guide

The canonical per-question JSON files and their validation/build scripts live
in the separate private `quiz-trail-question-bank` repository. With the two
repositories cloned as siblings, their default local path is:

```text
../quiz-trail-question-bank/questions/PMLE-####.json
```

The public application repository must not contain or commit a plaintext copy.
The private repository validates the JSON source, deterministically exports the
existing CSV contract, and builds the AES-GCM-encrypted `questions.bin` runtime
asset. Publishing that asset to the approved public Cloud Storage bucket is
independent of frontend builds and deployments.

The static SEO page at `sample-questions/index.html` is a deliberate exception: it contains a manually copied snapshot of ten questions and is not consumed by the practice application. Each sample retains its permanent ID in a `data-question-id` attribute. When one of those canonical questions changes, review the static snapshot separately and update it when the public sample should reflect the change.

The app consumes subject metadata for learner analytics and post-answer
context. JSON stores `exam_objectives`, `topics`, and `correct_answer` as arrays;
the generated CSV retains the existing semicolon- and comma-separated runtime
representations. Source, review-status, and terminology fields remain internal
and appear post-answer only when `?debug=true` is present.

## Updating questions

Edit only the matching `questions/<question_id>.json` file, or use the local
editor with `npm run editor`. Then run these commands from the private
question-bank repository:

```bash
npm test
npm run preflight
```

Agents and scripts should first run `npm run questions -- describe`, then use
the self-documenting question tool for structured reads, searches, dry-run
patches, writes, and validation. Generated CSV must not be edited directly.

`preflight` validates and summarizes the bank and reports exact and likely
near-duplicate prompts. Run `npm run duplicates` when only the duplicate report
is needed. Duplicate findings are review candidates; tooling never removes or
merges questions automatically.

To validate a candidate directory or exported CSV, pass its path. Add
`--compare` to summarize permanent-ID, prompt, and answer changes against the
current bank:

```bash
npm run preflight -- /path/to/candidate_questions --compare questions
```

For convenience, `npm run preflight` in the public application repository
delegates to the private repository.

An invalid JSON file or generated CSV row rejects the entire bank, preventing a
silently incomplete dataset from reaching learners. The browser derives the
question-bank version automatically from the exact decrypted payload bytes
using SHA-256; there is no manual version field to update.

`question_id` is permanent identity:

- Give every new question a new unique ID.
- Never delete, renumber, recycle, or reuse an existing ID or its JSON file.
- Keep the same ID for wording, explanation, or reference corrections when saved outcomes should remain attached.
- Use a new ID when changing what the question tests or changing its correct
  answer, so learners receive it as unanswered; retain the prior ID and row for
  historical continuity and set `is_retired` to `true` after deliberate product-owner review.

Retired JSON files remain in the canonical bank as historical records and are
excluded from the encrypted learner asset. Do not delete a file, materially replace its
question under the same ID, or assume that `is_outdated`/`review_status` removes
it from learner delivery. Retirement and unretirement require deliberate
product-owner review because historical learner progress may be affected.

## Canonical JSON shape

```json
{
  "question_id": "PMLE-0409",
  "question_type": "single_choice",
  "question": "Question copy",
  "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "" },
  "correct_answer": ["B"],
  "explanation": "Explanation copy",
  "reference_url": "https://cloud.google.com/...",
  "chatgpt_verified": true,
  "terminology_status": "",
  "terminology_notes": "",
  "exam_section": "Section",
  "exam_objectives": ["Objective"],
  "topics": ["Topic"],
  "difficulty": "Medium",
  "question_source": "Original Bank",
  "review_status": "Verified",
  "is_outdated": false,
  "is_retired": false
}
```

The generated `.tmp/questions.csv` retains the existing runtime column order;
learner progress continues to join by permanent `question_id`.

## Validation rules

- `question_type` must be `single_choice` or `multiple_choice`.
- Single-choice answers use a one-item array such as `["A"]`.
- Multiple-choice answers use an array such as `["A", "D"]` and are graded as an exact set.
- Each question needs at least two nonblank options; options A–E are supported.
- `correct_answer` may reference only nonblank options.
- `question`, `explanation`, and a valid answer are required.
- `reference_url` may be blank; when present it must use HTTP(S).
- `chatgpt_verified` may be `true`, `false`, or `null`.
- `is_retired` is boolean; retired files remain canonical but are omitted from the encrypted learner asset.

`npm run export:csv` generates the ignored `.tmp/questions.csv` compatibility
artifact. After preflight, build and verify the encrypted asset in the private repository.
Publishing it to `gs://quiz-trail-question-banks/questions.bin` is a separate
production action requiring explicit approval. The frontend fetches that object
directly, so a bank-only publication does not require rebuilding or deploying
the application. Frontend builds need the sibling private repository only to
import its intentionally public decryption key.
