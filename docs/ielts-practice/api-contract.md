# Hợp đồng API

## 1. Quy ước chung

- Base URL: `/api`.
- Auth: Bearer JWT hoặc cookie flow hiện có; mọi endpoint trong tài liệu đều cần authenticated user.
- Time: ISO-8601 UTC, ví dụ `2026-07-06T04:00:00.000Z`.
- ID: Mongo ObjectId dạng 24 hex; learner route public dùng `slug` ổn định.
- Pagination: `page` bắt đầu từ 1, `limit` tối đa 100.
- Mutating start/submit nhận header `Idempotency-Key`, 8–128 ký tự.
- Autosave dùng `revision` integer cho optimistic concurrency.

### Success envelope hiện hành

```json
{
  "status": "success",
  "code": 200,
  "message": "...",
  "data": {},
  "meta": {}
}
```

### Error envelope hiện hành

```json
{
  "status": "error",
  "code": 409,
  "message": "Attempt đã hết thời gian",
  "errorCode": "ATTEMPT_EXPIRED"
}
```

`errorCode` là field contract bắt buộc cho lỗi nghiệp vụ; client không parse message để quyết định flow.

## 2. Enum

```ts
type IeltsSkill = 'listening' | 'reading' | 'writing' | 'speaking';

type IeltsQuestionType =
  | 'form_completion'
  | 'true_false_not_given'
  | 'academic_task_1_chart'
  | 'ai_conversation';

type ContentStatus = 'draft' | 'active' | 'paused' | 'archived';
type AttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'graded'
  | 'expired'
  | 'abandoned';
```

## 3. Learner content DTO — không chứa answer key

```ts
interface TestSummaryDto {
  id: string;
  slug: string;
  title: string;
  description?: string;
  skill: IeltsSkill;
  questionType: IeltsQuestionType;
  itemCount: number;
  durationMinutes: number;
  attemptCount: number;
  availability: 'free'; // MVP; không suy diễn pricing khác
  activeAttemptId?: string;
  publishedAt: string;
}

interface BaseTestDetailDto extends TestSummaryDto {
  version: number;
}

interface ListeningDetailDto extends BaseTestDetailDto {
  skill: 'listening';
  questionType: 'form_completion';
  content: {
    instruction: string;
    heading: string;
    audio: { assetId: string; url: string; durationSeconds: number };
    items: Array<{ id: string; order: number; before: string; after: string }>;
  };
}

interface ReadingDetailDto extends BaseTestDetailDto {
  skill: 'reading';
  questionType: 'true_false_not_given';
  content: {
    title: string;
    passage: string[];
    instruction: string;
    statements: Array<{ id: string; order: number; text: string }>;
  };
}

interface WritingDetailDto extends BaseTestDetailDto {
  skill: 'writing';
  questionType: 'academic_task_1_chart';
  content: {
    prompt: string;
    instruction: string;
    image: { assetId: string; url: string; alt: string };
    minWords: 150;
  };
}

interface SpeakingDetailDto extends BaseTestDetailDto {
  skill: 'speaking';
  questionType: 'ai_conversation';
  content: {
    scenarioTitle: string;
    context: string;
    openingPrompt: string;
    expectedDurationMinutes: number;
    voice: string;
  };
}

type TestDetailDto = ListeningDetailDto | ReadingDetailDto | WritingDetailDto | SpeakingDetailDto;
```

## 4. Learner endpoints

### GET `/api/ielts-practice/summary`

Trả số đề active theo kỹ năng cho hub.

- Roles: authenticated learner/admin.
- Success: `200`.

```json
{
  "status": "success",
  "code": 200,
  "message": "Lấy tổng quan IELTS thành công",
  "data": {
    "skills": [
      { "skill": "listening", "activeTests": 8 },
      { "skill": "reading", "activeTests": 8 },
      { "skill": "writing", "activeTests": 8 },
      { "skill": "speaking", "activeTests": 8 }
    ]
  }
}
```

