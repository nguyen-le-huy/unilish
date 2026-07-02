# Learner API Contract

## Conventions

- Base prefix: `/api/learning`.
- Authentication: required.
- Intended role: `student`; Admin/content creator preview requires a separate explicit policy.
- Success envelope: `{ status, code, message, data, meta? }`.
- Error envelope: `{ status, code, message }`.
- IDs are MongoDB ObjectId strings.
- Dates are ISO 8601 UTC strings.
- Learner APIs return learner DTOs, never raw Mongoose documents.

## 1. Enroll in Course

```http
POST /api/learning/courses/:courseId/enroll
Idempotency-Key: <uuid>
```

Response `200` or `201`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Course enrollment is active",
  "data": {
    "enrollmentId": "...",
    "courseId": "...",
    "courseSlug": "travel-english-a1",
    "status": "ACTIVE",
    "nextLessonId": "..."
  }
}
```

Errors: `403` prerequisite/profile policy, `404` Course, `409` enrollment transition conflict.

## 2. List Enrollments

```http
GET /api/learning/enrollments?status=ACTIVE|PAUSED|COMPLETED
```

Returns the authenticated learner's enrollment summaries only.

## 3. Dashboard

```http
GET /api/learning/dashboard?period=month&month=2026-07
```

```ts
interface LearningDashboardDto {
  activeCourse: {
    id: string;
    slug: string;
    name: string;
    thumbnailUrl: string | null;
    level: string;
    totalUnits: number;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    timeSpentSeconds: number;
    nextLessonId: string | null;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  } | null;
  summary: {
    timeSpentSeconds: number;
    completedCourses: number;
    activeCourses: number;
  };
  activityDays: Array<{ date: string; minutes: number }>;
}
```

Validation: `month` uses `YYYY-MM`; unsupported period returns `400`.

## 4. Course Roadmap

```http
GET /api/learning/courses/:slug
```

```ts
interface CourseRoadmapDto {
  course: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    thumbnailUrl: string | null;
    level: string;
    language: { id: string; code: string; name: string };
    learningGoal: { id: string; slug: string; title: string };
  };
  enrollment: { id: string; status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' };
  progressPercent: number;
  nextLessonId: string | null;
  units: Array<{
    id: string;
    title: string;
    description: string | null;
    orderIndex: number;
    status: LearningStatus;
    progressPercent: number;
    lessons: Array<{
      id: string;
      title: string;
      type: LessonType;
      orderIndex: number;
      status: LearningStatus;
      bestScore: number | null;
      lockReason: string | null;
    }>;
  }>;
}

type LearningStatus = 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
```

Errors: `403` not enrolled or Course prerequisite unmet, `404` unavailable Course.

## 5. Start Lesson

```http
POST /api/learning/lessons/:lessonId/start
Idempotency-Key: <uuid>
```

Returns progress ID, checkpoint version, start time, and navigation context. Repeated calls return existing `IN_PROGRESS` state.

## 6. Read Lesson

```http
GET /api/learning/lessons/:lessonId
```

```ts
interface LearnerLessonDto {
  course: { id: string; slug: string; name: string };
  unit: { id: string; title: string; orderIndex: number };
  lesson: {
    id: string;
    title: string;
    type: LessonType;
    orderIndex: number;
    content: LearnerSafeContent;
    passingScore: number | null;
    exercise: LearnerExerciseDto;
  };
  progress: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    checkpoint: unknown | null;
    checkpointVersion: number;
    bestScore: number | null;
  };
  navigation: {
    previousLessonId: string | null;
    nextLessonId: string | null;
  };
}
```

```ts
type LearnerExerciseDto =
  | {
      kind: 'OBJECTIVE';
      mode: 'FIXED';
      passingScore: number;
      questions: LearnerPracticeQuestionDto[];
    }
  | { kind: 'SPEAKING'; sessionRequired: true }
  | { kind: 'WRITING'; minWords: number; maxWords: number }
  | { kind: 'COMPLETION' };

type LearnerPracticeQuestionDto =
  | { id: string; version: number; type: 'MULTIPLE_CHOICE'; stem: LearnerStem; options: Array<{ id: string; text: string }> }
  | { id: string; version: number; type: 'FILL_IN_BLANK'; stem: LearnerStem }
  | { id: string; version: number; type: 'TRUE_FALSE'; stem: LearnerStem }
  | { id: string; version: number; type: 'MATCHING'; stem: LearnerStem; items: Array<{ id: string; text: string }>; targets: Array<{ id: string; text: string }> }
  | { id: string; version: number; type: 'ERROR_CORRECTION'; stem: LearnerStem & { text: string } };

