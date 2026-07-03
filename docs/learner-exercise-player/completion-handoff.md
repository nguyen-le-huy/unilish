# JOINT-02: FE Completion Handoff Report

## 1. Screens, flows, and components changed

### New files created
| File | Purpose |
|---|---|
| `hooks/use-phase.ts` | Phase state machine (LOADING, READY, ANSWERING, SUBMITTING, RESULT, REVIEW, STALE, UNAVAILABLE, ERROR) |
| `hooks/__tests__/use-phase.test.ts` | 25 tests for phase transitions |
| `hooks/__tests__/use-exercise-state.test.ts` | 14 tests for isEmptyAnswer, isMatchingComplete |
| `hooks/__tests__/use-autosave.test.ts` | 9 tests for autosave, conflict, permissionDenied |
| `components/ReadyScreen/ReadyScreen.tsx` | READY phase UI with question count, passing score, start/continue CTA |
| `components/ReadyScreen/ReadyScreen.module.css` | READY screen styling |
| `components/renderers/practice/StemMedia.tsx` | Audio/image media renderer with error fallback |
| `pages/LessonPlayerPage/LessonPlayerPage.integration.test.tsx` | Integration test for READY→ANSWERING→RESULT flow |
| `docs/learner-exercise-player/acceptance-signoff.md` | AC-01 to AC-23 sign-off |

### Modified files
| File | Changes |
|---|---|
| `hooks/use-exercise-state.ts` | Restore currentQuestionIndex, answerRevision tracking, staleCount, isQuestionComplete (matching), removeMatchingPair |
| `hooks/use-autosave.ts` | permissionDenied status, permissionBlockedRef stops retry loop |
| `components/renderers/practice/PracticeArea.tsx` | Single-question mode via currentQuestionIndex, player header (Câu X/N, progress bar), type labels, Enter key, matching pair removal |
| `components/renderers/practice/practice-answer-utils.ts` | Re-exports isEmptyAnswer, isMatchingComplete from use-exercise-state |
| `components/renderers/practice/MultipleChoice.tsx` | StemMedia integration, role="radio", aria-checked |
| `components/renderers/practice/TrueFalse.tsx` | StemMedia integration, role="radio", aria-checked |
| `components/renderers/practice/FillInBlank.tsx` | StemMedia integration, Enter key → Tiếp tục |
| `components/renderers/practice/Matching.tsx` | Pair symbols (❶❷❸...), click-to-remove, StemMedia |
| `components/renderers/practice/ErrorCorrection.tsx` | Textarea, "Viết lại câu đúng" label, StemMedia |
| `components/renderers/practice/Practice.module.css` | Type badge, textarea, matching symbol, player header, progress bar, stem media |
| `components/renderers/LessonRenderer.tsx` | Pass currentQuestionIndex, onNextQuestion, isCurrentComplete, removeMatchingPair |
| `components/result/ResultPanel.tsx` | % score display, đúng/tổng count, collapsible feedback (aria-expanded), passing score |
| `components/result/ResultPanel.module.css` | Score percent, correctCount, passingInfo, expandIcon, feedbackItemHeader button styles |
| `pages/LessonPlayerPage/LessonPlayerPage.tsx` | Phase-based rendering, question navigation, conflict banner, stale handling, 401/403 stop, saveFn typed |
| `pages/LessonPlayerPage/LessonPlayerPage.module.css` | Question nav, answeredCount, submitting overlay, conflict banner, permissionDenied |
| `pages/LessonPlayerPage/LessonPlayerPage.test.tsx` | Mock update for new exerciseState fields |
| `api/save-checkpoint.ts` | Checkpoint payload typed to ExerciseCheckpointKind |

## 2. Endpoints integrated

