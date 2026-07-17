# UniLish — ERD hiện trạng

ERD này phản ánh trực tiếp các Mongoose model đang được triển khai trong
`server/src/models/mongo` tại thời điểm cập nhật. Đây là mô hình logic của
MongoDB: các object lồng (`content`, `modules`, `snapshot`, `draft`, `feedback`,
...) được giữ trong document và không tách thành collection riêng.

Quy ước:

- `PK`: khóa chính MongoDB.
- `FK`: trường `ObjectId` có khai báo `ref` tới model khác.
- `UK`: unique key hoặc thuộc unique compound index.
- `ObjectId_array`: mảng reference; quan hệ vật lý được lưu ở một phía.
- Các field trong sơ đồ là field cốt lõi, không phải toàn bộ schema.

## ERD tổng thể

```mermaid
erDiagram
    LANGUAGE {
        ObjectId _id PK
        string code UK
        string name
        string nativeName
        boolean isActive
    }

    LEARNING_GOAL {
        ObjectId _id PK
        string slug UK
        string title
        ObjectId_array supportedLanguages FK
        json skillWeights
        boolean isActive
    }

    COURSE {
        ObjectId _id PK
        ObjectId languageId FK
        ObjectId learningGoalId FK
        ObjectId prerequisiteCourseId FK
        string slug UK
        string name
        string level
        number orderIndex
        json finalExamConfig
        boolean isActive
    }

    UNIT {
        ObjectId _id PK
        ObjectId courseId FK
        string title
        number orderIndex
        json contextSeed
        string vectorId
    }

    LESSON {
        ObjectId _id PK
        ObjectId unitId FK
        ObjectId_array taughtConcepts FK
        string title
        string type
        number orderIndex
        Mixed content
        json practiceConfig
    }

    CONCEPT {
        ObjectId _id PK
        ObjectId languageId FK
        string key UK
        string name
        string type
        Mixed metaData
    }

    QUESTION {
        ObjectId _id PK
        ObjectId languageId FK
        ObjectId testedConcept FK
        ObjectId createdBy FK
        ObjectId reviewedBy FK
        string source
        string skill
        string type
        string difficulty
        string status
        Mixed content
    }

    USER {
        ObjectId _id PK
        string email UK
        string googleId UK
        string role
        ObjectId lastActiveCourseId FK
        ObjectId learningLanguageId FK
        ObjectId learningGoalId FK
        string currentLevel
        string targetLevel
    }

    COURSE_ENROLLMENT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId courseId FK
        ObjectId lastLessonId FK
        string status
        number completedLessonCount
        number totalRequiredLessonCount
        number timeSpentSeconds
    }

    LEARNER_LESSON_PROGRESS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId enrollmentId FK
        ObjectId courseId FK
        ObjectId unitId FK
        ObjectId lessonId FK
        string status
        number checkpointVersion
        Mixed checkpoint
        number bestScore
    }

    LEARNER_LESSON_ATTEMPT {
        ObjectId _id PK
        string clientAttemptId UK
        ObjectId userId FK
        ObjectId enrollmentId FK
        ObjectId lessonId FK
        string submissionKind
        Mixed submittedAnswers
        number score
        boolean passed
    }

    USER_LESSON_PROGRESS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId lessonId FK
        string sessionId UK
        string traceId
        json sessionMetrics
        json transcript
        json evaluation
    }

    PLACEMENT_TEST {
        ObjectId _id PK
        ObjectId languageId FK
        ObjectId createdBy FK
        ObjectId updatedBy FK
        string name
        string standard
        string status
        number version
        json modules
        json cefrMapping
    }

    PLACEMENT_TEST_ATTEMPT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId placementTestId FK
        string status
        Date startedAt
        Date expiresAt
        json runtimeSnapshot
        json answerSheet
        json scoring
    }

    PLACEMENT_SESSION {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId placementTestId FK
        ObjectId lrAttemptId FK
        string status
        string currentModule
        json writing
        json speaking
        string overallFeedback
    }

    EXAM_TEST {
        ObjectId _id PK
        ObjectId languageId FK
        ObjectId createdBy FK
        ObjectId updatedBy FK
        ObjectId logicalTestId
        string format
        string kind
        string slug
        string skill
        string questionType
        string status
        number version
        Mixed content
        json modules
    }

    IELTS_PRACTICE_ATTEMPT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId examTestId FK
        ObjectId logicalTestId
        number examVersion
        string skill
        string questionType
        string status
        number revision
        Mixed contentSnapshot
        Mixed draft
        Mixed result
    }

    SHADOWING_VIDEO {
        ObjectId _id PK
        string videoId UK
        ObjectId addedBy FK
        string title
        string thumbnailUrl
        number durationSeconds
        json cues
        string status
    }

    LANGUAGE }o--o{ LEARNING_GOAL : "supported by"
    LANGUAGE ||--o{ COURSE : "categorizes"
    LEARNING_GOAL ||--o{ COURSE : "targets"
    COURSE o|--o{ COURSE : "prerequisite"
    COURSE ||--o{ UNIT : "contains"
    UNIT ||--o{ LESSON : "contains"
    LANGUAGE ||--o{ CONCEPT : "defines"
    CONCEPT }o--o{ LESSON : "taught in"
    LANGUAGE ||--o{ QUESTION : "owns"
    CONCEPT ||--o{ QUESTION : "tested by"
    LESSON }o--o{ QUESTION : "fixed practice"
    COURSE }o--o{ LESSON : "final exam pool"

    LANGUAGE o|--o{ USER : "learning language"
    LEARNING_GOAL o|--o{ USER : "selected goal"
    COURSE o|--o{ USER : "last active course"
    USER ||--o{ COURSE_ENROLLMENT : "enrolls"
    COURSE ||--o{ COURSE_ENROLLMENT : "receives"
    LESSON o|--o{ COURSE_ENROLLMENT : "last position"

    USER ||--o{ LEARNER_LESSON_PROGRESS : "owns"
    COURSE_ENROLLMENT ||--o{ LEARNER_LESSON_PROGRESS : "groups"
    COURSE ||--o{ LEARNER_LESSON_PROGRESS : "denormalizes"
    UNIT ||--o{ LEARNER_LESSON_PROGRESS : "denormalizes"
    LESSON ||--o{ LEARNER_LESSON_PROGRESS : "tracks"

    USER ||--o{ LEARNER_LESSON_ATTEMPT : "submits"
    COURSE_ENROLLMENT ||--o{ LEARNER_LESSON_ATTEMPT : "groups"
    LESSON ||--o{ LEARNER_LESSON_ATTEMPT : "attempted"
    USER ||--o{ USER_LESSON_PROGRESS : "owns speaking session"
    LESSON ||--o{ USER_LESSON_PROGRESS : "speaking result"

    LANGUAGE ||--o{ PLACEMENT_TEST : "configures"
    USER ||--o{ PLACEMENT_TEST : "creates"
    USER o|--o{ PLACEMENT_TEST : "updates"
    USER ||--o{ PLACEMENT_TEST_ATTEMPT : "takes"
    PLACEMENT_TEST ||--o{ PLACEMENT_TEST_ATTEMPT : "snapshots"
    USER ||--o{ PLACEMENT_SESSION : "owns"
    PLACEMENT_TEST ||--o{ PLACEMENT_SESSION : "drives"
    PLACEMENT_TEST_ATTEMPT ||--o| PLACEMENT_SESSION : "continues as"

    LANGUAGE ||--o{ EXAM_TEST : "configures"
    USER ||--o{ EXAM_TEST : "creates"
    USER o|--o{ EXAM_TEST : "updates"
    USER ||--o{ IELTS_PRACTICE_ATTEMPT : "takes"
    EXAM_TEST ||--o{ IELTS_PRACTICE_ATTEMPT : "snapshotted by"

    USER ||--o{ QUESTION : "creates"
    USER o|--o{ QUESTION : "reviews"
    USER ||--o{ SHADOWING_VIDEO : "adds"
```

