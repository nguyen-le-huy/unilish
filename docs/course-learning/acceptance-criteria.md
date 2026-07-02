# Acceptance Criteria

## Enrollment

### AC-01 - Idempotent Enrollment

Given an eligible learner and an active Course  
When the learner sends the enrollment request twice  
Then exactly one enrollment exists and both responses identify it.

### AC-02 - One Active Course

Given the learner has an active Course  
When they activate another Course  
Then the previous enrollment is paused and exactly one enrollment remains active.

### AC-03 - Invalid Course

Given a Course is inactive or its prerequisite is unmet  
When enrollment is requested  
Then the request is rejected without changing the current active enrollment.

## Dashboard and Roadmap

### AC-04 - Honest Empty Dashboard

Given the learner has no active enrollment  
When the dashboard loads  
Then it shows a recommendation CTA and no fake progress values.

### AC-05 - Real Current Course

Given an active enrollment  
When the dashboard loads  
Then Course metadata, Unit count, progress, time, and CTA match server data.

### AC-06 - Ordered Roadmap

Given an enrolled Course  
When its roadmap loads  
Then active Units and Lessons are ordered and show their computed statuses.

### AC-07 - Free Lesson Navigation

Given an enrolled Course with multiple active Lessons  
When the learner selects any Lesson regardless of order  
Then the Lesson opens and `orderIndex` affects presentation/recommendation only.

### AC-08 - Inactive Curriculum

Given a Course, Unit, or Lesson is unavailable to learners  
When it is requested  
Then its content is not returned.

## Lesson Safety and Progress

### AC-09 - No Answer Leakage

Given an objective assessment has not been submitted  
When the learner Lesson payload is inspected  
Then it contains no correct answers or answer-derived explanations.

### AC-10 - Checkpoint Resume

Given an in-progress Lesson with an accepted checkpoint  
When the learner refreshes or signs in on another session  
Then the latest checkpoint is restored.

### AC-11 - Duplicate Checkpoint

Given the same checkpoint request is delivered twice  
When the server processes both requests  
Then time and progress are counted once.

### AC-12 - Checkpoint Conflict

Given another client has advanced the checkpoint version  
When a stale checkpoint is submitted  
Then the server returns 409 with the latest version for reconciliation.

## Submission and Completion

### AC-13 - Failed Assessment

Given an assessed Lesson score is below its passing score  
When submitted  
Then the Lesson remains incomplete and retry is available.

### AC-21 - Speaking and Writing Completion

Given a Speaking or Writing Lesson  
When the learner makes a valid submission  
Then the Lesson completes regardless of evaluation score and feedback remains visible.

### AC-14 - Idempotent Passing Submission

Given a passing submission is retried after network uncertainty  
When the same `clientAttemptId` is received  
Then one attempt result is returned and completion is counted once.

### AC-15 - Unlock Next Lesson

Given a required Lesson completes  
When the roadmap is fetched again  
Then aggregate progress is updated and the next permitted Lesson becomes available.

### AC-16 - Complete Course

Given all required published Lessons except one are complete  
When the final required Lesson completes  
Then enrollment becomes completed and Course progress is exactly 100%.

### AC-17 - Review Completed Lesson

Given a Lesson is already complete  
When it is opened in review mode  
Then content is available and completion counts do not increase.

### AC-22 - Course Congratulations

Given the final required Lesson completes  
When the completion result is shown  
Then the learner sees congratulations with review and choose-another-Course actions.

## Analytics and Resilience

### AC-18 - Monthly Activity

Given persisted active-learning intervals  
When a month is requested  
Then time totals and activity days match those intervals in `Asia/Ho_Chi_Minh`.

### AC-19 - Malformed Content

Given authored content is incomplete or malformed  
When the learner opens it  
Then the UI shows a recoverable unavailable state and the server logs diagnostics without exposing internals.

### AC-20 - Cleanup

Given a learner leaves a media Lesson  
When the player unmounts  
Then media streams, recordings, timers, listeners, and pending periodic work are cleaned up.

## Per-Lesson Exercises

### AC-23 - Safe Exercise Delivery

Given a Lesson has fixed published questions  
When the learner loads the Lesson  
Then the response contains supported questions with IDs and versions but no answers or explanations.

### AC-24 - Restore Exercise Answers

Given a compatible saved exercise checkpoint  
When the learner reopens the Lesson  
Then all saved answers and the current question position are restored.

### AC-25 - Require Complete Objective Attempt

Given one or more returned objective questions are unanswered  
When the learner selects submit  
Then FE does not submit, shows the missing count, and focuses the first unanswered question.

### AC-26 - Submit Actual Answers

Given every objective question is answered  
When the learner submits  
Then FE sends each question ID, version, type, and learner answer and BE grades that exact set.

### AC-27 - Stale Question Set

Given a question version changed after the Lesson loaded  
When the learner submits the old version  
Then BE returns `409 QUESTION_SET_CHANGED`, creates no attempt, and FE preserves the learner answers.

### AC-28 - Post-Submit Feedback

Given a valid objective submission  
When grading finishes  
Then feedback shows correctness, learner answer, correct answer, and authored explanation per question only after submission.

### AC-29 - Subjective Validation

Given a Speaking or Writing Lesson  
When a learner submits a session belonging to another user/Lesson or writing outside authored word limits  
Then BE rejects it without completing the Lesson or losing local work.

### AC-30 - Explicit Completion

Given a non-assessed content Lesson with no valid fixed questions  
When the learner explicitly completes it  
Then one completion attempt is recorded and duplicate requests do not increase progress.

### AC-31 - Invalid Unit Test

Given a `UNIT_TEST` has no valid published supported questions  
When the learner opens it  
Then BE returns `422` and FE shows a recoverable unavailable state instead of auto-completing it.

### AC-32 - Retry Preserves Best Score

Given a learner has previous exercise attempts  
When another attempt is submitted  
Then latest score reflects the new attempt, best score never decreases, and prior completion is not reversed.
