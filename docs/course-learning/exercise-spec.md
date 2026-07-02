# Per-Lesson Exercise Specification

## Purpose

Define one consistent exercise lifecycle for every learner Lesson while preserving the interaction appropriate to each Lesson type. This document is the canonical source for exercise behavior; implementation details remain in `plan.md`.

## Current-State Findings

- `Lesson.practiceConfig.questionIds` links authored exercises to `Question` documents.
- The server can grade multiple choice, fill in the blank, true/false, matching, and error correction questions.
- The client has controls for those five objective question types.
- The learner Lesson response currently does not include sanitized practice questions.
- `LessonPlayerPage` currently submits an empty `responses` object and does not connect renderer answers to checkpoint or submission.
- Checkpoint persistence exists on the server, but the current player only changes a local save label.
- `DYNAMIC` practice generation is configured in the model but has no stable learner-runtime contract.

## Scope

### In Scope

- A learner-safe exercise block for every supported Lesson type.
- Restore, edit, autosave, submit, grade, retry, review, and result flows.
- Objective exercise types: `MULTIPLE_CHOICE`, `FILL_IN_BLANK`, `TRUE_FALSE`, `MATCHING`, and `ERROR_CORRECTION`.
- Subjective submission for `SPEAKING` and `WRITING`.
- Explicit completion for non-assessed content Lessons.
- Fixed question sets authored in Admin and referenced by `practiceConfig.questionIds`.

### Out of Scope

- Runtime `DYNAMIC` question generation.
- Peer review, teacher review, hints generated during an attempt, adaptive difficulty, offline submission, and timed exams.
- Learner use of `ESSAY` or `PRONUNCIATION` through the generic objective-question renderer.
- Changes to Admin authoring UX, except defects required to produce a valid published question set.

## Exercise Mode by Lesson Type

| Lesson type | Exercise mode | Required submission | Completion rule |
|---|---|---|---|
| `VOCAB` | Objective questions when published `questionIds` exist; otherwise explicit completion | All returned objective answers, or completion acknowledgement | Pass configured score, or explicit completion when non-assessed |
| `GRAMMAR` | Objective questions from `practiceConfig.questionIds` | All returned objective answers | Pass configured score; if no questions, explicit completion |
| `READING` | Objective comprehension questions | All returned objective answers | Pass configured score; if no questions, explicit completion |
| `LISTENING` | Objective questions using authored audio/stem | All returned objective answers | Pass configured score; if no questions, explicit completion |
| `SPEAKING` | Subjective speaking session | Valid server-owned speaking `sessionId` | Valid submission completes; evaluation is feedback only |
| `WRITING` | Subjective writing response | Text satisfying authored length constraints | Valid submission completes; evaluation is feedback only |
| `UNIT_TEST` | Objective assessment only | All returned objective answers | Pass configured score; zero valid questions makes the Lesson unavailable |

Inline interactions embedded in Lesson content may support learning, but only questions referenced by `practiceConfig.questionIds` affect score and completion. This prevents two competing grading sources.

## Objective Exercise Contract

### Learner-Safe Question

Every question returned to the learner contains:

- `id`: Question ObjectId as a string.
- `version`: positive Question version used for stale-content detection.
- `type`: one of the five supported objective types.
- `stem`: optional text, audio, and image.
- A type-specific learner payload containing only selectable/input data.

The pre-submit DTO must not contain `isCorrect`, `correctAnswers`, `isTrue`, `correctText`, answer mappings, rubric, or explanation.

### Response Shapes

```ts
type ObjectiveAnswer =
  | { questionId: string; questionVersion: number; type: 'MULTIPLE_CHOICE'; answer: { selectedOptionId: string } }
  | { questionId: string; questionVersion: number; type: 'FILL_IN_BLANK'; answer: { text: string } }
  | { questionId: string; questionVersion: number; type: 'TRUE_FALSE'; answer: { value: boolean } }
  | { questionId: string; questionVersion: number; type: 'MATCHING'; answer: { pairs: Record<string, string> } }
  | { questionId: string; questionVersion: number; type: 'ERROR_CORRECTION'; answer: { text: string } };
```

- Every returned question is required before submit.
- FE preserves the order returned by BE.
- BE rejects unknown, duplicate, missing, mismatched-type, or stale-version answers.
- Text comparison trims, lowercases, collapses whitespace, and normalizes surrounding punctuation. Accent/diacritic removal is not allowed unless authored as another accepted answer.
- Matching receives one mapping covering every left-side item; each right-side item can be used once.

## Subjective and Completion Submissions

