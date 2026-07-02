---
feature: course-learning
status: READY FOR IMPLEMENTATION
owner: BA
last_updated: 2026-07-02
agents:
  - BE
  - FE
---

# Learner Course Learning - FE/BE Execution Plan

Canonical BA specifications are maintained in [`docs/course-learning/`](course-learning/README.md):

- [Requirements](course-learning/requirements.md)
- [UX and design specification](course-learning/design-spec.md)
- [Per-Lesson exercise specification](course-learning/exercise-spec.md)
- [User flows](course-learning/user-flows.md)
- [API contract](course-learning/api-contract.md)
- [Data model](course-learning/data-model.md)
- [Acceptance criteria](course-learning/acceptance-criteria.md)
- [Decisions](course-learning/decisions.md)

This file defines implementation order and ownership only. The canonical documents take precedence for business behavior and contracts.

## Working Agreement

- **BE Agent** owns `server/`, migrations, learner DTOs, grading, progress consistency, security, and backend tests.
- **FE Agent** owns `client/`, routes, Query integration, renderers, responsive/accessibility behavior, and frontend tests.
- **Before every phase and every task, both agents must read the applicable technical documents using the mandatory protocol below.** A previous summary or earlier reading is not sufficient after documents change.
- Every task and test must reference applicable `FR-*`, `NFR-*`, and `AC-*` IDs.
- Neither agent may silently change an API or business rule. Update the canonical document first.
- FE may build typed shells against approved fixtures, but production integration waits for the relevant BE contract gate.
- Existing user changes in the worktree must not be reverted.

## Mandatory Technical-Document Reading Protocol

This protocol applies to **BE and FE before starting every phase, before starting every assigned task, and after any contract or decision update**.

### Documents Both Agents Must Read

1. [`docs/course-learning/README.md`](course-learning/README.md) for feature status and document ownership.
2. [`requirements.md`](course-learning/requirements.md) for scope, `FR-*`, `NFR-*`, and business rules.
3. [`acceptance-criteria.md`](course-learning/acceptance-criteria.md) for testable outcomes.
4. [`exercise-spec.md`](course-learning/exercise-spec.md) for per-Lesson exercise modes, payloads, validation, checkpoint, result, and recovery behavior.
5. [`decisions.md`](course-learning/decisions.md) for accepted, proposed, superseded, and open decisions.
6. The current phase and dependency gates in this `plan.md`.

### Additional Documents BE Must Read

1. [`.opencode/agents/BE.md`](../.opencode/agents/BE.md) for backend ownership and engineering rules.
2. [`api-contract.md`](course-learning/api-contract.md) before changing any endpoint, DTO, error, auth, grading, checkpoint, or idempotency behavior.
3. [`data-model.md`](course-learning/data-model.md) before changing models, indexes, repositories, migrations, transactions, or retention behavior.
4. [`user-flows.md`](course-learning/user-flows.md) before implementing state transitions or resume/completion orchestration.
5. Current server routes, validation, controllers, services, repositories, models, and tests affected by the task.

### Additional Documents FE Must Read

1. [`.opencode/agents/FE.md`](../.opencode/agents/FE.md) for frontend ownership and engineering rules.
2. [`design-spec.md`](course-learning/design-spec.md) and [`client/DESIGN.md`](../client/DESIGN.md) before changing any screen, component, responsive behavior, content hierarchy, or interaction.
3. [`user-flows.md`](course-learning/user-flows.md) before implementing navigation, state transitions, resume, retry, or completion UX.
4. [`api-contract.md`](course-learning/api-contract.md) before changing API functions, Query hooks, types, error handling, checkpoints, or submissions.
5. Current client routes, feature modules, shared components, API helpers, stores, and tests affected by the task.

### Required Evidence in Every Agent Report

Before implementation, each agent must report:

```text
Documents read:
- <document path>
- <document path>

Requirements/criteria in scope:
- FR-xx
- NFR-xx
- AC-xx

Contract or decision blockers:
- None | <specific blocker>
```

At handoff, each agent must confirm that implementation still matches the latest document versions. A task is not complete when the required reading evidence is missing.

### Change-Control Rule

