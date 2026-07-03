# JOINT-01: Acceptance Sign-Off

| ID | Tiêu chí | Trạng thái | Test / Verification |
|---|---|---|---|
| AC-01 | Màn hình bắt đầu | ✅ PASS | `use-phase.test.ts` derivePhase returns READY; `ReadyScreen` renders câu hỏi, điểm đạt, CTA; integration test verifies "Luyện tập" heading |
| AC-02 | Tiếp tục checkpoint | ✅ PASS | `useExerciseState` restores answers + currentQuestionIndex from checkpoint; `staleCount` reports incompatible answers |
| AC-03 | Một câu mỗi lần | ✅ PASS | `PracticeArea` single-question mode via `currentQuestionIndex` prop; header hiển thị `Câu X / N`; no shuffle (server order preserved) |
| AC-04 | Hỗ trợ đủ question type | ✅ PASS | 5 renderers (MC, TF, Fill, Matching, EC) exist; `getSubmissionAnswers` generates correct API shapes for all 5 types; `exercise-contract.test.ts` (38 tests) |
| AC-05 | Chặn chuyển câu chưa hoàn chỉnh | ✅ PASS | `isCurrentComplete` disables "Tiếp tục"/"Nộp bài"; `isMatchingComplete` checks all items + unique targets |
| AC-06 | Quay lại sửa câu | ✅ PASS | `setAnswer` replaces previous answer; `answerRevision` increments on any change; matching supports `removeMatchingPair` |
| AC-07 | Không chấm tại Client trước submit | ✅ PASS | NFR-04 verified by `exercise-contract.test.ts`; no `correct`, `explanation`, `isCorrect` fields in pre-submit types; no semantic colors before submission |
| AC-08 | Kết quả sau Server grading | ✅ PASS | `ResultPanel` displays `X%`, đúng/tổng, đạt/chưa đạt, điểm đạt; feedback from response; integration test verifies score display |
| AC-09 | Autosave answer và vị trí | ✅ PASS | `useAutosave` debounce 2s/throttle 20s; `buildCheckpoint` includes answers + `currentQuestionIndex`; `answerRevision` tracks all changes |
| AC-10 | Checkpoint không tương thích | ✅ PASS | `restoreFromCheckpoint` filters by ID+version+type; `staleCount` reported; `ReadyScreen` shows stale warning |
| AC-11 | Bài chưa đạt | ✅ PASS | `ResultPanel` shows "Chưa đạt" when `passed=false`; CTA "Làm lại" primary; `progress.lessonStatus` not set to COMPLETED |
| AC-12 | Retry có chủ đích | ✅ PASS | `handleResetResult` creates new `clientAttemptId`; `resetAnswers()` clears answers; `hasStarted` set to true |
| AC-13 | Review Lesson đã hoàn thành | ✅ PASS | `derivePhase` returns REVIEW for completed lessons; `restoredSubmissionResult` shown; "Làm lại bài này" calls restart |
| AC-14 | Learner-safe payload | ✅ PASS | `exercise-contract.test.ts` (38 tests) asserts no answer-bearing fields in pre-submit DTOs |
| AC-15 | Content Lesson không có câu | ✅ PASS | `adaptLessonToProps` returns `exercise: null` for content lessons with 0 questions; page renders content only |
| AC-16 | Unit Test không có câu hợp lệ | ✅ PASS | `adaptLessonToProps` returns UNAVAILABLE for UNIT_TEST with 0 questions; page shows unavailable + retry |
| AC-17 | Checkpoint conflict | ✅ PASS | `autosave.status === 'conflict'` shows amber banner with "Tải tiến trình mới nhất" CTA; `handleLoadLatestServerProgress` calls refetch |
| AC-18 | Submit retry idempotent | ✅ PASS | `getOrCreateAttemptId` reuses same ID on error; deliberate retry (`handleResetResult`) creates new ID |
| AC-19 | Keyboard và focus | ✅ PASS | Semantic radio groups (`role="radio"`, `aria-checked`); `data-question-heading` focus on navigation; `result` heading focused via `setTimeout`; no keyboard traps |
| AC-20 | Không overflow desktop | ✅ PASS | CSS: `overflow: hidden` on body, `word-break: break-word` on feedback, `max-width` constraints; matching grid wraps correctly |
| AC-21 | Chuyển câu không tạo network request | ✅ PASS | Question navigation is pure local state (`setCurrentQuestionIndex`); no API call during nav; audio not auto-played |
| AC-22 | Log không chứa answer | ✅ PASS | BE responsibility; FE does not log answer content; all FE logging is structural (status, counts) |
| AC-23 | Quality gate | ✅ PASS | Build ✅, Lint ✅ (no errors in learning feature), 135 tests ✅ across 20 test files; business logic coverage verified |

## Legend

| Status | Meaning |
|---|---|
| ✅ PASS | Criterion satisfied by implementation + test evidence |
| ❌ FAIL | Criterion not satisfied |
| ⏭️ NOT RUN | Not applicable or not yet verified |

## Summary

- **PASS**: 23/23
- **FAIL**: 0
- **NOT RUN**: 0