interface LearnerStem {
  text?: string;
  audioUrl?: string;
  imageUrl?: string;
}
```

Sanitization requirements:

- Remove MCQ `isCorrect` before submission.
- Remove fill `correctAnswers` before submission.
- Remove inline-quiz `correct`, accepted answers, and answer-derived explanation.
- Remove matching answer mapping when it directly reveals pairs; return randomized learner items.
- Remove Question `explanation` before submission.
- Return only supported, published, fixed questions referenced by the Lesson.
- If `UNIT_TEST` has no valid questions, return `422` rather than `COMPLETION`.
- If another content Lesson has no valid questions, return `exercise.kind = 'COMPLETION'`.
- Runtime `DYNAMIC` mode is not supported in this contract and returns `422` until separately specified.
- Never rely on recursive deletion alone; use a mapper per Lesson type.

## 7. Save Checkpoint

```http
PATCH /api/learning/lessons/:lessonId/checkpoint
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "version": 4,
  "checkpoint": {
    "kind": "OBJECTIVE",
    "answers": [
      {
        "questionId": "...",
        "questionVersion": 2,
        "type": "MULTIPLE_CHOICE",
        "answer": { "selectedOptionId": "option-a" }
      }
    ],
    "currentQuestionIndex": 0
  },
  "activeSecondsDelta": 20
}
```

Response returns accepted version and total time. `409 CHECKPOINT_CONFLICT` returns the latest checkpoint and version for reconciliation. Payloads use the discriminated checkpoint unions in [exercise-spec.md](exercise-spec.md), are allowlisted per Lesson type, and have a maximum serialized size of 100 KB.

## 8. Submit Lesson

```http
POST /api/learning/lessons/:lessonId/submit
Idempotency-Key: <clientAttemptId>

{
  "clientAttemptId": "uuid",
  "submission": {
    "kind": "OBJECTIVE",
    "answers": [
      {
        "questionId": "...",
        "questionVersion": 2,
        "type": "MULTIPLE_CHOICE",
        "answer": { "selectedOptionId": "option-a" }
      }
    ]
  },
  "durationSeconds": 180
}
```

`submission` is one of:

```ts
type LessonSubmission =
  | { kind: 'OBJECTIVE'; answers: ObjectiveAnswer[] }
  | { kind: 'SPEAKING'; sessionId: string }
  | { kind: 'WRITING'; text: string; warmupAnswers?: Record<string, string> }
  | { kind: 'COMPLETION'; acknowledged: true };
```

Response:

```ts
interface LessonSubmissionResult {
  attemptId: string;
  score: number | null;
  passed: boolean;
  latestScore: number | null;
  bestScore: number | null;
  feedback: {
    summary: string | null;
    questions: Array<{
      questionId: string;
      correct: boolean;
      learnerAnswer: unknown;
      correctAnswer: unknown;
      explanation: string | null;
    }>;
  } | null;
  progress: {
    lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
    unitStatus: LearningStatus;
    courseStatus: 'ACTIVE' | 'COMPLETED';
    courseProgressPercent: number;
  };
  nextLessonId: string | null;
}
```

Validation and errors:

- `400 INCOMPLETE_ATTEMPT`: one or more objective questions are unanswered.
- `400 INVALID_SUBMISSION_KIND`: submission kind does not match Lesson exercise kind.
- `403 SUBMISSION_RESOURCE_FORBIDDEN`: Speaking session is not owned by the learner or Lesson.
- `409 QUESTION_SET_CHANGED`: a submitted question ID/version/type no longer matches the current fixed set; no attempt is created.
- `409 ATTEMPT_IN_PROGRESS`: the same idempotency key is being processed; retry with the same key.
- `422 EXERCISE_UNAVAILABLE`: dynamic mode, invalid authored payload, or a `UNIT_TEST` with no valid questions.

The uppercase names above are documentation labels, not additional wire fields. Error responses retain the current `{ status, code, message }` envelope, with the HTTP status in `code`; FE branches by endpoint and status and displays the server message.

The same `clientAttemptId` always returns the original result. A deliberate new retry uses a new ID. The server ignores any client-provided score, correctness, correct answer, progress, or completion state.

Submission rules:

- Objective assessments require the authored passing score.
- Speaking/Writing return `passed: true` after a valid submission regardless of evaluation score; evaluation remains feedback.
- Retries are unlimited and update latest/best score without reversing completion.
- `nextLessonId` is a recommendation only because learners may freely select any available Lesson.

Errors: `400` invalid response, `403` unavailable/inactive/not enrolled, `409` conflicting state, `422` ungradable authored content, `429` rate limit.

## Security Contract

- Never accept `userId`, score, pass/fail, completion, or progress percentage from the client.
- Validate Lesson ancestry from Lesson -> Unit -> Course -> Enrollment.
- Allowlist checkpoint/response fields per Lesson type.
- Bound active time and payload size.
- Do not expose provider credentials, internal prompts, or raw evaluation internals.
