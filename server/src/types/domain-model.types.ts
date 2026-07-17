import type { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;
export type JsonObject = Record<string, unknown>;
export type MixedValue = unknown;

export interface LanguageDomain {
    _id: ObjectId;
    code: string;
    name: string;
    nativeName: string;
    isActive: boolean;
}

export interface LearningGoalDomain {
    _id: ObjectId;
    slug: string;
    title: string;
    supportedLanguages: ObjectId[];
    skillWeights: JsonObject;
    isActive: boolean;
}

export interface CourseDomain {
    _id: ObjectId;
    languageId: ObjectId;
    learningGoalId: ObjectId;
    prerequisiteCourseId?: ObjectId;
    slug: string;
    name: string;
    level: string;
    orderIndex: number;
    finalExamConfig?: JsonObject;
    isActive: boolean;
}

export interface UnitDomain {
    _id: ObjectId;
    courseId: ObjectId;
    title: string;
    orderIndex: number;
    contextSeed?: JsonObject;
    vectorId?: string;
}

export interface LessonDomain {
    _id: ObjectId;
    unitId: ObjectId;
    taughtConcepts: ObjectId[];
    title: string;
    type: string;
    orderIndex: number;
    content?: MixedValue;
    practiceConfig?: JsonObject;
}

export interface ConceptDomain {
    _id: ObjectId;
    languageId: ObjectId;
    key: string;
    name: string;
    type: string;
    metaData?: MixedValue;
}

export interface QuestionDomain {
    _id: ObjectId;
    languageId: ObjectId;
    testedConcept?: ObjectId;
    createdBy?: ObjectId;
    reviewedBy?: ObjectId;
    source: string;
    skill: string;
    type: string;
    difficulty: string;
    status: string;
    content: MixedValue;
}

export interface UserDomain {
    _id: ObjectId;
    email: string;
    googleId?: string;
    role: string;
    lastActiveCourseId?: ObjectId;
    learningLanguageId?: ObjectId;
    learningGoalId?: ObjectId;
    currentLevel?: string;
    targetLevel?: string;
}

export interface CourseEnrollmentDomain {
    _id: ObjectId;
    userId: ObjectId;
    courseId: ObjectId;
    lastLessonId?: ObjectId;
    status: string;
    completedLessonCount: number;
    totalRequiredLessonCount: number;
    timeSpentSeconds: number;
}

export interface LearnerLessonProgressDomain {
    _id: ObjectId;
    userId: ObjectId;
    enrollmentId: ObjectId;
    courseId: ObjectId;
    unitId: ObjectId;
    lessonId: ObjectId;
    status: string;
    checkpointVersion: number;
    checkpoint?: MixedValue;
    bestScore?: number;
}

export interface LearnerLessonAttemptDomain {
    _id: ObjectId;
    clientAttemptId: string;
    userId: ObjectId;
    enrollmentId: ObjectId;
    lessonId: ObjectId;
    submissionKind: string;
    submittedAnswers: MixedValue;
    score?: number;
    passed?: boolean;
}

export interface UserLessonProgressDomain {
    _id: ObjectId;
    userId: ObjectId;
    lessonId: ObjectId;
    sessionId: string;
    traceId?: string;
    sessionMetrics?: JsonObject;
    transcript?: JsonObject;
    evaluation?: JsonObject;
}

export interface PlacementTestDomain {
    _id: ObjectId;
    languageId: ObjectId;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    name: string;
    standard: string;
    status: string;
    version: number;
    modules: JsonObject;
    cefrMapping: JsonObject;
}

export interface PlacementTestAttemptDomain {
    _id: ObjectId;
    userId: ObjectId;
    placementTestId: ObjectId;
    status: string;
    startedAt: Date;
    expiresAt: Date;
    runtimeSnapshot?: JsonObject;
    answerSheet?: JsonObject;
    scoring?: JsonObject;
}

export interface PlacementSessionDomain {
    _id: ObjectId;
    userId: ObjectId;
    placementTestId: ObjectId;
    lrAttemptId?: ObjectId;
    status: string;
    currentModule: string;
    writing?: JsonObject;
    speaking?: JsonObject;
    overallFeedback?: string;
}

export interface ExamTestDomain {
    _id: ObjectId;
    languageId: ObjectId;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    logicalTestId?: ObjectId;
    format: string;
    kind: string;
    slug?: string;
    skill?: string;
    questionType?: string;
    status: string;
    version: number;
    content?: MixedValue;
    modules?: JsonObject;
}

export interface IeltsPracticeAttemptDomain {
    _id: ObjectId;
    userId: ObjectId;
    examTestId: ObjectId;
    logicalTestId?: ObjectId;
    examVersion: number;
    skill: string;
    questionType?: string;
    status: string;
    revision: number;
    contentSnapshot: MixedValue;
    draft?: MixedValue;
    result?: MixedValue;
}

export interface ShadowingVideoDomain {
    _id: ObjectId;
    videoId: string;
    addedBy?: ObjectId;
    title: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    cues: JsonObject[];
    status: string;
}

export interface DomainModelMap {
    Language: LanguageDomain;
    LearningGoal: LearningGoalDomain;
    Course: CourseDomain;
    Unit: UnitDomain;
    Lesson: LessonDomain;
    Concept: ConceptDomain;
    Question: QuestionDomain;
    User: UserDomain;
    CourseEnrollment: CourseEnrollmentDomain;
    LearnerLessonProgress: LearnerLessonProgressDomain;
    LearnerLessonAttempt: LearnerLessonAttemptDomain;
    UserLessonProgress: UserLessonProgressDomain;
    PlacementTest: PlacementTestDomain;
    PlacementTestAttempt: PlacementTestAttemptDomain;
    PlacementSession: PlacementSessionDomain;
    ExamTest: ExamTestDomain;
    IeltsPracticeAttempt: IeltsPracticeAttemptDomain;
    ShadowingVideo: ShadowingVideoDomain;
}

export type DomainModelName = keyof DomainModelMap;
export type DomainModel = DomainModelMap[DomainModelName];