## Nhóm chức năng

| Nhóm | Collection | Vai trò |
|---|---|---|
| Danh mục học | `languages`, `learninggoals`, `courses`, `units`, `lessons` | Cấu trúc chương trình học |
| Knowledge graph/CMS | `concepts`, `questions` | Concept và ngân hàng câu hỏi |
| Tiến độ học | `courseenrollments`, `learnerlessonprogresses`, `learnerlessonattempts` | Enrollment, checkpoint và lịch sử nộp bài |
| Speaking legacy | `userlessonprogresses` | Kết quả từng phiên luyện nói; không phải progress tổng quát |
| Placement | `placementtests`, `placementtestattempts`, `placementsessions` | Cấu hình đề, L/R attempt và chuỗi Writing/Speaking |
| IELTS/Exam | `examtests`, `ieltspracticeattempts` | Full exam/skill practice và attempt snapshot |
| Vận hành | `shadowing_videos` | Nội dung shadowing |

## Constraint và index quan trọng

| Collection | Constraint chính |
|---|---|
| `languages` | `code` unique |
| `learninggoals` | `slug` unique |
| `courses` | `slug` unique; `{ languageId, learningGoalId, level, orderIndex }` unique |
| `units` | `{ courseId, orderIndex }` unique |
| `concepts` | `{ languageId, key }` unique |
| `users` | `email` unique; `googleId` sparse unique |
| `courseenrollments` | `{ userId, courseId }` unique |
| `learnerlessonprogresses` | `{ userId, lessonId }` unique |
| `learnerlessonattempts` | `{ userId, clientAttemptId }` unique |
| `userlessonprogresses` | `sessionId` unique |
| `placementsessions` | `{ userId, lrAttemptId }` unique |
| `examtests` | `{ logicalTestId, version }` sparse unique |
| `ieltspracticeattempts` | Một `in_progress` attempt cho `{ userId, logicalTestId }` bằng partial unique index |
| `shadowing_videos` | `videoId` unique |