- When BA changes requirements, API contract, data model, acceptance criteria, design specification, or decisions, both agents must stop dependent work and reread every affected document.
- When BE proposes a contract/data change, FE must not integrate it until BA updates the canonical documents.
- When FE discovers a UX or payload gap, BE must not infer the missing rule; the gap must be documented and resolved first.
- Phase gates require both agents to confirm that they reread the latest technical documents and found no unresolved contradiction.

## Phase 0 - Contract and Content Audit

### BE-01: Audit Authored Lesson Payloads

- Collect representative MongoDB payloads for every Lesson type.
- Identify answer-bearing, Admin-only, provider-only, and malformed fields.
- Define learner-safe mappers for each type.
- Define checkpoint/submission Zod schemas and payload limits.
- Record content defects that require Admin correction.

### BE-02: Confirm Learning Contracts

- Verify resolved `OD-01` through `OD-07` in `decisions.md` are reflected in DTOs and tests.
- Publish final DTO examples for enrollment, dashboard, roadmap, Lesson, checkpoint, and submission.
- Publish status/error behavior and idempotency rules.
- Confirm Course final exam remains outside MVP or update all affected documents.

### FE-01: Produce Renderer and UI Mapping

- Map each Admin-authored content shape to a learner component.
- Identify reusable client media/audio/speech utilities; do not import Admin components.
- Validate dashboard, roadmap, and player information architecture against `client/DESIGN.md`.
- Define client checkpoint and response payload needs for BE review.

### Phase 0 Gate

- Resolved decisions have been read and reflected in contracts/tests.
- All seven Lesson types have approved learner DTO/checkpoint/submission contracts.
- Answer sanitization is testable.
- Feature documentation status can move to `READY FOR IMPLEMENTATION`.

## Phase 1 - Enrollment and Progress Foundation

### BE-03: Add Learning Persistence

- Implement `CourseEnrollment`, `LearnerLessonProgress`, and `LearnerLessonAttempt` from `data-model.md`.
- Add indexes, projections, lean reads, idempotency, and checkpoint versioning.
- Keep existing Speaking-specific `UserLessonProgress` unchanged.
- Add model/repository tests for uniqueness and state transitions.

### BE-04: Implement Enrollment

- Add `POST /api/learning/courses/:courseId/enroll` and enrollment list API.
- Validate active Course, prerequisite policy, and learner access.
- Reactivate existing enrollment idempotently.
- Pause the previous active enrollment atomically.
- Synchronize `User.lastActiveCourseId` only as a compatibility projection.
- Add an idempotent backfill for valid existing `lastActiveCourseId` values.

### FE-02: Add Client Learning Feature Skeleton

- Create `client/src/features/dashboard/learning/` using the existing feature-first pattern.
- Add Course overview and Lesson player routes.
- Add types, API functions, stable Query keys, hooks, and route-level loading.
- Replace recommendation join behavior with the enrollment API.
- Correct Course recommendation DTO drift (`level`, `totalUnits`).

### Phase 1 Gate

- Duplicate enrollment creates one record.
- Switching Courses leaves exactly one active enrollment.
- Client can enroll using the production contract.
- `AC-01` through `AC-03` pass.

## Phase 2 - Dashboard and Course Roadmap

### BE-05: Implement Learning Dashboard Query

- Add `GET /api/learning/dashboard`.
- Return active Course, progress, resumable Lesson, and honest zero-value analytics before Phase 6.
- Calculate next Lesson and percentage server-side.
- Avoid N+1 queries and add query-plan tests.

### BE-06: Implement Learner Course Roadmap

- Add `GET /api/learning/courses/:slug`.
- Return active Course, Unit, and Lesson summaries in deterministic order.
- Compute unavailable, available, in-progress, completed, latest/best score, and recommended-next states.
- Keep active Lessons freely navigable regardless of order.
- Enforce enrollment, Course prerequisite, active curriculum, and ancestry checks.

### FE-03: Connect Current Course Dashboard Card

- Replace static Course title, image, time, Unit count, and progress.
- Implement no-Course, not-started, in-progress, completed, unavailable, loading, and retry states.
- Make CTA route to recommendations, Course overview, or resumable Lesson by state.
- Rename `CurrentSeriesCard` to Course terminology.
- Correct “Khoá” metadata to Unit metadata.

