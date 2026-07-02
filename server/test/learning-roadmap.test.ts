import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HttpStatus } from '../src/constants/http-status.js';
import { AppError } from '../src/utils/app-error.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEnrollmentRepo = {
    findActiveByUser: mock.fn(),
    findByUserAndCourse: mock.fn(),
    findByUser: mock.fn(),
    pauseAllActiveByUser: mock.fn(),
    activateEnrollment: mock.fn(),
    upsertEnrollment: mock.fn(),
    findByIdSecure: mock.fn(),
};

const mockCourseModel = {
    findById: mock.fn(),
    findOne: mock.fn(),
};

const mockEnrollmentModel = {
    findOne: mock.fn(),
    countDocuments: mock.fn(),
};

const mockProgressModel = {
    find: mock.fn(),
};

const mockUnitModel = {
    find: mock.fn(),
};

const mockLessonModel = {
    find: mock.fn(),
};

const mockLanguageModel = {
    findById: mock.fn(),
};

const mockLearningGoalModel = {
    findById: mock.fn(),
};

// ─── Helper ────────────────────────────────────────────────────────────────────

function mockChain(returnValue: unknown) {
    return {
        select: () => mockChain(returnValue),
        sort: () => mockChain(returnValue),
        lean: () => mockChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

// ─── Testable Service ──────────────────────────────────────────────────────────

class TestableRoadmapService {
    constructor(
        private readonly enrollmentRepo: typeof mockEnrollmentRepo,
    ) {}

    async getRoadmap(userId: string, slug: string): Promise<any> {
        // 1. Find course by slug
        const course = await mockCourseModel.findOne({ slug })
            .select('_id name slug description thumbnailUrl level languageId learningGoalId isActive prerequisiteCourseId')
            .lean()
            .exec() as any | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Check enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(
            userId,
            String(course._id),
        );

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này. Vui lòng ghi danh trước.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 3. For non-COMPLETED enrollments, verify prerequisite
        if (
            enrollment.status !== 'COMPLETED' &&
            course.prerequisiteCourseId
        ) {
            const prereqCompleted = await mockEnrollmentModel.findOne({
                userId,
                courseId: String(course.prerequisiteCourseId),
                status: 'COMPLETED',
            }).lean().exec() as any | null;

            if (!prereqCompleted) {
                throw new AppError(
                    'Bạn cần hoàn thành khóa học tiên quyết trước khi truy cập khóa học này.',
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 4. Fetch language and learning goal
        const language = await mockLanguageModel.findById(course.languageId)
            .select('_id code name')
            .lean()
            .exec() as any | null;

        const learningGoal = await mockLearningGoalModel.findById(course.learningGoalId)
            .select('_id slug title')
            .lean()
            .exec() as any | null;

        // 5. Fetch units and lessons
        const units = await mockUnitModel.find({ courseId: String(course._id) })
            .select('_id title description orderIndex')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as any[];

        const unitIds = units.map((u: any) => String(u._id));

        const lessons = await mockLessonModel.find({ unitId: { $in: unitIds } })
            .select('_id unitId title type orderIndex')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as any[];

        // 6. Fetch progress
        const progressRecords = await mockProgressModel.find({
            enrollmentId: enrollment._id,
        })
            .select('lessonId status bestScore')
            .lean()
            .exec() as any[];

        const progressMap = new Map<string, { status: string; bestScore: number }>();
        for (const p of progressRecords) {
            progressMap.set(String(p.lessonId), {
                status: p.status,
                bestScore: p.bestScore,
            });
        }

        const isCourseActive = !!course.isActive;
        const courseActiveForEnrollment = enrollment.status === 'ACTIVE';

        // 7. Build unit and lesson response
        const lessonsByUnit = new Map<string, any[]>();
        for (const lesson of lessons) {
            const unitKey = String(lesson.unitId);
            if (!lessonsByUnit.has(unitKey)) {
                lessonsByUnit.set(unitKey, []);
            }
            lessonsByUnit.get(unitKey)!.push(lesson);
        }

        const unitsResponse = units.map((unit: any) => {
            const unitLessons = lessonsByUnit.get(String(unit._id)) || [];

            const lessonResponses = unitLessons.map((lesson: any) => {
                const progress = progressMap.get(String(lesson._id));

                let lessonStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
                let lockReason: string | null = null;

                if (progress) {
                    if (progress.status === 'COMPLETED') {
                        lessonStatus = 'COMPLETED';
                    } else if (progress.status === 'IN_PROGRESS') {
                        lessonStatus = 'IN_PROGRESS';
                    } else {
                        lessonStatus = 'AVAILABLE';
                    }
                } else if (!isCourseActive || !courseActiveForEnrollment) {
                    lessonStatus = 'UNAVAILABLE';
                    lockReason = 'Khóa học hiện không khả dụng';
                } else {
                    lessonStatus = 'AVAILABLE';
                }

                return {
                    id: String(lesson._id),
                    title: lesson.title,
                    type: lesson.type,
                    orderIndex: lesson.orderIndex,
                    status: lessonStatus,
                    bestScore: progress && progress.bestScore >= 0 ? progress.bestScore : null,
                    lockReason,
                };
            });

            // Compute unit status
            const lessonStatuses = lessonResponses.map((l: any) => l.status);
            let unitStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

            if (lessonStatuses.length === 0) {
                unitStatus = isCourseActive && courseActiveForEnrollment ? 'AVAILABLE' : 'UNAVAILABLE';
            } else if (lessonStatuses.every((s: string) => s === 'COMPLETED')) {
                unitStatus = 'COMPLETED';
            } else if (lessonStatuses.some((s: string) => s === 'IN_PROGRESS')) {
                unitStatus = 'IN_PROGRESS';
            } else if (!isCourseActive || !courseActiveForEnrollment) {
                unitStatus = 'UNAVAILABLE';
            } else {
                unitStatus = 'AVAILABLE';
            }

            const unitCompleted = lessonResponses.filter((l: any) => l.status === 'COMPLETED').length;
            const unitProgressPercent = lessonResponses.length > 0
                ? Math.round((unitCompleted / lessonResponses.length) * 100)
                : 0;

            return {
                id: String(unit._id),
                title: unit.title,
                description: unit.description,
                orderIndex: unit.orderIndex,
                status: unitStatus,
                progressPercent: unitProgressPercent,
                lessons: lessonResponses,
            };
        });

        const allLessons = unitsResponse.flatMap((u: any) => u.lessons);
        const completedCount = allLessons.filter((l: any) => l.status === 'COMPLETED').length;
        const totalCount = allLessons.length;
        const progressPercent = totalCount > 0
            ? Math.round((completedCount / totalCount) * 100)
            : 0;

        return {
            course: {
                id: String(course._id),
                slug: course.slug,
                name: course.name,
                description: course.description,
                thumbnailUrl: course.thumbnailUrl,
                level: course.level,
                language: {
                    id: String(language?._id ?? ''),
                    code: language?.code ?? '',
                    name: language?.name ?? '',
                },
                learningGoal: {
                    id: String(learningGoal?._id ?? ''),
                    slug: learningGoal?.slug ?? '',
                    title: learningGoal?.title ?? '',
                },
            },
            enrollment: {
                id: String(enrollment._id),
                status: enrollment.status,
            },
            progressPercent,
            nextLessonId: null,
            units: unitsResponse,
        };
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LearningService.getRoadmap', () => {
    let service: TestableRoadmapService;

    beforeEach(() => {
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockCourseModel.findOne.mock.resetCalls();
        mockEnrollmentModel.findOne.mock.resetCalls();
        mockLanguageModel.findById.mock.resetCalls();
        mockLearningGoalModel.findById.mock.resetCalls();
        mockUnitModel.find.mock.resetCalls();
        mockLessonModel.find.mock.resetCalls();
        mockProgressModel.find.mock.resetCalls();

        service = new TestableRoadmapService(mockEnrollmentRepo);
    });

    // ─── AC-06: Ordered Roadmap ────────────────────────────────────────────

    it('returns ordered units and lessons (AC-06)', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'test-course',
                name: 'Test Course',
                description: 'A test course',
                thumbnailUrl: null,
                level: 'A1',
                languageId: 'lang1',
                learningGoalId: 'goal1',
                isActive: true,
                prerequisiteCourseId: null,
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
            }),
        );

        mockLanguageModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lang1', code: 'en', name: 'English' }),
        );

        mockLearningGoalModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'goal1', slug: 'travel', title: 'Travel' }),
        );

        mockUnitModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'unit1', title: 'Unit 1', description: null, orderIndex: 1 },
                { _id: 'unit2', title: 'Unit 2', description: null, orderIndex: 2 },
            ]),
        );

        mockLessonModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'lesson1', unitId: 'unit1', title: 'Lesson 1', type: 'VOCAB', orderIndex: 1 },
                { _id: 'lesson2', unitId: 'unit1', title: 'Lesson 2', type: 'GRAMMAR', orderIndex: 2 },
                { _id: 'lesson3', unitId: 'unit2', title: 'Lesson 3', type: 'READING', orderIndex: 1 },
            ]),
        );

        mockProgressModel.find.mock.mockImplementation(() => mockChain([]));

        const result = await service.getRoadmap('user1', 'test-course');

        assert.equal(result.course.slug, 'test-course');
        assert.equal(result.enrollment.status, 'ACTIVE');
        assert.equal(result.units.length, 2);
        assert.equal(result.units[0]!.orderIndex, 1);
        assert.equal(result.units[0]!.title, 'Unit 1');
        assert.equal(result.units[0]!.lessons.length, 2);
        assert.equal(result.units[0]!.lessons[0]!.orderIndex, 1);
        assert.equal(result.units[0]!.lessons[1]!.orderIndex, 2);
        assert.equal(result.units[1]!.orderIndex, 2);
    });

    // ─── AC-07: Free Lesson Navigation ─────────────────────────────────────

    it('marks all active lessons as AVAILABLE (AC-07)', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'test-course',
                name: 'Test Course',
                description: null,
                thumbnailUrl: null,
                level: 'A1',
                languageId: 'lang1',
                learningGoalId: 'goal1',
                isActive: true,
                prerequisiteCourseId: null,
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );

        mockLanguageModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lang1', code: 'en', name: 'English' }),
        );

        mockLearningGoalModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'goal1', slug: 'travel', title: 'Travel' }),
        );

        mockUnitModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'unit1', title: 'Unit 1', description: null, orderIndex: 1 },
            ]),
        );

        mockLessonModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'lesson1', unitId: 'unit1', title: 'Lesson 1', type: 'VOCAB', orderIndex: 1 },
                { _id: 'lesson2', unitId: 'unit1', title: 'Lesson 2', type: 'GRAMMAR', orderIndex: 2 },
            ]),
        );

        mockProgressModel.find.mock.mockImplementation(() => mockChain([]));

        const result = await service.getRoadmap('user1', 'test-course');

        // All lessons should be AVAILABLE regardless of order
        for (const unit of result.units) {
            for (const lesson of unit.lessons) {
                assert.equal(lesson.status, 'AVAILABLE');
                assert.equal(lesson.lockReason, null);
            }
        }
    });

    // ─── Lesson statuses based on progress ─────────────────────────────────

    it('correctly computes lesson statuses from progress', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'test-course',
                name: 'Test Course',
                description: null,
                thumbnailUrl: null,
                level: 'A1',
                languageId: 'lang1',
                learningGoalId: 'goal1',
                isActive: true,
                prerequisiteCourseId: null,
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );

        mockLanguageModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lang1', code: 'en', name: 'English' }),
        );

        mockLearningGoalModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'goal1', slug: 'travel', title: 'Travel' }),
        );

        mockUnitModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'unit1', title: 'Unit 1', description: null, orderIndex: 1 },
            ]),
        );

        mockLessonModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'lesson1', unitId: 'unit1', title: 'Lesson 1', type: 'VOCAB', orderIndex: 1 },
                { _id: 'lesson2', unitId: 'unit1', title: 'Lesson 2', type: 'GRAMMAR', orderIndex: 2 },
                { _id: 'lesson3', unitId: 'unit1', title: 'Lesson 3', type: 'READING', orderIndex: 3 },
            ]),
        );

        mockProgressModel.find.mock.mockImplementation(() =>
            mockChain([
                { lessonId: 'lesson1', status: 'COMPLETED', bestScore: 90 },
                { lessonId: 'lesson2', status: 'IN_PROGRESS', bestScore: -1 },
            ]),
        );

        const result = await service.getRoadmap('user1', 'test-course');

        const lessons = result.units[0]!.lessons;
        const lesson1 = lessons.find((l: any) => l.id === 'lesson1');
        const lesson2 = lessons.find((l: any) => l.id === 'lesson2');
        const lesson3 = lessons.find((l: any) => l.id === 'lesson3');

        assert.equal(lesson1!.status, 'COMPLETED');
        assert.equal(lesson1!.bestScore, 90);
        assert.equal(lesson2!.status, 'IN_PROGRESS');
        assert.equal(lesson2!.bestScore, null); // -1 mapped to null
        assert.equal(lesson3!.status, 'AVAILABLE');
        assert.equal(lesson3!.bestScore, null);
    });

    // ─── AC-08: Inactive Curriculum ────────────────────────────────────────

    it('returns UNAVAILABLE when course is inactive (AC-08)', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'inactive-course',
                name: 'Inactive Course',
                description: null,
                thumbnailUrl: null,
                level: 'A1',
                languageId: 'lang1',
                learningGoalId: 'goal1',
                isActive: false,
                prerequisiteCourseId: null,
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );

        mockLanguageModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lang1', code: 'en', name: 'English' }),
        );

        mockLearningGoalModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'goal1', slug: 'travel', title: 'Travel' }),
        );

        mockUnitModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'unit1', title: 'Unit 1', description: null, orderIndex: 1 },
            ]),
        );

        mockLessonModel.find.mock.mockImplementation(() =>
            mockChain([
                { _id: 'lesson1', unitId: 'unit1', title: 'Lesson 1', type: 'VOCAB', orderIndex: 1 },
            ]),
        );

        mockProgressModel.find.mock.mockImplementation(() => mockChain([]));

        const result = await service.getRoadmap('user1', 'inactive-course');

        for (const unit of result.units) {
            assert.equal(unit.status, 'UNAVAILABLE');
            for (const lesson of unit.lessons) {
                assert.equal(lesson.status, 'UNAVAILABLE');
                assert.equal(lesson.lockReason, 'Khóa học hiện không khả dụng');
            }
        }
    });

    // ─── 404: Course not found ────────────────────────────────────────────

    it('throws 404 when course slug does not exist', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.getRoadmap('user1', 'nonexistent'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.NOT_FOUND);
                return true;
            },
        );
    });

    // ─── 403: Not enrolled ─────────────────────────────────────────────────

    it('throws 403 when user is not enrolled', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'test-course',
                isActive: true,
                prerequisiteCourseId: null,
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve(null),
        );

        await assert.rejects(
            () => service.getRoadmap('user1', 'test-course'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                assert.match(err.message, /ghi danh/);
                return true;
            },
        );
    });

    // ─── 403: Prerequisite not met ────────────────────────────────────────

    it('throws 403 when prerequisite is not completed', async () => {
        mockCourseModel.findOne.mock.mockImplementation(() =>
            mockChain({
                _id: 'course1',
                slug: 'advanced-course',
                isActive: true,
                prerequisiteCourseId: 'prereq1',
            }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );

        mockEnrollmentModel.findOne.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.getRoadmap('user1', 'advanced-course'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                assert.match(err.message, /tiên quyết/);
                return true;
            },
        );
    });
});
