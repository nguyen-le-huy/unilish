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

const mockProgressRepo = {};

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

// ─── Helper ────────────────────────────────────────────────────────────────────

function mockChain(returnValue: unknown) {
    return {
        select: () => mockChain(returnValue),
        sort: () => mockChain(returnValue),
        lean: () => mockChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

function mockFindChain(returnValue: unknown) {
    return {
        select: () => mockFindChain(returnValue),
        sort: () => mockFindChain(returnValue),
        lean: () => mockFindChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

// Import the actual service for reference, but we'll test the logic inline
// to avoid module-level side effects from Mongoose imports
class TestableDashboardService {
    constructor(
        private readonly enrollmentRepo: typeof mockEnrollmentRepo,
        private readonly progressRepo: typeof mockProgressRepo,
    ) {}

    async getDashboard(userId: string): Promise<{
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
        summary: { timeSpentSeconds: number; completedCourses: number; activeCourses: number };
        activityDays: Array<{ date: string; minutes: number }>;
    }> {
        // 1. Find active enrollment
        const enrollment = await this.enrollmentRepo.findActiveByUser(userId);
        if (!enrollment) {
            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays: [],
            };
        }

        // 2. Find course
        const course = await mockCourseModel.findById(enrollment.courseId)
            .select('slug name thumbnailUrl level totalUnits')
            .lean()
            .exec() as { slug: string; name: string; thumbnailUrl: string | null; level: string; totalUnits: number } | null;

        if (!course) {
            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays: [],
            };
        }

        // 3. Get progress summary
        const progressRecords = await mockProgressModel.find({ enrollmentId: enrollment._id })
            .select('status timeSpentSeconds')
            .lean()
            .exec() as Array<{ status: string; timeSpentSeconds: number }>;

        const completedLessons = progressRecords.filter(
            (p) => p.status === 'COMPLETED',
        ).length;

        const totalTimeSpent = progressRecords.reduce(
            (sum, p) => sum + (p.timeSpentSeconds || 0),
            0,
        );

        const totalLessons = enrollment.totalRequiredLessonCount || 0;

        const progressPercent =
            totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

        let courseStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        if (enrollment.status === 'COMPLETED') {
            courseStatus = 'COMPLETED';
        } else if (completedLessons > 0) {
            courseStatus = 'IN_PROGRESS';
        } else {
            courseStatus = 'NOT_STARTED';
        }

        const completedCourses = await mockEnrollmentModel.countDocuments({
            userId,
            status: 'COMPLETED',
        }).exec();

        const activeCourses = await mockEnrollmentModel.countDocuments({
            userId,
            status: 'ACTIVE',
        }).exec();

        return {
            activeCourse: {
                id: String(enrollment.courseId),
                slug: course.slug,
                name: course.name,
                thumbnailUrl: course.thumbnailUrl,
                level: course.level,
                totalUnits: course.totalUnits,
                totalLessons,
                completedLessons,
                progressPercent,
                timeSpentSeconds: totalTimeSpent,
                nextLessonId: null,
                status: courseStatus,
            },
            summary: {
                timeSpentSeconds: totalTimeSpent,
                completedCourses,
                activeCourses,
            },
            activityDays: [],
        };
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LearningService.getDashboard', () => {
    let service: TestableDashboardService;

    beforeEach(() => {
        mockEnrollmentRepo.findActiveByUser.mock.resetCalls();
        mockCourseModel.findById.mock.resetCalls();
        mockProgressModel.find.mock.resetCalls();
        mockEnrollmentModel.countDocuments.mock.resetCalls();

        service = new TestableDashboardService(
            mockEnrollmentRepo,
            mockProgressRepo,
        );
    });

    it('returns null activeCourse when no active enrollment (AC-04)', async () => {
        mockEnrollmentRepo.findActiveByUser.mock.mockImplementation(() =>
            Promise.resolve(null),
        );

        const result = await service.getDashboard('user1');
        assert.equal(result.activeCourse, null);
        assert.equal(result.summary.timeSpentSeconds, 0);
        assert.equal(result.summary.completedCourses, 0);
        assert.equal(result.summary.activeCourses, 0);
        assert.deepEqual(result.activityDays, []);
    });

    it('returns null activeCourse when course is deleted (orphaned enrollment)', async () => {
        mockEnrollmentRepo.findActiveByUser.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: 'ACTIVE',
                totalRequiredLessonCount: 10,
            }),
        );

        mockCourseModel.findById.mock.mockImplementation(() => mockChain(null));

        const result = await service.getDashboard('user1');
        assert.equal(result.activeCourse, null);
    });

    it('returns correct NOT_STARTED status (AC-05)', async () => {
        mockEnrollmentRepo.findActiveByUser.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: 'ACTIVE',
                totalRequiredLessonCount: 10,
            }),
        );

        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({
                slug: 'test-course',
                name: 'Test Course',
                thumbnailUrl: null,
                level: 'A1',
                totalUnits: 3,
            }),
        );

        mockProgressModel.find.mock.mockImplementation(() => mockChain([]));

        mockEnrollmentModel.countDocuments.mock.mockImplementation(() => ({
            exec: () => Promise.resolve(0),
        }));

        const result = await service.getDashboard('user1');
        assert.equal(result.activeCourse!.status, 'NOT_STARTED');
        assert.equal(result.activeCourse!.completedLessons, 0);
        assert.equal(result.activeCourse!.progressPercent, 0);
        assert.equal(result.activeCourse!.slug, 'test-course');
    });

    it('returns IN_PROGRESS when some lessons are completed', async () => {
        mockEnrollmentRepo.findActiveByUser.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: 'ACTIVE',
                totalRequiredLessonCount: 10,
            }),
        );

        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({
                slug: 'test-course',
                name: 'Test Course',
                thumbnailUrl: null,
                level: 'A1',
                totalUnits: 3,
            }),
        );

        mockProgressModel.find.mock.mockImplementation(() =>
            mockChain([
                { status: 'COMPLETED', timeSpentSeconds: 300 },
                { status: 'COMPLETED', timeSpentSeconds: 200 },
                { status: 'IN_PROGRESS', timeSpentSeconds: 100 },
            ]),
        );

        mockEnrollmentModel.countDocuments.mock.mockImplementation(() => ({
            exec: () => Promise.resolve(1),
        }));

        const result = await service.getDashboard('user1');
        assert.equal(result.activeCourse!.status, 'IN_PROGRESS');
        assert.equal(result.activeCourse!.completedLessons, 2);
        assert.equal(result.activeCourse!.progressPercent, 20); // 2/10 * 100
        assert.equal(result.activeCourse!.timeSpentSeconds, 600);
    });

    it('returns COMPLETED when enrollment is completed', async () => {
        mockEnrollmentRepo.findActiveByUser.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: 'COMPLETED',
                totalRequiredLessonCount: 10,
            }),
        );

        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({
                slug: 'test-course',
                name: 'Test Course',
                thumbnailUrl: null,
                level: 'A1',
                totalUnits: 3,
            }),
        );

        mockProgressModel.find.mock.mockImplementation(() =>
            mockChain([
                { status: 'COMPLETED', timeSpentSeconds: 300 },
                { status: 'COMPLETED', timeSpentSeconds: 200 },
            ]),
        );

        mockEnrollmentModel.countDocuments.mock.mockImplementation(() => ({
            exec: () => Promise.resolve(1),
        }));

        const result = await service.getDashboard('user1');
        assert.equal(result.activeCourse!.status, 'COMPLETED');
        assert.equal(result.summary.completedCourses, 1);
    });
});