### FE-04: Build Course Overview

- Build Course metadata header and ordered Unit/Lesson roadmap.
- Render type, status, latest/best score, unavailable reason, and current Lesson.
- Implement start, continue, and review actions.
- Add loading, empty curriculum, unavailable, and retry states.
- Preserve stable layout for long localized content.

### Phase 2 Gate

- Learner enrolls, sees real dashboard data, opens roadmap, and reaches the correct available Lesson.
- `AC-04` through `AC-08` pass.

## Phase 3 - Learner-Safe Lesson Delivery

### BE-07: Implement Lesson Start and Read

- Add learner Lesson `start` and `GET` endpoints.
- Validate enrollment and Lesson -> Unit -> Course ancestry.
- Sanitize content with type-specific mappers.
- Return checkpoint, Course/Unit context, and previous/next navigation.
- Return 422 with safe client message for malformed authored content.

### FE-05: Build Lesson Player Shell

- Build compact breadcrumb, collapsible roadmap, progress header, content outlet, and navigation footer.
- Restore server checkpoint after load.
- Show autosave/saved/conflict state.
- Guard route exit only when unsaved state exists.
- Clean up timers, media, streams, and pending checkpoint work.

### FE-06: Implement Content-First Renderers

- Implement `VOCAB`, `GRAMMAR`, and `READING` renderers.
- Support authored audio, glossary, translation, examples, highlights, and inline interactions.
- Never display authoring controls or answer-bearing fields before submission.
- Add unsupported/malformed content fallback.

### Phase 3 Gate

- Content-first Lessons open, refresh, resume, and complete without answer leakage.
- `AC-09`, `AC-10`, `AC-19`, and applicable accessibility checks pass.

## Phase 4 - Interactive Practice and Grading

This phase implements `FR-16` through `FR-20`, `NFR-04`, `NFR-11`, `NFR-12`, and `AC-23` through `AC-32`. The current implementation must not be treated as complete: Lesson GET omits practice questions, the player submits empty responses, and its save indicator is not connected to the checkpoint mutation.

### Phase 4A - Exercise Contract and Safe Delivery

#### BE-08: Publish Learner Exercise DTOs

- Read the mandatory BE documents, especially `exercise-spec.md`, `api-contract.md`, and `data-model.md`, and report reading evidence before editing.
- Add discriminated Zod schemas for learner exercise DTOs, checkpoints, and submissions; remove unbounded `z.any()` from these route boundaries.
- Map each Lesson type to exactly one exercise kind: `OBJECTIVE`, `SPEAKING`, `WRITING`, or `COMPLETION`.
- Return supported published fixed Questions with `id`, `version`, safe stem, and type-specific learner payload.
- Allowlist fields per question type and remove all answers and explanations before submission.
- Return `422` for runtime `DYNAMIC` mode and invalid/empty `UNIT_TEST`; use explicit completion for other non-assessed content Lessons.
- Add unit tests for every Lesson/question type and answer-leakage regression fixtures.

#### FE-07: Add Typed Exercise Domain

- Read the mandatory FE documents, especially `exercise-spec.md`, `api-contract.md`, `design-spec.md`, and `client/DESIGN.md`, and report reading evidence before editing.
- Replace `unknown` exercise/content boundaries with the approved discriminated DTO types where consumed.
- Add one adapter from the Lesson DTO into renderer props; do not infer exercise kind from `passingScore` alone.
- Render unavailable/unsupported exercise states without losing Lesson content.
- Add contract fixture tests for all exercise kinds and all five objective question types.

#### Phase 4A Gate

- FE fixtures compile against the exact BE response types/examples.
- Pre-submit Lesson payload tests prove no answer or explanation leakage.
- `AC-23` and `AC-31` pass.

### Phase 4B - Answer State and Real Checkpoints

#### FE-08: Connect Exercise State

- Make the Lesson player own or coordinate typed answer state from every practice component.
- Restore only checkpoint answers whose question ID, version, and type match the current DTO.
- Track answered count and current question index; preserve answers when components rerender.
- Validate all required objective questions and focus the first missing answer before submit.
- Fix matching state to store the complete `Record<leftId, rightId>` mapping, not only the latest pair.
- Add tests for restore, editing, all-answered validation, first-error focus, and route changes.

