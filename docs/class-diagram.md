# UniLish - Class diagram

So do nay ve theo dang UML class diagram: moi class co thuoc tinh va phuong
thuc. Danh sach class dua tren 18 model hien co trong `docs/erd.md`.

Code TypeScript duoc sinh tu domain model nam o
`server/src/types/domain-model.types.ts`.

## Class diagram

![Class diagram](class-diagram.png)

```mermaid
classDiagram
    direction LR

    class Language {
        +ObjectId _id
        +string code
        +string name
        +string nativeName
        +boolean isActive
        +activate()
        +deactivate()
        +updateInfo()
    }

    class LearningGoal {
        +ObjectId _id
        +string slug
        +string title
        +ObjectId[] supportedLanguages
        +json skillWeights
        +boolean isActive
        +addSupportedLanguage()
        +removeSupportedLanguage()
        +updateSkillWeights()
    }

    class Course {
        +ObjectId _id
        +ObjectId languageId
        +ObjectId learningGoalId
        +ObjectId prerequisiteCourseId
        +string slug
        +string name
        +string level
        +number orderIndex
        +json finalExamConfig
        +activate()
        +deactivate()
        +setPrerequisite()
        +updateFinalExamConfig()
    }

    class Unit {
        +ObjectId _id
        +ObjectId courseId
        +string title
        +number orderIndex
        +json contextSeed
        +string vectorId
        +updateContextSeed()
        +attachVector()
        +reorder()
    }

    class Lesson {
        +ObjectId _id
        +ObjectId unitId
        +ObjectId[] taughtConcepts
        +string title
        +string type
        +number orderIndex
        +Mixed content
        +json practiceConfig
        +setContent()
        +setPracticeConfig()
        +setTaughtConcepts()
        +isTest()
        +hasFixedQuestions()
    }

    class Concept {
        +ObjectId _id
        +ObjectId languageId
        +string key
        +string name
        +string type
        +Mixed metaData
        +updateMetadata()
        +rename()
    }

    class Question {
        +ObjectId _id
        +ObjectId languageId
        +ObjectId testedConcept
        +ObjectId createdBy
        +ObjectId reviewedBy
        +string source
        +string skill
        +string type
        +string difficulty
        +string status
        +Mixed content
        +publish()
        +archive()
        +review()
        +findByConcept()
        +findRandom()
    }

    class User {
        +ObjectId _id
        +string email
        +string googleId
        +string role
        +ObjectId lastActiveCourseId
        +ObjectId learningLanguageId
        +ObjectId learningGoalId
        +string currentLevel
        +string targetLevel
        +updateProfile()
        +setLearningLanguage()
        +setLearningGoal()
        +setLastActiveCourse()
    }

    class CourseEnrollment {
        +ObjectId _id
        +ObjectId userId
        +ObjectId courseId
        +ObjectId lastLessonId
        +string status
        +number completedLessonCount
        +number totalRequiredLessonCount
        +number timeSpentSeconds
        +start()
        +pause()
        +completeLesson()
        +updateLastLesson()
        +calculateProgress()
    }

    class LearnerLessonProgress {
        +ObjectId _id
        +ObjectId userId
        +ObjectId enrollmentId
        +ObjectId courseId
        +ObjectId unitId
        +ObjectId lessonId
        +string status
        +number checkpointVersion
        +Mixed checkpoint
        +number bestScore
        +saveCheckpoint()
        +markInProgress()
        +markCompleted()
        +updateBestScore()
    }

    class LearnerLessonAttempt {
        +ObjectId _id
        +string clientAttemptId
        +ObjectId userId
        +ObjectId enrollmentId
        +ObjectId lessonId
        +string submissionKind
        +Mixed submittedAnswers
        +number score
        +boolean passed
        +grade()
        +markPassed()
        +markFailed()
    }

    class UserLessonProgress {
        +ObjectId _id
        +ObjectId userId
        +ObjectId lessonId
        +string sessionId
        +string traceId
        +json sessionMetrics
        +json transcript
        +json evaluation
        +recordSession()
        +updateTranscript()
        +saveEvaluation()
    }

    class PlacementTest {
        +ObjectId _id
        +ObjectId languageId
        +ObjectId createdBy
        +ObjectId updatedBy
        +string name
        +string standard
        +string status
        +number version
        +json modules
        +json cefrMapping
        +validateConfig()
        +publish()
        +archive()
        +createVersion()
    }

    class PlacementTestAttempt {
        +ObjectId _id
        +ObjectId userId
        +ObjectId placementTestId
        +string status
        +Date startedAt
        +Date expiresAt
        +json runtimeSnapshot
        +json answerSheet
        +json scoring
        +saveAnswers()
        +submit()
        +calculateScore()
        +expire()
    }

    class PlacementSession {
        +ObjectId _id
        +ObjectId userId
        +ObjectId placementTestId
        +ObjectId lrAttemptId
        +string status
        +string currentModule
        +json writing
        +json speaking
        +string overallFeedback
        +startWriting()
        +submitWriting()
        +startSpeaking()
        +submitSpeaking()
        +finalize()
    }

    class ExamTest {
        +ObjectId _id
        +ObjectId languageId
        +ObjectId createdBy
        +ObjectId updatedBy
        +ObjectId logicalTestId
        +string format
        +string kind
        +string slug
        +string skill
        +string questionType
        +string status
        +number version
        +publish()
        +pause()
        +archive()
        +createVersion()
        +validateForPublish()
    }

    class IeltsPracticeAttempt {
        +ObjectId _id
        +ObjectId userId
        +ObjectId examTestId
        +ObjectId logicalTestId
        +number examVersion
        +string skill
        +string questionType
        +string status
        +number revision
        +Mixed result
        +start()
        +autosave()
        +submit()
        +grade()
        +expire()
    }

    class ShadowingVideo {
        +ObjectId _id
        +string videoId
        +ObjectId addedBy
        +string title
        +string thumbnailUrl
        +number durationSeconds
        +json cues
        +string status
        +processCues()
        +markReady()
        +markFailed()
    }

    Language "0..*" --> "0..*" LearningGoal : supports
    Language "1" --> "0..*" Course : categorizes
    LearningGoal "1" --> "0..*" Course : targets
    Course "0..1" --> "0..*" Course : prerequisite
    Course "1" *-- "0..*" Unit : contains
    Unit "1" *-- "0..*" Lesson : contains

    Language "1" --> "0..*" Concept : defines
    Lesson "0..*" --> "0..*" Concept : teaches
    Language "1" --> "0..*" Question : owns
    Question "0..*" --> "0..1" Concept : tests
    Lesson "0..*" --> "0..*" Question : uses
    Course "0..*" --> "0..*" Lesson : finalExamPool

    User "0..1" --> "1" Language : learningLanguage
    User "0..1" --> "1" LearningGoal : learningGoal
    User "0..1" --> "1" Course : lastActiveCourse
    User "1" *-- "0..*" CourseEnrollment : enrolls
    CourseEnrollment "0..*" --> "1" Course : course
    CourseEnrollment "0..*" --> "0..1" Lesson : lastLesson

    CourseEnrollment "1" *-- "0..*" LearnerLessonProgress : progress
    LearnerLessonProgress "0..*" --> "1" Lesson : lesson
    CourseEnrollment "1" *-- "0..*" LearnerLessonAttempt : attempts
    LearnerLessonAttempt "0..*" --> "1" Lesson : lesson
    User "1" *-- "0..*" UserLessonProgress : speakingResults
    UserLessonProgress "0..*" --> "1" Lesson : lesson

    Language "1" --> "0..*" PlacementTest : configures
    PlacementTest "1" *-- "0..*" PlacementTestAttempt : attempts
    User "1" *-- "0..*" PlacementTestAttempt : takes
    PlacementTestAttempt "0..1" --> "0..1" PlacementSession : continuesAs
    User "1" *-- "0..*" PlacementSession : owns

    Language "1" --> "0..*" ExamTest : configures
    ExamTest "1" *-- "0..*" IeltsPracticeAttempt : attempts
    User "1" *-- "0..*" IeltsPracticeAttempt : takes
    User "1" --> "0..*" ShadowingVideo : adds
```

## Ghi chu

- Thuoc tinh dua tren ERD hien tai.
- Phuong thuc the hien hanh vi nghiep vu chinh dang co trong model/service/repository.
- `UserKnowledgeState` va `AuditLog` khong con trong so do vi model da bi xoa.