```ts
type LessonSubmission =
  | { kind: 'OBJECTIVE'; answers: ObjectiveAnswer[] }
  | { kind: 'SPEAKING'; sessionId: string }
  | { kind: 'WRITING'; text: string; warmupAnswers?: Record<string, string> }
  | { kind: 'COMPLETION'; acknowledged: true };
```

- `SPEAKING` accepts only a completed session owned by the authenticated learner and current Lesson.
- `WRITING` trims the response and validates authored minimum/maximum word counts server-side.
- `COMPLETION` is accepted only when the Lesson has no scored question set and is not `UNIT_TEST`, `SPEAKING`, or `WRITING`.

## Checkpoint Shapes

Checkpoints use the same answer structure as submission and include only resumable learner state:

```ts
type ExerciseCheckpoint =
  | { kind: 'OBJECTIVE'; answers: ObjectiveAnswer[]; currentQuestionIndex: number }
  | { kind: 'WRITING'; text: string; warmupAnswers: Record<string, string> }
  | { kind: 'SPEAKING'; sessionId: string | null }
  | { kind: 'COMPLETION'; acknowledged: boolean };
```

FE saves after a meaningful answer change, debounced, and no more than once per 20 seconds during continuous input. It flushes the latest checkpoint before Lesson navigation and before submission. A stale checkpoint receives `409` with the latest checkpoint and version so FE can offer reload/reconcile behavior.

## Learner Flow

1. Learner opens a Lesson; FE loads content, sanitized exercise data, and saved checkpoint.
2. FE restores answers only when question IDs and versions still match.
3. Learner completes the exercise; FE displays progress such as `3/5 câu đã trả lời` without correctness.
4. Submit remains available, but selecting it with missing answers shows a validation summary and focuses the first unanswered question.
5. FE sends one idempotent submission with a stable `clientAttemptId` retained across network retry.
6. BE validates ownership and the current question set, grades on the server, persists one immutable attempt, and updates progress once.
7. FE shows score, pass/fail, per-question feedback, latest score, best score, and retry/next actions.
8. Retry starts a new attempt, keeps the Lesson completed if it was previously passed, and never lowers the stored best score.

## Result and Feedback

- Objective feedback may reveal the correct answer only after a valid submission.
- Each result item identifies the learner answer, correctness, correct answer, and explanation when authored.
- A failed attempt offers `Làm lại`; a passed attempt offers `Bài tiếp theo` and `Xem lại`.
- A completed Lesson opened later enters review mode. Starting another attempt requires an explicit `Làm lại` action.
- Submission errors preserve all local answers. Unknown server errors never clear the checkpoint.

## UI Requirements

- Place `Luyện tập` after the Lesson content in the same reading flow, not in a nested decorative card.
- Each question has a stable numbered heading and visible answered/unanswered state.
- Use native radio semantics for single choice and true/false; keyboard-operable controls for matching.
- Audio has a labelled play/pause control and unavailable fallback.
- The sticky Lesson footer contains previous, saved state, submit/complete, and next actions without causing page-level overflow.
- On submit, move focus to the validation summary or result heading.
- Correctness uses icon plus text, not color alone.

## Error and Recovery Rules

| Condition | Expected behavior |
|---|---|
| No valid questions on a content Lesson | Treat as non-assessed and show explicit completion |
| No valid questions on `UNIT_TEST` | Return `422`; show content unavailable |
| Question changed after load | Return `409 QUESTION_SET_CHANGED`; preserve local answers and offer reload |
| Duplicate `clientAttemptId` | Return the original attempt result without duplicate counters |
| Checkpoint conflict | Return latest server checkpoint/version; FE shows conflict recovery |
| Missing media | Keep text-based question usable when possible; otherwise mark the question unavailable and block submit with retry |
| Network failure during submit | Keep answers and reuse the same `clientAttemptId` on retry |
| Unsupported question type | Exclude from learner DTO and log content defect; block `UNIT_TEST` if no valid questions remain |

## Security and Observability

- All reads and submissions verify authenticated learner, enrollment, Lesson ancestry, and resource ownership.
- BE allowlists DTO fields per question type; recursive deletion alone is insufficient.
- Log exercise load defects, checkpoint conflicts, submit validation failures, pass/fail, duplicate attempts, and question-set changes without logging learner answer text or recording URLs.
- Rate-limit checkpoint and submit endpoints per user and Lesson.

## Readiness

This specification is `READY FOR IMPLEMENTATION` for fixed question sets. Runtime dynamic generation remains explicitly deferred.