| Endpoint | Method | Used by |
|---|---|---|
| `/learning/lessons/:lessonId` | GET | `getLesson` — load lesson data on mount |
| `/learning/lessons/:lessonId/start` | POST | `startLesson` — idempotent start on mount |
| `/learning/lessons/:lessonId/checkpoint` | PATCH | `saveCheckpoint` — autosave answers + index |
| `/learning/lessons/:lessonId/submit` | POST | `submitLesson` — submit for grading |
| `/learning/lessons/:lessonId/restart` | POST | `restartLesson` — restart completed lesson |

All endpoints match `docs/learner-exercise-player/api-contract.md`.

## 3. Commands run and results

| Command | Result |
|---|---|
| `cd client && npm run build` | ✅ PASS (2.70s, 0 errors) |
| `cd client && npm run lint` | ✅ PASS (0 errors in learning feature; pre-existing errors in other features unchanged) |
| `cd client && npx vitest run` | ✅ PASS (20 files, 135 tests) |

### Test breakdown
| Test file | Tests | Status |
|---|---|---|
| `hooks/__tests__/use-phase.test.ts` | 25 | ✅ |
| `hooks/__tests__/use-exercise-state.test.ts` | 14 | ✅ |
| `hooks/__tests__/use-autosave.test.ts` | 9 | ✅ |
| `types/__tests__/exercise-contract.test.ts` | 38 | ✅ |
| `pages/LessonPlayerPage/LessonPlayerPage.test.tsx` | 2 | ✅ |
| `pages/LessonPlayerPage/LessonPlayerPage.integration.test.tsx` | 1 | ✅ |
| Other pre-existing tests (14 files) | 46 | ✅ |

## 4. Contract verification

- ✅ All endpoints match `api-contract.md`
- ✅ Request/response types (`LearnerLessonDto`, `ObjectiveAnswer`, `ExerciseCheckpointKind`, `LessonSubmissionKind`, `SubmissionResult`) match contract
- ✅ No answer key or correctness in pre-submit DTOs (NFR-04, verified by 38 tests)
- ✅ Score semantics: `score`, `latestScore`, `bestScore` as percentages
- ✅ `clientAttemptId` reuse on timeout, new ID on deliberate retry
- ✅ Idempotency via `Idempotency-Key` header on checkpoint and submit

## 5. Contract mismatches

**None.** All FE types and endpoints match the shared `api-contract.md`.

## 6. Residual UX/accessibility risks

| Risk | Level | Mitigation |
|---|---|---|
| Audio in Matching/Fill/TrueFalse renderers not tested | Low | `StemMedia` component handles audio/image for all types; ErrorCorrection uses `showText={false}` to avoid duplicate text |
| `crypto.randomUUID()` in jsdom | Low | Verified available via JSDOM; used for `clientAttemptId` and idempotency keys |
| Matching pair symbols limited to 8 (❶-❽) | Low | Sufficient for all current question sets; would need extension beyond 8 items |
| ResultPanel overlay does not trap focus to modal | Medium | `aria-modal="true"` is set; keyboard users can tab outside; acceptable per design spec (no forced modal) |
| Content renderers mocked in integration test | Low | Content rendering is independently tested via `VocabRenderer.test.tsx`; integration test focuses on exercise flow |
| No `beforeunload` guard for writing/speaking answers | Medium | Only `autosave.status` checked; if autosave is 'saved' but writing text changed, unsaved warning won't trigger |

## 7. Files that should NOT be touched

- `admin/` — No Admin/CMS changes in this feature
- `server/` — All BE changes are separate; FE does not modify server code
- `client/DESIGN.md` — Visual design reference, not code
- `client/src/features/dashboard/placement-test/` — Existing feature, preserved
- `client/src/features/marketing/` — Existing feature, preserved
- `client/src/features/auth/` — Existing feature, preserved
- `client/src/features/dashboard/shadowing/` — Existing feature, preserved
- `client/src/features/dashboard/ai-voice/` — Existing feature, preserved
- `client/src/features/dashboard/user/` — Existing feature, preserved
- `mobile-blocker` — Not modified
