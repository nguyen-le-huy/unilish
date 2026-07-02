---
feature: course-learning
status: READY FOR IMPLEMENTATION
owner: BA
last_updated: 2026-07-02
related_client:
  - client/src/features/dashboard/home
  - client/src/features/dashboard/recommend-course
  - client/src/features/dashboard/learning
related_server:
  - server/src/models/mongo/course.model.ts
  - server/src/models/mongo/unit.model.ts
  - server/src/models/mongo/lesson.model.ts
  - server/src/models/mongo/user-lesson-progress.model.ts
---

# Learner Course Learning

## Summary

This feature lets a learner enroll in a Course, view its Unit/Lesson roadmap, study every supported Lesson type, save progress, resume across sessions, submit assessed work, and complete the Course.

The Course-only curriculum is authoritative. Course Series and subscription/payment behavior are excluded.

## Canonical Documents

- [Requirements](requirements.md)
- [UX and design specification](design-spec.md)
- [Per-Lesson exercise specification](exercise-spec.md)
- [User flows](user-flows.md)
- [API contract](api-contract.md)
- [Data model](data-model.md)
- [Acceptance criteria](acceptance-criteria.md)
- [Decisions](decisions.md)
- [FE/BE execution plan](../plan.md)

## Current State

- Course, Unit, Lesson, content authoring, recommendation, and `User.lastActiveCourseId` exist.
- The learner dashboard currently displays mock Course/progress/activity values.
- `/dashboard/course/:slug` is a placeholder.
- No general enrollment, lesson checkpoint, objective submission, or Course completion domain exists.
- The existing `UserLessonProgress` collection is Speaking-session-specific and must not be treated as general Course progress.

## Readiness

Status is `READY FOR IMPLEMENTATION`. Navigation, completion, retry, post-completion, timezone, and ranking decisions were confirmed on 2026-07-02 and recorded in [decisions.md](decisions.md).

## Traceability

Implementation tasks must reference `FR-*`, `NFR-*`, and `AC-*`. API or business-rule changes require updates to all affected documents before FE/BE implementation continues.