## Lưu ý kiến trúc

1. `Course.seriesId` vẫn tồn tại để tương thích migration nhưng trỏ tới
   `CourseSeries`, trong khi project hiện không còn model `CourseSeries`; vì vậy
   quan hệ này không được đưa vào ERD chính.
2. `Lesson.taughtConcepts` và `Question.testedConcept` vẫn đang tồn tại trong
   schema hiện hành, dù tài liệu migration trước đó từng đề xuất loại bỏ.
3. `LearnerLessonProgress` là aggregate tiến độ chung. `UserLessonProgress` là
   kết quả phiên Speaking cũ; hai collection không nên được hiểu là cùng một
   loại dữ liệu.
4. `ExamTest.logicalTestId` và `IeltsPracticeAttempt.logicalTestId` là khóa gom
   version theo nghiệp vụ, không khai báo Mongoose `ref`, nên không vẽ như FK.
5. Pinecone không phải MongoDB collection. `Unit.vectorId` và
   `KnowledgeVectorMetadata.mongo_id` là liên kết cross-store mềm, không có ràng
   buộc FK.
6. Các snapshot và nội dung polymorphic được embed trong document để giữ đúng
   cách MongoDB/Mongoose đang lưu dữ liệu; chúng không phải entity độc lập.

## Nguồn đối chiếu

- Mongo models: `server/src/models/mongo/*.model.ts`
- Vector metadata: `server/src/models/vector/*.ts`
- Luồng học: `docs/course-learning/data-model.md`
- IELTS Practice: `docs/ielts-practice/data-model.md`