#### BE-09: Enforce Checkpoint Shapes and Conflicts

- Validate checkpoint kind against Lesson exercise kind and allowlist its nested fields.
- Keep optimistic `checkpointVersion`; return the latest checkpoint and version in the `409 CHECKPOINT_CONFLICT` response.
- Bound serialized size and active-time delta, and reject unknown question IDs/types/versions.
- Ensure duplicate checkpoint delivery does not double-count time.
- Add integration tests for valid restore, malformed payload, duplicate delivery, stale version, and cross-user access.

#### FE-09: Connect Autosave to Server

- Replace the local-only save label with `useSaveCheckpoint` calls.
- Debounce meaningful changes and send at most once per 20 seconds during continuous input.
- Flush the latest state before Lesson navigation and submission.
- Implement saving, saved, unsaved, conflict, offline/network-error, and retry states.
- Preserve local answers on every recoverable error and clean up timers/request work on unmount.

#### Phase 4B Gate

- Refresh and another authenticated session restore the latest compatible answers.
- A stale checkpoint produces visible recovery with no answer loss.
- `AC-10` through `AC-12`, `AC-24`, and `AC-25` pass.

### Phase 4C - Submission and Grading

#### BE-10: Validate and Grade Objective Exercises

- Accept the `OBJECTIVE` union only for an objective Lesson.
- Require exactly one answer for every returned Question; reject missing, duplicate, extra, mismatched-type, or stale-version entries before creating an attempt.
- Grade multiple choice, fill, true/false, matching, and error correction from authoritative Question documents.
- Apply documented text normalization and exact matching constraints.
- Persist immutable attempt kind, submitted Question versions, answers, score, pass/fail, and post-submit feedback.
- Return per-question learner answer, correct answer, correctness, and authored explanation only after a valid submit.

#### BE-11: Validate Subjective and Completion Exercises

- For Speaking, verify the `sessionId` belongs to the authenticated learner and current Lesson and is complete enough to submit.
- For Writing, validate trimmed text and authored word-count boundaries server-side.
- Accept `COMPLETION` only for eligible non-assessed content Lessons.
- Preserve the accepted rule that valid Speaking/Writing submission completes the Lesson regardless of evaluation score.
- Reject an empty `UNIT_TEST` rather than auto-passing it.

#### FE-10: Submit Actual Exercise Data

- Remove hardcoded `responses: {}` and `_completed` payloads.
- Build the exact submission union from current typed state.
- Generate one `clientAttemptId` per deliberate attempt and reuse it for uncertain network retries.
- Disable duplicate submission while pending; retain answers and retry state after failure.
- Route Speaking and Writing through their server-owned session/text contracts.

#### Phase 4C Gate

- Network retry creates one attempt and one progress update.
- Objective grading uses the exact submitted Question IDs and versions.
- Invalid subjective resources cannot complete a Lesson.
- `AC-13`, `AC-14`, `AC-21`, `AC-26`, `AC-27`, `AC-29`, and `AC-30` pass.

### Phase 4D - Results, Retry, and Review

#### BE-12: Finalize Attempt Result Contract

- Return latest score, best score, completion/progress status, next Lesson, and typed feedback.
- Make duplicate `clientAttemptId` return the original immutable result.
- Keep completed status after a later failed retry and never lower best score.
- Add structured logs without learner answer text or media URLs.

#### FE-11: Build Result and Review UX

- Show result heading, score/threshold, latest/best score, and per-question feedback after submit.
- Move focus to the result heading and express correctness using icon plus text.
- Offer retry on failure and explicit retry in completed review mode.
- Preserve the original attempt result until the learner deliberately starts another attempt.
- Show next-Lesson, roadmap, and Course-congratulations actions from server progress.

#### Phase 4D Gate

- Failed, passed, retried, restored, and already-completed Lessons have deterministic UI states.
- `AC-28` and `AC-32` pass, with accessibility checks for keyboard and focus behavior.

### Phase 4 Gate

- Every supported Lesson type has a deterministic submission/completion path.
- `AC-11` through `AC-14`, `AC-20`, and `AC-21` pass.