### GET `/api/ielts-practice/tests`

- Query: `skill` required; `page=1`; `limit=20`; `search?` max 200; `sort=publishedAt:desc` duy nhất trong MVP.
- Chỉ trả active skill practice.
- Success: `200`, `meta.pagination`.

```json
{
  "status": "success",
  "code": 200,
  "message": "Lấy danh sách đề IELTS thành công",
  "data": [
    {
      "id": "66aa11111111111111111111",
      "slug": "cam-20-listening-1",
      "title": "Cam 20 Listening · Test 1",
      "skill": "listening",
      "questionType": "form_completion",
      "itemCount": 10,
      "durationMinutes": 12,
      "attemptCount": 472,
      "availability": "free",
      "publishedAt": "2026-07-01T02:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

Validation errors: `400 INVALID_SKILL`, `400 INVALID_PAGINATION`.

### GET `/api/ielts-practice/tests/:slug`

- Trả `TestDetailDto` redacted.
- Success: `200`.
- `404 TEST_NOT_AVAILABLE`: slug không tồn tại hoặc không active.

### POST `/api/ielts-practice/tests/:testId/attempts`

- Header: `Idempotency-Key` required.
- Body:

```json
{ "clientStartedAt": "2026-07-06T04:00:00.000Z" }
```

`clientStartedAt` chỉ phục vụ telemetry, không tính deadline.

- Success new: `201`; resume existing: `200`.

```json
{
  "status": "success",
  "code": 201,
  "message": "Bắt đầu lượt luyện IELTS thành công",
  "data": {
    "attemptId": "66bb22222222222222222222",
    "testId": "66aa11111111111111111111",
    "testVersion": 3,
    "skill": "listening",
    "status": "in_progress",
    "startedAt": "2026-07-06T04:00:01.000Z",
    "deadlineAt": "2026-07-06T04:12:01.000Z",
    "revision": 0,
    "draft": { "answers": {}, "flaggedItemIds": [] },
    "test": { "...": "ListeningDetailDto from pinned snapshot" },
    "resumed": false
  }
}
```

Errors: `404 TEST_NOT_AVAILABLE`, `409 RETAKE_NOT_ALLOWED`, `429 RATE_LIMITED`.

### GET `/api/ielts-practice/attempts/:attemptId`

- Ownership required; foreign attempt returns `404`.
- Trả snapshot redacted, draft, revision, deadline và objective result nếu đã có.
- Success: `200`.

### PATCH `/api/ielts-practice/attempts/:attemptId/draft`

- Body discriminated by skill:

```json
{
  "revision": 4,
  "answers": { "l-01": "125", "l-02": "modern" },
  "flaggedItemIds": ["l-02"]
}
```

```json
{ "revision": 2, "essay": "The two charts compare..." }
```

```json
{
  "revision": 3,
  "transcriptSegments": [
    { "id": "seg-1", "speaker": "learner", "text": "...", "startedAtMs": 1200 }
  ],
  "audioAssetIds": ["asset-123"]
}
```

- Success: `200`.

```json
{
  "status": "success",
  "code": 200,
  "message": "Đã lưu bản nháp",
  "data": { "attemptId": "...", "revision": 5, "savedAt": "2026-07-06T04:04:00.000Z" }
}
```

- `409 REVISION_CONFLICT`:

```json
{
  "status": "error",
  "code": 409,
  "message": "Bản nháp đã thay đổi trên thiết bị khác",
  "errorCode": "REVISION_CONFLICT",
  "data": { "latestRevision": 5, "latestDraft": { "answers": {} }, "savedAt": "..." }
}
```

Other errors: `404 ATTEMPT_NOT_FOUND`, `409 ATTEMPT_LOCKED`, `409 ATTEMPT_EXPIRED`, `422 UNKNOWN_ITEM_ID`.

### POST `/api/ielts-practice/attempts/:attemptId/submit`

- Header `Idempotency-Key` required.
- Body: `{ "revision": 5 }`.
- Server submits latest stored draft only. Client không gửi answer lần cuối trong submit để tránh race; FE phải flush save trước.
- Success objective `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Nộp bài thành công",
  "data": {
    "attemptId": "...",
    "status": "graded",
    "submittedAt": "...",
    "result": { "correct": 8, "total": 10, "normalizedScore": 0.8 }
  }
}
```

- Success Writing/Speaking chưa chấm `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Đã nhận bài Writing",
  "data": {
    "attemptId": "...",
    "status": "submitted",
    "submittedAt": "...",
    "grading": "not_available"
  }
}
```

Errors: `409 UNSAVED_REVISION`, `409 ATTEMPT_EXPIRED`, `422 EMPTY_SUBMISSION`.

### GET `/api/ielts-practice/attempts/:attemptId/result`

- Success: `200` cho `graded` hoặc `submitted`.
- Với Writing/Speaking trong MVP, response là `{ status: "submitted", grading: "not_available" }`; không có band, criteria hoặc feedback.
- `404` nếu không thuộc learner.

### POST `/api/ielts-practice/attempts/:attemptId/abandon`

- Idempotent; chỉ `in_progress` → `abandoned`.
- Success: `200`.

## 5. Admin content payload

Các endpoint hiện có `/api/exam-tests` được mở rộng; không tạo API CRUD trùng lặp.

```ts
interface IeltsPracticeUpsertBody {
  kind: 'skill_practice';
  format: 'ielts';
  slug: string;
  title: string;
  description?: string;
  languageId: string;
  language: string;
  skill: IeltsSkill;
  questionType: IeltsQuestionType;
  durationMinutes: number;
  content: ListeningAdminContent | ReadingAdminContent | WritingAdminContent | SpeakingAdminContent;
  settings?: { allowRetake: boolean; retakeCooldownDays: number };
}
```

Admin content thêm answer key cho Listening/Reading:

```ts
interface ListeningAdminContent {
  instruction: string;
  heading: string;
  audioAssetId: string;
  items: Array<{
    id: string;
    order: number;
    before: string;
    after: string;
    acceptedAnswers: string[];
    caseSensitive?: boolean;
  }>;
}

