# Decisions

## ADR-001 - Course Enrollment Is a First-Class Entity

- **Date:** 2026-07-02
- **Status:** Proposed
- **Context:** `User.lastActiveCourseId` cannot represent multiple Course states or completion history.
- **Decision:** Add `CourseEnrollment`; retain `lastActiveCourseId` temporarily as a compatibility projection.
- **Consequence:** Enrollment transitions require transactional consistency and migration for existing users.

## ADR-002 - General Progress Is Separate from Speaking Session Results

- **Date:** 2026-07-02
- **Status:** Proposed
- **Context:** Existing `UserLessonProgress` contains Speaking transcript/evaluation and requires `sessionId`.
- **Decision:** Add `LearnerLessonProgress` and `LearnerLessonAttempt`; do not overload the existing collection.
- **Consequence:** Speaking completion links to general progress after evaluation while preserving detailed Speaking history.

## ADR-003 - Learner DTOs Are Separate from Admin Models

- **Date:** 2026-07-02
- **Status:** Proposed
- **Context:** Raw Lesson/Question content can expose answers and authoring-only fields.
- **Decision:** Implement type-specific learner mappers and dedicated `/api/learning` endpoints.
- **Consequence:** Content-shape changes require updates to both Admin authoring contracts and learner mappers.

## ADR-004 - Server Owns Grading and Progress

- **Date:** 2026-07-02
- **Status:** Proposed
- **Decision:** Client submits responses and checkpoints only. Server calculates score, pass/fail, completion, and aggregate percentage.
- **Consequence:** Offline grading is not supported; submit endpoints require idempotency.

## ADR-005 - Course Final Exam Is Deferred

- **Date:** 2026-07-02
- **Status:** Proposed
- **Context:** `finalExamConfig` exists but there is no Course final-exam learner runtime.
- **Decision:** MVP Course completion uses required Lessons only.
- **Consequence:** A later final-exam feature must revise completion rules and acceptance criteria.

## ADR-006 - Payment UX Is Excluded

- **Date:** 2026-07-02
- **Status:** Accepted
- **Context:** Payment/subscription functionality was removed from the product.
- **Decision:** Remove Upgrade/Premium content from the Course-learning dashboard experience.
- **Consequence:** Access restrictions may use prerequisite/content policy only, never plan status.

## ADR-007 - Fixed Question IDs Are the Scored Exercise Source

- **Date:** 2026-07-02
- **Status:** Accepted
- **Context:** Lesson content can contain inline interactions while `practiceConfig.questionIds` references the server-owned Question bank. Grading both would create competing answer sources.
- **Decision:** Only supported published Questions referenced by `practiceConfig.questionIds` affect objective score and completion. Inline interactions remain instructional unless migrated into that set.
- **Consequence:** Learner DTOs must include sanitized fixed Questions; server grading must validate membership and Question version.

## ADR-008 - Runtime Dynamic Practice Is Deferred

- **Date:** 2026-07-02
- **Status:** Accepted
- **Context:** `DYNAMIC` exists in the model but there is no stable learner-runtime generation, snapshot, retry, or grading contract.
- **Decision:** Per-Lesson exercise MVP supports `FIXED` mode only. A dynamic Lesson is unavailable to learners until a separate contract is approved.
- **Consequence:** BE returns `422` for runtime dynamic exercise requests; Admin may retain the configuration for future work.

## ADR-009 - Every Objective Question Is Required

- **Date:** 2026-07-02
- **Status:** Accepted
- **Context:** Partial submission makes score denominators and completion behavior ambiguous.
- **Decision:** A valid objective attempt contains exactly one answer for every Question returned in the learner DTO.
- **Consequence:** FE validates missing answers before submit and BE independently rejects incomplete, extra, duplicate, or stale answers.

## Resolved Product Decisions

| ID | Accepted Decision | Date |
|---|---|---|
| OD-01 | Learners may study active/published Lessons freely in any order. `orderIndex` is presentation and recommendation only. | 2026-07-02 |
| OD-02 | A non-assessed Lesson has no minimum interaction requirement; explicit completion is sufficient. | 2026-07-02 |
| OD-03 | Speaking and Writing complete after valid submission; evaluation score does not block completion. | 2026-07-02 |
| OD-04 | Retries are allowed without a fixed limit; show both latest and best score. | 2026-07-02 |
| OD-05 | After Course completion, show congratulations with review and choose-another-Course actions. | 2026-07-02 |
| OD-06 | Activity-day timezone is `Asia/Ho_Chi_Minh` (Hanoi time). | 2026-07-02 |
| OD-07 | Do not hide the existing ranking surface; it remains outside Course-learning implementation scope. | 2026-07-02 |

No open product decision currently blocks implementation. New uncertainty must be added as a new OD before dependent work continues.