## Phase 5 - Completion and Resume Consistency

### BE-13: Finalize Progress Aggregation

- Update Lesson, Unit, Course, and enrollment states transactionally.
- Recalculate required Lesson counts safely after curriculum changes.
- Preserve historical attempts and completed state.
- Return the next permitted Lesson.
- Prevent duplicate completion and counter drift.

### FE-12: Build Result and Resume UX

- Build pass, fail, unlimited retry, complete, recommended-next-Lesson, Unit-complete, and Course-congratulations states.
- Invalidate dashboard, roadmap, and Lesson Query data after submission.
- Resume after refresh, logout/login, and another authenticated session.
- Prevent double submission while allowing safe retry after uncertain network outcomes.

### Phase 5 Gate

- Course reaches 100% once and only once.
- Review does not alter completion counts.
- `AC-15` through `AC-17` and `AC-22` pass.

## Phase 6 - Real Dashboard Analytics

### BE-14: Implement Monthly Learning Aggregates

- Aggregate bounded active-learning seconds by month and activity date.
- Return completed/active Course totals.
- Use `Asia/Ho_Chi_Minh` for activity dates.
- Add daily rollups only if query performance misses `NFR-01`.

### FE-13: Connect Progress and Activity Cards

- Replace hardcoded monthly stats and activity dots.
- Add period/month selection and stable Query keys.
- Render honest zero/loading/error states.
- Remove the Upgrade card.
- Keep the existing ranking surface unchanged; ranking implementation remains outside this feature.

### Phase 6 Gate

- Course-learning dashboard statistics are real and correctly labeled.
- `AC-18` passes.

## Phase 7 - Hardening and Rollout

### BE-15: Security, Performance, and Observability

- Test cross-user access, inactive/unavailable curriculum, free Lesson navigation, answer leakage, stale checkpoints, and duplicate completion.
- Add structured events for enrollment, Lesson start, checkpoint conflict, submit, pass/fail, and Course completion.
- Rate-limit checkpoint and submission endpoints.
- Verify roadmap and dashboard query plans against targets.

### FE-14: Accessibility and Regression QA

- Test keyboard order, focus restoration, accordion semantics, dialogs, media controls, and reduced motion.
- Test long content, missing media, slow networks, auth refresh, and API failures.
- Verify supported desktop breakpoints and no overlap/overflow.
- Confirm no learner component imports Admin code.

### FE-15 and BE-16: End-to-End Validation

- Seed one active Course containing every Lesson type.
- Run enroll -> roadmap -> start -> checkpoint -> submit -> retry -> pass -> next -> Course complete.
- Resume from another authenticated browser session.
- Validate Course/Unit/Lesson unpublish behavior for an existing enrollment.

### Phase 7 Gate

- All acceptance criteria pass.
- Backend and client build/tests pass.
- Security review confirms no answer leakage.
- Product owner accepts the seeded-Course smoke test.

## Handoff Contract

### BE to FE

- Final DTOs and examples before each dependent FE task.
- Sanitization matrix per Lesson type.
- Error/status matrix and checkpoint conflict behavior.
- Seed IDs and authored-content defects.
- Endpoint availability and migration status.

### FE to BE

- Exact checkpoint and submission payload needs per renderer.
- API mismatches with concrete request/response evidence.
- Malformed content discovered during rendering.
- Confirmation that pre-submit payloads contain no answer keys.
- Confirmation that no Admin-only endpoint is called.

## Verification Commands

Backend:

```bash
cd server
npm run build
node --test --import tsx test/**/*.test.ts
```

Frontend:

```bash
cd client
npm run build
npm run lint
npx vitest run
```

## Definition of Done

- Enrollment, roadmap, all Lesson types, checkpoints, submissions, resume, and Course completion work end to end.
- Progress and grading are persisted and server-owned.
- Learner payloads expose active curriculum only and no answers before submission.
- Dashboard Course/progress/activity values are real; Upgrade/payment and Course-learning mocks are removed.
- Course recommendation and enrollment use consistent Course DTOs.
- Canonical acceptance criteria pass.
- FE/BE complete the seeded-Course smoke test and report residual risks.
