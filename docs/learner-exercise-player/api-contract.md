# Hợp đồng API

## Nguyên tắc

Tính năng không thêm endpoint hoặc field mới. Đây là tập con sử dụng hợp đồng Course Learning hiện tại. Mọi endpoint yêu cầu JWT learner, enrollment hợp lệ và quyền truy cập Lesson. Success dùng envelope:

```ts
type ApiEnvelope<T> = {
  status: 'success';
  code: number;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
};
```

Error giữ dạng `{ "status": "error", "code": <httpStatus>, "message": "..." }`.

## 1. Đọc Lesson và exercise

```http
GET /api/learning/lessons/:lessonId
Authorization: Bearer <jwt>
```

- `lessonId`: Mongo ObjectId 24 ký tự hex.
- Role: learner đã ghi danh Course chứa Lesson.
- Success: `200`.

Phần DTO player sử dụng:

```ts
type ObjectiveExercise = {
  kind: 'OBJECTIVE';
  mode: 'FIXED';
  passingScore: number;
  questions: LearnerPracticeQuestionDto[];
};

type LearnerPracticeQuestionDto =
  | { id: string; version: number; type: 'MULTIPLE_CHOICE'; stem: LearnerStem; options: Array<{ id: string; text: string }> }
  | { id: string; version: number; type: 'FILL_IN_BLANK'; stem: LearnerStem }
  | { id: string; version: number; type: 'TRUE_FALSE'; stem: LearnerStem }
  | { id: string; version: number; type: 'MATCHING'; stem: LearnerStem; items: Array<{ id: string; text: string }>; targets: Array<{ id: string; text: string }> }
  | { id: string; version: number; type: 'ERROR_CORRECTION'; stem: LearnerStem & { text: string } };
```

`progress.checkpoint` có thể là:

```json
{
  "kind": "OBJECTIVE",
  "answers": [
    {
      "questionId": "64b7f0f0f0f0f0f0f0f0f001",
      "questionVersion": 2,
      "type": "MULTIPLE_CHOICE",
      "answer": { "selectedOptionId": "option-a" }
    }
  ],
  "currentQuestionIndex": 1
}
```

Không được có `isCorrect`, `correctAnswers`, matching answer map, `correctText` hoặc `explanation` trong pre-submit response.

Errors: `400` invalid ID, `401` unauthenticated, `403` không ghi danh/không được phép, `404` không tồn tại, `422` exercise không thể chấm.

## 2. Lưu checkpoint

```http
PATCH /api/learning/lessons/:lessonId/checkpoint
Authorization: Bearer <jwt>
Idempotency-Key: <uuid>
Content-Type: application/json
```

```json
{
  "version": 4,
  "checkpoint": {
    "kind": "OBJECTIVE",
    "answers": [],
    "currentQuestionIndex": 2
  },
  "activeSecondsDelta": 20
}
```

Validation:

- `version`: integer `>= 0`.
- `currentQuestionIndex`: integer `>= 0`; FE phải clamp trong `0..questions.length - 1` trước khi gửi.
- `activeSecondsDelta`: integer `0..300`.
- Answer phải có ID, version và type khớp question set hiện tại.
- Payload serialize tối đa 100 KB theo contract Course Learning.

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Lưu tiến trình thành công",
  "data": { "version": 5, "totalTimeSeconds": 240 }
}
```

`409 CHECKPOINT_CONFLICT` trả latest checkpoint/version theo contract nền; FE không tự ghi đè.

## 3. Nộp bài

```http
POST /api/learning/lessons/:lessonId/submit
Authorization: Bearer <jwt>
Idempotency-Key: <clientAttemptId>
Content-Type: application/json
```

```json
{
  "clientAttemptId": "467f5a39-55f0-4978-bb45-4d4c9fd3149a",
  "submission": {
    "kind": "OBJECTIVE",
    "answers": [
      {
        "questionId": "64b7f0f0f0f0f0f0f0f0f001",
        "questionVersion": 2,
        "type": "TRUE_FALSE",
        "answer": { "value": true }
      }
    ]
  },
  "durationSeconds": 180
}
```

Validation:

- `clientAttemptId`: UUID; header và body dùng cùng giá trị.
- `durationSeconds`: integer `>= 0`.
- Mỗi question đúng một answer; không thiếu, thừa, trùng ID hoặc sai type/version.
- Server bỏ qua field lạ và không chấp nhận score/correctness/progress từ Client.

Success `200`:

```json
{
  "status": "success",
  "code": 200,
  "message": "Nộp bài thành công",
  "data": {
    "attemptId": "64b7f0f0f0f0f0f0f0f0f090",
    "score": 80,
    "passed": true,
    "latestScore": 80,
    "bestScore": 90,
    "feedback": {
      "summary": "Bạn trả lời đúng 4/5 câu.",
      "questions": [
        {
          "questionId": "64b7f0f0f0f0f0f0f0f0f001",
          "correct": true,
          "learnerAnswer": true,
          "correctAnswer": true,
          "explanation": "Câu mô tả đúng nội dung bài nghe."
        }
      ]
    },
    "progress": {
      "lessonStatus": "COMPLETED",
      "unitStatus": "IN_PROGRESS",
      "courseStatus": "ACTIVE",
      "courseProgressPercent": 40
    },
    "nextLessonId": "64b7f0f0f0f0f0f0f0f0f099"
  }
}
```

Business errors:

- `400 INCOMPLETE_ATTEMPT`: thiếu answer.
- `400 INVALID_SUBMISSION_KIND`: không phải objective exercise của Lesson.
- `409 QUESTION_SET_CHANGED`: ID/version/type đã thay đổi; không tạo attempt.
- `409 ATTEMPT_IN_PROGRESS`: request cùng key đang xử lý; retry cùng key.
- `422 EXERCISE_UNAVAILABLE`: payload authored không thể chấm.
- `429`: rate limit; giữ answer và cho retry.

## 4. Làm lại Lesson đã hoàn thành

```http
POST /api/learning/lessons/:lessonId/restart
Authorization: Bearer <jwt>
```

Success `200` trả progress `IN_PROGRESS`, checkpoint rỗng và version `0`. Side effect không được xóa attempt history, best score hoặc đảo completion aggregate đã đạt trước đó.

## 5. Idempotency và side effects

- Chuyển câu không gọi API.
- Autosave dùng optimistic checkpoint version.
- Retry request submit không chắc chắn dùng cùng `clientAttemptId` và phải nhận cùng attempt result.
- Một hành động `Làm lại` có chủ đích tạo ID mới.
- Chỉ submit thành công mới tạo immutable attempt và cập nhật lesson/unit/course progress.
