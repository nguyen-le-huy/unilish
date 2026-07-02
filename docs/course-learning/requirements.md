# Requirements

## Objective

Provide a reliable learning workflow from Course selection through completion while ensuring progress is server-owned and learner payloads never expose answer keys before submission.

## Actors

- **Learner:** enrolls, studies, submits work, resumes, reviews, and completes a Course.
- **Content creator:** authors Course, Unit, Lesson, media, and assessments in Admin; outside this feature's UI scope.
- **System:** enforces access, sequencing, grading, checkpointing, aggregation, and content safety.

## In Scope

- Multiple Course enrollments with one active Course.
- Dynamic current-Course dashboard card.
- Course overview and Unit/Lesson roadmap.
- Learner-safe delivery for `VOCAB`, `GRAMMAR`, `READING`, `LISTENING`, `SPEAKING`, `WRITING`, and `UNIT_TEST`.
- Checkpoints, study duration, attempts, grading, retry, resume, and completion.
- Monthly Course-learning summary and activity days.

## Out of Scope

- Payment, Premium, Upgrade, or plan-based locking.
- Social ranking, teams, certificates, offline mode, and notifications.
- Content authoring in the learner client.
- Adaptive curriculum ordering.
- Course final-exam runtime in MVP.
- Full mobile redesign while `MobileBlocker` remains active.

## Functional Requirements

| ID | Priority | Requirement |
|---|---|---|
| FR-01 | Must | A learner can enroll in an active Course. |
| FR-02 | Must | A learner can have multiple enrollments but exactly one active Course. |
| FR-03 | Must | Dashboard current-Course data and progress come from the server. |
| FR-04 | Must | The learner can view ordered Units and Lessons with status and lock reason. |
| FR-05 | Must | Learner APIs expose only active/published curriculum and sanitized content. |
| FR-06 | Must | A learner can start and resume a Lesson after refresh or a new authenticated session. |
| FR-07 | Must | Every current Lesson type has a supported learner renderer. |
| FR-08 | Must | Objective answers are graded by the server. |
| FR-09 | Must | Completion updates Lesson, Unit, Course, enrollment, and next-Lesson state consistently. |
| FR-10 | Must | Enroll, checkpoint, submit, and complete operations are idempotent. |
| FR-11 | Must | Course progress is calculated from required published Lessons by the server. |
| FR-12 | Must | Monthly time and activity use persisted active-learning intervals. |
| FR-13 | Should | Assessed Lessons support retry without losing the best score. |
| FR-14 | Should | Completed Lessons can be reviewed without duplicate completion counts. |
| FR-15 | Should | Unavailable Course/Lesson content provides a user-readable reason. Lesson order does not lock free navigation. |
| FR-16 | Must | Every Lesson has exactly one completion path: objective exercise, valid Speaking/Writing submission, or explicit non-assessed completion. |
| FR-17 | Must | Learner Lesson data includes a type-safe, learner-safe fixed exercise set and question versions when an objective exercise exists. |
| FR-18 | Must | FE restores exercise answers from the latest compatible checkpoint and submits the actual learner responses. |
| FR-19 | Must | BE validates answer completeness, question membership, type, version, and payload shape before grading. |
| FR-20 | Must | Post-submit results include per-question feedback, latest score, best score, and retry/next actions without exposing answers before submission. |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Course roadmap API p95 is below 500 ms under normal production load. |
| NFR-02 | Duplicate checkpoint/submit requests do not double-count time, attempts, or completion. |
| NFR-03 | Automatic checkpoints are sent at most once per 20 seconds unless triggered by explicit navigation/submission. |
| NFR-04 | No pre-submit response contains correct answers or answer-derived explanations. |
| NFR-05 | Every learner resource read verifies authentication, enrollment/review access, active curriculum, and Course ancestry. |
| NFR-06 | New UI supports keyboard navigation, semantic controls, visible focus, and reduced motion. |
| NFR-07 | Media streams, timers, listeners, recordings, and requests are cleaned up on unmount/navigation. |
| NFR-08 | Dashboard, roadmap, and player provide loading, empty, retryable error, unavailable, and completed states. |
| NFR-09 | Progress is deterministic, server-owned, and never accepted as a percentage from the client. |
| NFR-10 | TanStack Query owns server state; Course/progress data is not duplicated in Zustand. |
| NFR-11 | Exercise DTO and submit payload are discriminated unions; generic unbounded `unknown` payloads are not accepted at the route boundary. |
| NFR-12 | A failed or uncertain checkpoint/submit request preserves learner input and reuses its idempotency key when retried. |

## Business Rules

1. Re-enrolling reactivates an existing enrollment instead of creating a duplicate.
2. Activating a Course pauses the previous active enrollment atomically.
3. `User.lastActiveCourseId` is a compatibility pointer, not the source of enrollment truth.
4. Progress percentage equals completed required published Lessons divided by total required published Lessons, rounded to the nearest integer.
5. A Unit completes when all required published Lessons within it complete.
6. A Course completes when all required published Lessons complete; final exam is excluded from MVP.
7. Learners may open active/published Lessons in any order. `orderIndex` controls presentation and recommended-next behavior only.
8. A non-assessed Lesson has no minimum interaction requirement; explicit completion is sufficient.
9. Objective assessed Lessons complete when server score meets `practiceConfig.passingScore`.
10. Speaking and Writing complete after a valid submission; evaluation score does not block completion.
11. Retries are unlimited. The UI shows both latest and best score, and completion is never reversed.
12. After Course completion, show congratulations with review and choose-another-Course actions.
13. Activity dates use `Asia/Ho_Chi_Minh`.
14. Active study time is server-bounded per checkpoint interval.
15. Inactive Course/Unit/Lesson content cannot be started, resumed, or completed by learners.
16. Only `practiceConfig.questionIds` questions affect objective score; embedded inline interactions are instructional unless explicitly migrated into that set.
17. Every returned objective question is required before submission.
18. Objective submissions with stale Question versions are rejected with `409` and are not graded.
19. `UNIT_TEST` requires at least one valid published objective question; other content Lessons with no valid questions use explicit completion.
20. Runtime `DYNAMIC` question generation is excluded from this implementation; learner exercises use fixed authored question sets.

## Dependencies

- Active Course-only migration and learner recommendation DTO consistency.
- Admin-authored Lesson payloads valid for each Lesson type.
- Existing auth refresh flow and protected dashboard layout.
- Existing audio/speech providers for Listening/Speaking where applicable.