interface ReadingAdminContent {
  title: string;
  passage: string[];
  instruction: string;
  statements: Array<{
    id: string;
    order: number;
    text: string;
    correctAnswer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
    explanation?: string;
  }>;
}

interface WritingAdminContent {
  prompt: string;
  instruction: string;
  imageAssetId: string;
  imageAlt: string;
  minWords: 150;
}

interface SpeakingAdminContent {
  scenarioTitle: string;
  context: string;
  openingPrompt: string;
  expectedDurationMinutes: number;
  voice: string;
}
```

## 6. Admin endpoints

### GET `/api/exam-tests`

Current endpoint, thêm query:

- `kind=skill_practice`
- `format=ielts`
- `skill?`
- `status?`
- `search?`, `page`, `limit`

Roles: admin, content_creator. Không trả `modules/content` trong list.

### GET `/api/exam-tests/:id`

Current endpoint. Admin/content_creator nhận full content gồm answer key. Ghi audit read không bắt buộc.

### POST `/api/exam-tests`

- Current endpoint mở rộng payload `IeltsPracticeUpsertBody`.
- Role: chỉ admin. Content creator gọi mutation nhận `403 FORBIDDEN`.
- Tạo status `draft`, version tiếp theo.
- Success: `201`.

### PUT `/api/exam-tests/:id`

- Draft: update cùng record.
- Active/paused/archived: trả `409 VERSION_REQUIRED`; admin dùng endpoint create-version.
- Success: `200`.

### POST `/api/exam-tests/:id/versions`

- Tạo draft version từ active/paused record, có thể kèm patch.
- Success: `201`.
- `409 DRAFT_VERSION_EXISTS` nếu đã có draft cùng logical test.

### POST `/api/exam-tests/:id/validate-publish`

- Trả validation không đổi status.

```json
{
  "status": "success",
  "code": 200,
  "message": "Kiểm tra đề hoàn tất",
  "data": {
    "valid": false,
    "errors": [
      { "path": "content.items[3].acceptedAnswers", "code": "REQUIRED", "message": "Cần ít nhất một đáp án" }
    ]
  }
}
```

### PATCH `/api/exam-tests/:id/status`

- Current endpoint giữ body `{ "status": "active|paused|archived" }`.
- Publish `active` chạy cùng validation như endpoint validate.
- Một logical test/slug chỉ có một active version; active cũ → archived trong transaction.

### DELETE `/api/exam-tests/:id`

- Alias rõ nghĩa cho archive soft-delete.
- Body rỗng; success `200`; gọi lại idempotent.
- Role: admin.

### GET `/api/exam-tests/:id/versions`

Current endpoint; trả version/status/timestamps/actor.

### POST `/api/exam-tests/:id/rollback/:version`

Current endpoint; tạo draft version mới, không active ngay.

### GET `/api/exam-tests/:id/analytics`

Thay stub hiện tại bằng:

```json
{
  "totalAttempts": 472,
  "completedAttempts": 401,
  "completionRate": 0.8496,
  "averageDurationSeconds": 618,
  "averageNormalizedScore": 0.71
}
```

## 7. Media

Tận dụng upload service hiện có; content chỉ lưu stable `assetId` và storage key. API detail tạo URL read signed/HTTPS.

- Image: JPEG/PNG/WebP, tối đa 10 MB, bắt buộc alt text.
- Audio: MP3/M4A/WAV, tối đa 100 MB; server probe duration/mime.
- Signed upload phải hoàn tất trước publish; asset trạng thái pending làm validation fail.

## 8. Error catalogue

| HTTP | `errorCode` | Ý nghĩa |
|---|---|---|
| 400 | `INVALID_SKILL` | Skill ngoài enum |
| 400 | `INVALID_QUESTION_TYPE` | Type không khớp skill |
| 401 | `UNAUTHENTICATED` | Không có auth hợp lệ |
| 403 | `FORBIDDEN` | Không đủ role |
| 404 | `TEST_NOT_AVAILABLE` | Learner không thấy đề chưa active |
| 404 | `ATTEMPT_NOT_FOUND` | Không tồn tại/không thuộc user |
| 409 | `REVISION_CONFLICT` | Autosave revision cũ |
| 409 | `ATTEMPT_EXPIRED` | Deadline đã qua |
| 409 | `ATTEMPT_LOCKED` | Attempt đã submit/abandon |
| 409 | `UNSAVED_REVISION` | Submit trước khi save cuối hoàn tất |
| 409 | `VERSION_REQUIRED` | Cố sửa active record |
| 422 | `PUBLISH_VALIDATION_FAILED` | Content chưa đủ điều kiện |
| 422 | `UNKNOWN_ITEM_ID` | Draft chứa item lạ |
| 429 | `RATE_LIMITED` | Quá giới hạn request |

## 9. Idempotency và side effects

- Key scope: `(userId, route, Idempotency-Key)`.
- Start lưu response 24 giờ; retry trả cùng attempt.
- Submit lưu response idempotency ít nhất 24 giờ; Writing/Speaking không enqueue grading job trong MVP.
- Autosave không dùng idempotency key; dùng revision.
- Publish/archive/rollback ghi audit log.
- `attemptCount` tăng khi start mới thành công, không tăng khi resume/admin preview.

## 10. Retention đã chốt

- Attempt, submission, essay, transcript và audio Speaking được lưu vĩnh viễn.
- Không tạo TTL index hoặc endpoint hard-delete learner data trong MVP.
- Archive `ExamTest` không xóa attempt/content snapshot/media learner.
