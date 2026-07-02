import { HttpStatus } from '../constants/http-status.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseEnrollment, EEnrollmentStatus } from '../models/mongo/course-enrollment.model.js';
import { CourseEnrollmentMongoRepository } from '../repositories/mongo/course-enrollment.mongo.repository.js';
import { LearnerLessonProgress, ELessonProgressStatus } from '../models/mongo/learner-lesson-progress.model.js';
import { LearnerLessonProgressMongoRepository } from '../repositories/mongo/learner-lesson-progress.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Lesson, ELessonType } from '../models/mongo/lesson.model.js';
import { Language } from '../models/mongo/language.model.js';
import { LearningGoal } from '../models/mongo/learning-goal.model.js';
import { sanitizeLessonContent, validateLessonContent } from './lesson-sanitizer.service.js';
import { gradeResponses, gradeSubjectivePass } from './lesson-grader.service.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { User } from '../models/mongo/user.model.js';
import { LearnerLessonAttempt } from '../models/mongo/learner-lesson-attempt.model.js';
import { LearnerLessonAttemptMongoRepository } from '../repositories/mongo/learner-lesson-attempt.mongo.repository.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class LearningService {
    constructor(
        private readonly enrollmentRepo: CourseEnrollmentMongoRepository,
        private readonly progressRepo: LearnerLessonProgressMongoRepository,
        private readonly attemptRepo: LearnerLessonAttemptMongoRepository,
    ) {}

    /**
     * Enroll in a Course.
     *
     * - Validates Course exists and is active.
     * - Validates prerequisite Course is completed.
     * - If already enrolled, reactivates the existing enrollment idempotently.
     * - Pauses any other ACTIVE enrollment atomically.
     * - Synchronizes User.lastActiveCourseId as a compatibility projection.
     *
     * Implements FR-01, FR-02, AC-01, AC-02, AC-03.
     */
    async enroll(
        userId: string,
        courseId: string,
    ): Promise<{
        enrollmentId: string;
        courseId: string;
        courseSlug: string;
        status: string;
        nextLessonId: string | null;
        created: boolean;
    }> {
        // 1. Validate Course exists and is active
        const course = await Course.findById(courseId)
            .select('_id slug isActive prerequisiteCourseId')
            .lean()
            .exec() as { _id: unknown; slug: string; isActive: boolean; prerequisiteCourseId: unknown } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng. Vui lòng chọn khóa học khác.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 2. Validate prerequisite Course is completed (FR-01, AC-03)
        if (course.prerequisiteCourseId) {
            const prereqId = String(course.prerequisiteCourseId);
            const prereqCompleted = await CourseEnrollment.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                courseId: new mongoose.Types.ObjectId(prereqId),
                status: EEnrollmentStatus.COMPLETED,
            }).lean().exec();

            if (!prereqCompleted) {
                // Fetch prerequisite course name for a helpful error message
                const prereqCourse = await Course.findById(prereqId)
                    .select('name')
                    .lean()
                    .exec() as { name: string } | null;

                throw new AppError(
                    `Bạn cần hoàn thành "${prereqCourse?.name ?? 'khóa học tiên quyết'}" trước khi ghi danh khóa học này.`,
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 3. Check for existing enrollment
        const existing = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (existing) {
            // Already enrolled — reactivate if not already ACTIVE
            if (existing.status === EEnrollmentStatus.ACTIVE) {
                // Idempotent: already active, return as-is
                return {
                    enrollmentId: String(existing._id),
                    courseId: String(existing.courseId),
                    courseSlug: course.slug,
                    status: existing.status,
                    nextLessonId: existing.lastLessonId ? String(existing.lastLessonId) : null,
                    created: false,
                };
            }

            if (existing.status === EEnrollmentStatus.COMPLETED) {
                throw new AppError(
                    'Khóa học đã được hoàn thành. Không thể ghi danh lại.',
                    HttpStatus.CONFLICT,
                );
            }

            // Reactivate: pause others, then set this one ACTIVE
            const updated = await this.enrollmentRepo.activateEnrollment(
                String(existing._id),
                userId,
            );

            if (!updated) {
                throw new AppError('Không thể kích hoạt ghi danh', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Sync User.lastActiveCourseId (compatibility projection)
            await User.findByIdAndUpdate(userId, {
                lastActiveCourseId: new mongoose.Types.ObjectId(courseId),
                lastActiveAt: new Date(),
            });

            logger.info('enrollment.reactivated', {
                userId,
                courseId,
                enrollmentId: String(updated._id),
            });

            return {
                enrollmentId: String(updated._id),
                courseId: String(updated.courseId),
                courseSlug: course.slug,
                status: updated.status,
                nextLessonId: updated.lastLessonId ? String(updated.lastLessonId) : null,
                created: false,
            };
        }

        // 4. New enrollment — pause existing active, create new one
        await this.enrollmentRepo.pauseAllActiveByUser(userId);

        // Count required lessons for the course
        const totalRequiredLessons = await this.countRequiredLessons(courseId);

        const { enrollment, created } = await this.enrollmentRepo.upsertEnrollment(
            userId,
            courseId,
            totalRequiredLessons,
        );

        // Sync User.lastActiveCourseId
        await User.findByIdAndUpdate(userId, {
            lastActiveCourseId: new mongoose.Types.ObjectId(courseId),
            lastActiveAt: new Date(),
        });

        logger.info('enrollment.created', {
            userId,
            courseId,
            enrollmentId: String(enrollment._id),
            totalRequiredLessons,
        });

        return {
            enrollmentId: String(enrollment._id),
            courseId: String(enrollment.courseId),
            courseSlug: course.slug,
            status: enrollment.status,
            nextLessonId: null, // New enrollment — no resumable lesson yet
            created,
        };
    }

    /**
     * Get learning dashboard for the authenticated user.
     *
     * Returns active Course with progress, summary statistics, and activity days.
     * Before Phase 6, summary and activityDays return honest zero values.
     *
     * Implements FR-03, AC-04, AC-05.
     */
    async getDashboard(
        userId: string,
        _period?: string,
        _month?: string,
    ): Promise<{
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
    }> {
        // 1. Find active enrollment
        const enrollment = await this.enrollmentRepo.findActiveByUser(userId);

        if (!enrollment) {
            // AC-04: No active enrollment — return null activeCourse with zero summary
            const activityDays = _period === 'month' && _month
                ? await this.getMonthlyActivity(userId, _month)
                : [];

            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays,
            };
        }

        // 2. Find course
        const course = await Course.findById(enrollment.courseId)
            .select('slug name thumbnailUrl level totalUnits')
            .lean()
            .exec() as { slug: string; name: string; thumbnailUrl: string | null; level: string; totalUnits: number } | null;

        if (!course) {
            // Course was deleted — enrollment is orphaned
            const activityDays = _period === 'month' && _month
                ? await this.getMonthlyActivity(userId, _month)
                : [];

            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays,
            };
        }

        // 3. Get progress summary from LearnerLessonProgress
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: enrollment._id,
        })
            .select('status timeSpentSeconds')
            .lean()
            .exec() as Array<{ status: string; timeSpentSeconds: number }>;

        const completedLessons = progressRecords.filter(
            (p) => p.status === ELessonProgressStatus.COMPLETED,
        ).length;

        const totalTimeSpent = progressRecords.reduce(
            (sum, p) => sum + (p.timeSpentSeconds || 0),
            0,
        );

        // 4. Total required lessons from enrollment (authoritative source)
        const totalLessons = enrollment.totalRequiredLessonCount;

        // 5. Progress percentage: (completed / total) * 100, rounded to nearest integer
        const progressPercent =
            totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

        // 6. Determine enrollment-based course status
        let courseStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        if (enrollment.status === EEnrollmentStatus.COMPLETED) {
            courseStatus = 'COMPLETED';
        } else if (completedLessons > 0) {
            courseStatus = 'IN_PROGRESS';
        } else {
            courseStatus = 'NOT_STARTED';
        }

        // 7. Find next recommended lesson
        const nextLessonId = await this.findNextLesson(
            String(enrollment.courseId),
            String(enrollment._id),
            userId,
        );

        // 8. Summary statistics (honest, before Phase 6 analytics)
        const completedCourses = await CourseEnrollment.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            status: EEnrollmentStatus.COMPLETED,
        }).exec();

        const activeCourses = await CourseEnrollment.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            status: EEnrollmentStatus.ACTIVE,
        }).exec();

        // 9. Compute activity days for the requested month (Phase 6: BE-11)
        const activityDays = _period === 'month' && _month
            ? await this.getMonthlyActivity(userId, _month)
            : [];

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
                nextLessonId,
                status: courseStatus,
            },
            summary: {
                timeSpentSeconds: totalTimeSpent,
                completedCourses,
                activeCourses,
            },
            activityDays,
        };
    }

    /**
     * Get monthly learning activity for the user.
     *
     * Aggregates active-learning days from LearnerLessonProgress.lastAccessedAt
     * within the given month using Asia/Ho_Chi_Minh timezone.
     *
     * Returns distinct activity dates with approximate minutes per day.
     * If no per-day time data is available, minutes reflect a proportional
     * distribution of total monthly time.
     *
     * Implements AC-18 (Monthly Activity).
     */
    private async getMonthlyActivity(
        userId: string,
        month: string, // "YYYY-MM" format
    ): Promise<Array<{ date: string; minutes: number }>> {
        // Parse month boundaries in Asia/Ho_Chi_Minh (UTC+7)
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr!, 10);
        const mon = parseInt(monthStr!, 10);

        // Start of month in ICT: YYYY-MM-01 00:00:00 ICT
        const startICT = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
        startICT.setHours(startICT.getHours() - 7); // Convert ICT → UTC (subtract 7h)

        // End of month in ICT: YYYY-(MM+1)-01 00:00:00 ICT
        const endICT = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0));
        endICT.setHours(endICT.getHours() - 7); // Convert ICT → UTC

        // Query all progress records with lastAccessedAt in the month
        const progressRecords = await LearnerLessonProgress.find({
            userId: new mongoose.Types.ObjectId(userId),
            lastAccessedAt: {
                $gte: startICT,
                $lt: endICT,
            },
        })
            .select('lastAccessedAt timeSpentSeconds')
            .lean()
            .exec() as Array<{ lastAccessedAt: Date; timeSpentSeconds: number }>;

        if (progressRecords.length === 0) {
            return [];
        }

        // Group by date in Asia/Ho_Chi_Minh timezone
        const dayMap = new Map<string, { count: number; timeSum: number }>();

        // Add 7 hours (ICT offset) and extract date string YYYY-MM-DD
        const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

        for (const record of progressRecords) {
            const localDate = new Date(
                record.lastAccessedAt.getTime() + ICT_OFFSET_MS,
            );
            const dateStr = localDate.toISOString().slice(0, 10); // "2026-07-15"

            const existing = dayMap.get(dateStr);
            if (existing) {
                existing.count += 1;
                // timeSpentSeconds is cumulative per lesson, so we can't just sum.
                // Instead, count this as an activity day.
            } else {
                dayMap.set(dateStr, { count: 1, timeSum: 0 });
            }
        }

        // Calculate total monthly time by computing time delta from enrollment time
        // Since timeSpentSeconds is cumulative, we use the enrollment-level total.
        const enrollments = await CourseEnrollment.find({
            userId: new mongoose.Types.ObjectId(userId),
        })
            .select('timeSpentSeconds')
            .lean()
            .exec() as Array<{ timeSpentSeconds: number }>;

        const totalMonthlySeconds = enrollments.reduce(
            (sum, e) => sum + (e.timeSpentSeconds || 0),
            0,
        );

        const activeDayCount = dayMap.size;
        const avgMinutesPerDay =
            activeDayCount > 0
                ? Math.round(totalMonthlySeconds / 60 / activeDayCount)
                : 0;

        // Build result sorted by date
        const sortedDates = Array.from(dayMap.keys()).sort();

        return sortedDates.map((dateStr) => ({
            date: dateStr,
            minutes: avgMinutesPerDay,
        }));
    }

    /**
     * Get the course roadmap for a learner.
     *
     * Returns ordered Units and Lessons with computed statuses.
     * Enforces enrollment, prerequisite, and active curriculum checks.
     *
     * Implements FR-04, FR-05, AC-06, AC-07, AC-08.
     */
    async getRoadmap(
        userId: string,
        slug: string,
    ): Promise<{
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
            status: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
            progressPercent: number;
            lessons: Array<{
                id: string;
                title: string;
                type: string;
                orderIndex: number;
                status: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
                bestScore: number | null;
                lockReason: string | null;
            }>;
        }>;
    }> {
        // 1. Find course by slug
        const course = await Course.findOne({ slug })
            .select('_id name slug description thumbnailUrl level languageId learningGoalId isActive prerequisiteCourseId')
            .lean()
            .exec() as {
                _id: unknown;
                name: string;
                slug: string;
                description: string | null;
                thumbnailUrl: string | null;
                level: string;
                languageId: unknown;
                learningGoalId: unknown;
                isActive: boolean;
                prerequisiteCourseId: unknown;
            } | null;

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

        // 3. For non-COMPLETED enrollments, verify prerequisite is met (AC-08)
        if (
            enrollment.status !== EEnrollmentStatus.COMPLETED &&
            course.prerequisiteCourseId
        ) {
            const prereqId = String(course.prerequisiteCourseId);
            const prereqCompleted = await CourseEnrollment.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                courseId: new mongoose.Types.ObjectId(prereqId),
                status: EEnrollmentStatus.COMPLETED,
            }).lean().exec();

            if (!prereqCompleted) {
                throw new AppError(
                    'Bạn cần hoàn thành khóa học tiên quyết trước khi truy cập khóa học này.',
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 4. Fetch language and learning goal
        const [language, learningGoal] = await Promise.all([
            Language.findById(course.languageId)
                .select('_id code name')
                .lean()
                .exec() as Promise<{ _id: unknown; code: string; name: string } | null>,
            LearningGoal.findById(course.learningGoalId)
                .select('_id slug title')
                .lean()
                .exec() as Promise<{ _id: unknown; slug: string; title: string } | null>,
        ]);

        // 5. Fetch units and lessons
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(String(course._id)) })
            .select('_id title description orderIndex')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{
                _id: unknown;
                title: string;
                description: string | null;
                orderIndex: number;
            }>;

        // Get all lesson IDs for these units as ObjectId[]
        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        const lessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id unitId title type orderIndex practiceConfig')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                practiceConfig: { passingScore: number };
            }>;

        // 6. Fetch progress records for this enrollment
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: enrollment._id,
        })
            .select('lessonId status bestScore')
            .lean()
            .exec() as Array<{
                lessonId: unknown;
                status: string;
                bestScore: number;
            }>;

        // Build progress map: lessonId → progress
        const progressMap = new Map<
            string,
            { status: string; bestScore: number }
        >();
        for (const p of progressRecords) {
            progressMap.set(String(p.lessonId), {
                status: p.status,
                bestScore: p.bestScore,
            });
        }

        // 7. Check if course/curriculum is inactive for lock reasons
        const isCourseActive = !!course.isActive;
        const courseActiveForEnrollment =
            enrollment.status === EEnrollmentStatus.ACTIVE;

        // 8. Build unit and lesson response
        const enrollmentStatus = enrollment.status as 'ACTIVE' | 'PAUSED' | 'COMPLETED';

        // Build a set of unitIds for fast lookup
        const unitIdsSet = new Set(unitIds.map(String));
        const lessonsByUnit = new Map<string, typeof lessons>();
        for (const lesson of lessons) {
            const unitKey = String(lesson.unitId);
            if (!lessonsByUnit.has(unitKey)) {
                lessonsByUnit.set(unitKey, []);
            }
            lessonsByUnit.get(unitKey)!.push(lesson);
        }

        const unitsResponse = units.map((unit) => {
            const unitLessons = lessonsByUnit.get(String(unit._id)) || [];

            const lessonResponses = unitLessons.map((lesson) => {
                const progress = progressMap.get(String(lesson._id));

                let lessonStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
                let lockReason: string | null = null;

                if (progress) {
                    if (progress.status === ELessonProgressStatus.COMPLETED) {
                        lessonStatus = 'COMPLETED';
                    } else if (progress.status === ELessonProgressStatus.IN_PROGRESS) {
                        lessonStatus = 'IN_PROGRESS';
                    } else {
                        // NOT_STARTED with progress record — treat as AVAILABLE
                        lessonStatus = 'AVAILABLE';
                    }
                } else if (!isCourseActive || !courseActiveForEnrollment) {
                    lessonStatus = 'UNAVAILABLE';
                    lockReason = 'Khóa học hiện không khả dụng';
                } else {
                    // No progress record and course is active — AVAILABLE (free navigation per AC-07)
                    lessonStatus = 'AVAILABLE';
                }

                return {
                    id: String(lesson._id),
                    title: lesson.title,
                    type: lesson.type,
                    orderIndex: lesson.orderIndex,
                    status: lessonStatus,
                    bestScore:
                        progress && progress.bestScore >= 0
                            ? progress.bestScore
                            : null,
                    lockReason,
                };
            });

            // Compute unit status from its lessons
            let unitStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
            const lessonStatuses = lessonResponses.map((l) => l.status);

            if (lessonStatuses.length === 0) {
                unitStatus = isCourseActive && courseActiveForEnrollment ? 'AVAILABLE' : 'UNAVAILABLE';
            } else if (lessonStatuses.every((s) => s === 'COMPLETED')) {
                unitStatus = 'COMPLETED';
            } else if (lessonStatuses.some((s) => s === 'IN_PROGRESS')) {
                unitStatus = 'IN_PROGRESS';
            } else if (!isCourseActive || !courseActiveForEnrollment) {
                unitStatus = 'UNAVAILABLE';
            } else {
                unitStatus = 'AVAILABLE';
            }

            // Unit progress: completed / total
            const unitTotalLessons = lessonResponses.length;
            const unitCompletedLessons = lessonResponses.filter(
                (l) => l.status === 'COMPLETED',
            ).length;
            const unitProgressPercent =
                unitTotalLessons > 0
                    ? Math.round((unitCompletedLessons / unitTotalLessons) * 100)
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

        // 9. Overall progress
        const allLessons = unitsResponse.flatMap((u) => u.lessons);
        const completedCount = allLessons.filter(
            (l) => l.status === 'COMPLETED',
        ).length;
        const totalCount = allLessons.length;
        const progressPercent =
            totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0;

        // 10. Next recommended lesson
        const nextLessonId = await this.findNextLesson(
            String(course._id),
            String(enrollment._id),
            userId,
        );

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
                status: enrollmentStatus,
            },
            progressPercent,
            nextLessonId,
            units: unitsResponse,
        };
    }

    /**
     * List enrollments for the authenticated user.
     */
    async listEnrollments(
        userId: string,
        status?: string,
    ): Promise<
        Array<{
            enrollmentId: string;
            courseId: string;
            status: string;
            completedLessonCount: number;
            totalRequiredLessonCount: number;
            timeSpentSeconds: number;
            startedAt: Date;
            completedAt: Date | null;
        }>
    > {
        const enrollments = await this.enrollmentRepo.findByUser(userId, {
            userId,
            status: status ?? undefined,
        });

        return enrollments.map((e) => ({
            enrollmentId: String(e._id),
            courseId: String(e.courseId),
            status: e.status,
            completedLessonCount: e.completedLessonCount,
            totalRequiredLessonCount: e.totalRequiredLessonCount,
            timeSpentSeconds: e.timeSpentSeconds,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
        }));
    }

    /**
     * Count required (published, active) lessons for a course.
     */
    private async countRequiredLessons(courseId: string): Promise<number> {
        const result = await mongoose.model('Unit')
            .aggregate([
                { $match: { courseId: new mongoose.Types.ObjectId(courseId), isActive: { $ne: false } } },
                {
                    $lookup: {
                        from: 'lessons',
                        localField: '_id',
                        foreignField: 'unitId',
                        as: 'lessons',
                        pipeline: [
                            { $match: { isActive: { $ne: false } } },
                            { $count: 'count' },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $arrayElemAt: ['$lessons.count', 0] } },
                    },
                },
            ])
            .exec();

        return result[0]?.total ?? 0;
    }

    /**
     * Save a checkpoint for a lesson.
     *
     * Uses optimistic concurrency via checkpointVersion.
     * Returns 409 with latest state for stale versions.
     * Bounds activeSecondsDelta to max 300 seconds (validated at route level).
     * Updates enrollment lastLessonId and accumulates time safely.
     *
     * Implements FR-10, AC-11, AC-12, NFR-02, NFR-03.
     */
    async saveCheckpoint(
        userId: string,
        lessonId: string,
        version: number,
        checkpoint: unknown,
        activeSecondsDelta: number,
    ): Promise<{
        progressId: string;
        checkpointVersion: number;
        timeSpentSeconds: number;
        status: string;
    }> {
        // 1. Find progress record
        const progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            throw new AppError(
                'Bạn cần bắt đầu bài học trước khi lưu tiến trình.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 2. Version check — 409 if stale
        if (progress.checkpointVersion !== version) {
            logger.warn('checkpoint.conflict', {
                userId,
                lessonId,
                expectedVersion: version,
                actualVersion: progress.checkpointVersion,
            });
            throw new AppError(
                'Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.',
                HttpStatus.CONFLICT,
            );
        }

        // 3. Validate checkpoint payload size (max 100KB)
        const checkpointStr = JSON.stringify(checkpoint ?? {});
        const MAX_CHECKPOINT_SIZE = 100 * 1024; // 100KB
        if (checkpointStr.length > MAX_CHECKPOINT_SIZE) {
            throw new AppError(
                'Dữ liệu tiến trình vượt quá kích thước cho phép (100KB).',
                HttpStatus.BAD_REQUEST,
            );
        }

        // 4. Bounded time delta (validated at route level, but double-check)
        const boundedDelta = Math.min(activeSecondsDelta, 300);

        // 5. Update checkpoint with optimistic concurrency
        const updated = await this.progressRepo.updateCheckpoint(
            String(progress._id),
            userId,
            version,
            checkpoint,
            boundedDelta,
        );

        if (!updated) {
            logger.warn('checkpoint.save_conflict', {
                userId,
                lessonId,
                version,
                progressId: String(progress._id),
            });
            throw new AppError(
                'Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.',
                HttpStatus.CONFLICT,
            );
        }

        // 6. Update enrollment lastLessonId
        await CourseEnrollment.findByIdAndUpdate(progress.enrollmentId, {
            lastLessonId: new mongoose.Types.ObjectId(lessonId),
        }).exec();

        logger.info('checkpoint.saved', {
            userId,
            lessonId,
            progressId: String(updated._id),
            version: updated.checkpointVersion,
            timeDelta: boundedDelta,
        });

        return {
            progressId: String(updated._id),
            checkpointVersion: updated.checkpointVersion,
            timeSpentSeconds: updated.timeSpentSeconds,
            status: updated.status,
        };
    }

    /**
     * Start a lesson for the learner.
     *
     * Creates or returns existing LearnerLessonProgress.
     * Validates enrollment and Lesson -> Unit -> Course ancestry.
     *
     * Implements FR-06, AC-10.
     */
    async startLesson(
        userId: string,
        lessonId: string,
    ): Promise<{
        progressId: string;
        lessonId: string;
        status: string;
        checkpointVersion: number;
        startedAt: Date;
        navigation: {
            previousLessonId: string | null;
            nextLessonId: string | null;
        };
    }> {
        // 1. Find lesson and validate ancestry
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId type')
            .lean()
            .exec() as { _id: unknown; unitId: unknown; type: string } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Find unit to get courseId
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as { _id: unknown; courseId: unknown } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // 3. Validate enrollment (which validates course is active and enrolled)
        const courseId = String(unit.courseId);
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        if (enrollment.status !== EEnrollmentStatus.ACTIVE) {
            throw new AppError(
                'Khóa học không ở trạng thái hoạt động.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const course = await Course.findById(courseId)
            .select('isActive')
            .lean()
            .exec() as { isActive: boolean } | null;

        if (!course || !course.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Create or find existing progress
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        const isNewLesson = !progress;

        if (progress) {
            // Update lastAccessedAt
            await LearnerLessonProgress.findByIdAndUpdate(progress._id, {
                lastAccessedAt: new Date(),
            }).exec();

            // Return existing progress (idempotent for repeated calls)
            const nav = await this.getNavigation(
                String(courseId),
                String(enrollment._id),
                userId,
                lessonId,
            );

            return {
                progressId: String(progress._id),
                lessonId: String(lesson._id),
                status: progress.status,
                checkpointVersion: progress.checkpointVersion,
                startedAt: progress.firstStartedAt ?? progress.createdAt,
                navigation: nav,
            };
        }

        // Create new progress record
        const now = new Date();
        progress = await LearnerLessonProgress.create({
            userId: new mongoose.Types.ObjectId(userId),
            enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
            courseId: new mongoose.Types.ObjectId(courseId),
            unitId: new mongoose.Types.ObjectId(String(unit._id)),
            lessonId: new mongoose.Types.ObjectId(lessonId),
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpointVersion: 0,
            checkpoint: null,
            timeSpentSeconds: 0,
            firstStartedAt: now,
            lastAccessedAt: now,
        } as any);

        // Update enrollment lastLessonId
        await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
            lastLessonId: new mongoose.Types.ObjectId(lessonId),
        }).exec();

        logger.info('lesson.started', {
            userId,
            lessonId,
            enrollmentId: String(enrollment._id),
            courseId,
            lessonType: lesson.type,
            isNew: isNewLesson,
        });

        const nav = await this.getNavigation(
            courseId,
            String(enrollment._id),
            userId,
            lessonId,
        );

        return {
            progressId: String(progress._id),
            lessonId: String(lesson._id),
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpointVersion: 0,
            startedAt: now,
            navigation: nav,
        };
    }

    /**
     * Read a lesson for the learner with sanitized content.
     *
     * Validates enrollment and Lesson -> Unit -> Course ancestry.
     * Returns sanitized content, progress, and navigation context.
     *
     * Implements FR-05, FR-06, AC-09, AC-10, AC-19.
     */
    async getLearnerLesson(
        userId: string,
        lessonId: string,
    ): Promise<{
        course: { id: string; slug: string; name: string };
        unit: { id: string; title: string; orderIndex: number };
        lesson: {
            id: string;
            title: string;
            type: string;
            orderIndex: number;
            content: Record<string, unknown>;
            passingScore: number | null;
        };
        progress: {
            status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
            checkpoint: unknown;
            checkpointVersion: number;
            bestScore: number | null;
        };
        navigation: {
            previousLessonId: string | null;
            nextLessonId: string | null;
        };
    }> {
        // 1. Find lesson with full details
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId title type orderIndex content practiceConfig')
            .lean()
            .exec() as {
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                content: unknown;
                practiceConfig: { passingScore: number };
            } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Unit -> Course ancestry
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId title orderIndex')
            .lean()
            .exec() as { _id: unknown; courseId: unknown; title: string; orderIndex: number } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);

        // 3. Validate enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const course = await Course.findById(courseId)
            .select('_id slug name isActive')
            .lean()
            .exec() as { _id: unknown; slug: string; name: string; isActive: boolean } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive && enrollment.status !== EEnrollmentStatus.COMPLETED) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Validate and sanitize content
        const malformedMessage = validateLessonContent(
            lesson.type as any,
            lesson.content,
        );

        if (malformedMessage) {
            logger.warn('Malformed lesson content', {
                lessonId,
                type: lesson.type,
                message: malformedMessage,
            });
            throw new AppError(malformedMessage, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const safeContent = sanitizeLessonContent(
            lesson.type as any,
            lesson.content,
        );

        // 6. Find or create progress record
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            // Create a NOT_STARTED progress record so the GET doesn't require start first
            progress = await LearnerLessonProgress.create({
                userId: new mongoose.Types.ObjectId(userId),
                enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
                courseId: new mongoose.Types.ObjectId(courseId),
                unitId: new mongoose.Types.ObjectId(String(unit._id)),
                lessonId: new mongoose.Types.ObjectId(lessonId),
                status: ELessonProgressStatus.NOT_STARTED,
                checkpointVersion: 0,
                checkpoint: null,
                timeSpentSeconds: 0,
                lastAccessedAt: new Date(),
            } as any);
        }

        // 7. Build progress DTO
        const progressStatus = progress.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        const bestScore = progress.bestScore >= 0 ? progress.bestScore : null;

        // 8. Navigation context
        const nav = await this.getNavigation(
            courseId,
            String(enrollment._id),
            userId,
            lessonId,
        );

        return {
            course: {
                id: String(course._id),
                slug: course.slug,
                name: course.name,
            },
            unit: {
                id: String(unit._id),
                title: unit.title,
                orderIndex: unit.orderIndex,
            },
            lesson: {
                id: String(lesson._id),
                title: lesson.title,
                type: lesson.type,
                orderIndex: lesson.orderIndex,
                content: safeContent,
                passingScore: lesson.practiceConfig?.passingScore ?? null,
            },
            progress: {
                status: progressStatus,
                checkpoint: progress.checkpoint ?? null,
                checkpointVersion: progress.checkpointVersion,
                bestScore,
            },
            navigation: nav,
        };
    }

    /**
     * Submit a lesson for grading.
     *
     * - Validates enrollment and ancestry.
     * - Checks for duplicate clientAttemptId (idempotency).
     * - Grades objective question types server-side.
     * - Speaking/Writing auto-pass with placeholder feedback.
     * - Persists immutable attempt record.
     * - Updates progress and enrollment.
     * - Supports unlimited retries with latest/best score tracking.
     *
     * Implements FR-08, FR-10, FR-13, AC-13, AC-14, AC-21.
     */
    async submitLesson(
        userId: string,
        lessonId: string,
        clientAttemptId: string,
        responses: unknown,
        durationSeconds: number,
    ): Promise<{
        attemptId: string;
        score: number | null;
        passed: boolean;
        feedback: unknown;
        progress: {
            lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
            unitStatus: string;
            courseStatus: string;
            courseProgressPercent: number;
        };
        nextLessonId: string | null;
    }> {
        // 1. Find lesson with practice config
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId title type orderIndex practiceConfig')
            .lean()
            .exec() as {
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                practiceConfig: {
                    mode: string;
                    questionIds: mongoose.Types.ObjectId[];
                    passingScore: number;
                };
            } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Unit -> Course ancestry
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as { _id: unknown; courseId: unknown } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);

        // 3. Validate enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        if (enrollment.status !== EEnrollmentStatus.ACTIVE) {
            throw new AppError(
                'Không thể nộp bài cho khóa học không hoạt động.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const courseDoc = await Course.findById(courseId)
            .select('isActive')
            .lean()
            .exec() as { isActive: boolean } | null;

        if (!courseDoc || !courseDoc.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Check for duplicate clientAttemptId (idempotency)
        const existingAttempt = await this.attemptRepo.findByClientAttemptId(
            userId,
            clientAttemptId,
        );

        if (existingAttempt) {
            // Return existing result — idempotent
            const lessonProgress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
            const unitStatus = await this.computeUnitStatus(
                String(unit._id),
                String(enrollment._id),
            );
            const courseStatus = enrollment.status as string;

            return {
                attemptId: String(existingAttempt._id),
                score: existingAttempt.score,
                passed: existingAttempt.passed,
                feedback: existingAttempt.feedback,
                progress: {
                    lessonStatus: lessonProgress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                    unitStatus,
                    courseStatus,
                    courseProgressPercent: enrollment.totalRequiredLessonCount > 0
                        ? Math.round((enrollment.completedLessonCount / enrollment.totalRequiredLessonCount) * 100)
                        : 0,
                },
                nextLessonId: await this.findNextLesson(courseId, String(enrollment._id), userId),
            };
        }

        // 6. Find or create progress record
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            progress = await LearnerLessonProgress.create({
                userId: new mongoose.Types.ObjectId(userId),
                enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
                courseId: new mongoose.Types.ObjectId(courseId),
                unitId: new mongoose.Types.ObjectId(String(unit._id)),
                lessonId: new mongoose.Types.ObjectId(lessonId),
                status: ELessonProgressStatus.IN_PROGRESS as any,
                checkpointVersion: 0,
                checkpoint: null,
                timeSpentSeconds: 0,
                firstStartedAt: new Date(),
                lastAccessedAt: new Date(),
            } as any);
        }

        // 7. Grade the submission
        const isSubjective = lesson.type === 'SPEAKING' || lesson.type === 'WRITING';
        const passingScore = lesson.practiceConfig?.passingScore ?? 80;
        const questionIds = lesson.practiceConfig?.questionIds?.map((id) => String(id)) ?? [];

        let gradingResult: { score: number; maxScore: number; passed: boolean; feedback: unknown };

        if (isSubjective) {
            // Speaking/Writing: auto-pass with placeholder feedback (AC-21)
            gradingResult = gradeSubjectivePass();
        } else if (questionIds.length > 0) {
            // Objective grading (FR-08)
            gradingResult = await gradeResponses(
                questionIds,
                (responses ?? {}) as Record<string, unknown>,
                passingScore,
            );
        } else {
            // No questions — non-assessed lesson, auto-complete
            gradingResult = {
                score: 100,
                maxScore: 100,
                passed: true,
                feedback: { message: 'Lesson completed successfully.' },
            };
        }

        // 8. Create immutable attempt record
        const attempt = await this.attemptRepo.createAttempt({
            clientAttemptId,
            userId,
            enrollmentId: String(enrollment._id),
            lessonId,
            submittedAnswers: responses,
            score: gradingResult.score,
            passed: gradingResult.passed,
            feedback: gradingResult.feedback,
            durationSeconds: Math.min(durationSeconds, 86400), // Cap at 24 hours
        });

        // 9. Capture pre-completion status for duplicate prevention
        const wasAlreadyCompleted = progress.status === ELessonProgressStatus.COMPLETED;

        // 10. Update progress
        if (gradingResult.passed) {
            await this.progressRepo.completeLesson(
                String(progress._id),
                userId,
                gradingResult.score,
                true,
            );
        } else {
            // Update latest score and increment attempts without completing
            await LearnerLessonProgress.findByIdAndUpdate(progress._id, {
                latestScore: gradingResult.score,
                $inc: { attemptsCount: 1 },
                lastAccessedAt: new Date(),
            }).exec();
        }

        // 11. If passed and was NOT already completed, update enrollment counters
        if (gradingResult.passed && !wasAlreadyCompleted) {
            await this.updateEnrollmentProgress(
                String(enrollment._id),
                courseId,
                lessonId,
                String(unit._id),
            );
        }

        // 12. Structured events
        if (gradingResult.passed) {
            logger.info('submission.passed', {
                userId,
                lessonId,
                attemptId: String(attempt._id),
                enrollmentId: String(enrollment._id),
                score: gradingResult.score,
                wasRetry: wasAlreadyCompleted,
                lessonType: lesson.type,
            });
        } else {
            logger.info('submission.failed', {
                userId,
                lessonId,
                attemptId: String(attempt._id),
                enrollmentId: String(enrollment._id),
                score: gradingResult.score,
                lessonType: lesson.type,
            });
        }

        // 13. Build result
        const lessonProgressAfter = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        const unitStatus = await this.computeUnitStatus(
            String(unit._id),
            String(enrollment._id),
        );
        const updatedEnrollment = await this.enrollmentRepo.findByIdSecure(
            String(enrollment._id),
            userId,
        );
        const courseStatus = updatedEnrollment?.status ?? enrollment.status;
        const completedLessonCount = updatedEnrollment?.completedLessonCount ?? enrollment.completedLessonCount;
        const totalRequired = updatedEnrollment?.totalRequiredLessonCount ?? enrollment.totalRequiredLessonCount;

        return {
            attemptId: String(attempt._id),
            score: gradingResult.score,
            passed: gradingResult.passed,
            feedback: gradingResult.feedback,
            progress: {
                lessonStatus: lessonProgressAfter?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                unitStatus,
                courseStatus,
                courseProgressPercent: totalRequired > 0
                    ? Math.round((completedLessonCount / totalRequired) * 100)
                    : 0,
            },
            nextLessonId: await this.findNextLesson(courseId, String(enrollment._id), userId),
        };
    }

    /**
     * Update enrollment progress after a lesson is passed/completed.
     *
     * - Atomically increments completedLessonCount.
     * - Updates lastLessonId.
     * - Triggers course completion if all required lessons are done.
     *
     * IMPORTANT: Caller must ensure this method is not called for already-completed
     * lessons to prevent counter drift (AC-17, NFR-02).
     *
     * Implements FR-09, FR-10, AC-16, AC-17.
     */
    private async updateEnrollmentProgress(
        enrollmentId: string,
        courseId: string,
        lessonId: string,
        _unitId: string,
    ): Promise<void> {
        // Atomically increment completed count (race-safe: $inc is atomic per document)
        const updated = await CourseEnrollment.findByIdAndUpdate(
            enrollmentId,
            {
                $inc: { completedLessonCount: 1 },
                $set: { lastLessonId: new mongoose.Types.ObjectId(lessonId) },
            },
            { new: true },
        ).lean().exec() as { completedLessonCount: number; totalRequiredLessonCount: number } | null;

        if (!updated) return;

        // Check if course is now complete
        if (
            updated.completedLessonCount >= updated.totalRequiredLessonCount &&
            updated.totalRequiredLessonCount > 0
        ) {
            await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
                status: EEnrollmentStatus.COMPLETED,
                completedAt: new Date(),
            }).exec();

            logger.info('Course completed', {
                enrollmentId,
                courseId,
                completedLessonCount: updated.completedLessonCount,
            });
        }
    }

    /**
     * Recalculate totalRequiredLessonCount for a specific enrollment.
     *
     * Should be called after curriculum changes (admin adds/removes lessons).
     * Returns the updated enrollment or null if not found.
     */
    async recalculateRequiredLessons(
        enrollmentId: string,
        userId: string,
    ): Promise<{ enrollmentId: string; totalRequiredLessonCount: number } | null> {
        // Verify enrollment ownership
        const enrollment = await this.enrollmentRepo.findByIdSecure(enrollmentId, userId);
        if (!enrollment) return null;

        const courseId = String(enrollment.courseId);
        const totalRequired = await this.countRequiredLessons(courseId);

        await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
            totalRequiredLessonCount: totalRequired,
        }).exec();

        logger.info('Recalculated required lessons', {
            enrollmentId,
            courseId,
            previous: enrollment.totalRequiredLessonCount,
            new: totalRequired,
        });

        return {
            enrollmentId,
            totalRequiredLessonCount: totalRequired,
        };
    }

    /**
     * Recalculate completedLessonCount from COMPLETED LearnerLessonProgress records.
     *
     * Useful for correcting counter drift or after enrollment migration.
     * Returns the updated count.
     */
    async recalculateCompletedLessonCount(
        enrollmentId: string,
        userId: string,
    ): Promise<{ enrollmentId: string; completedLessonCount: number } | null> {
        // Verify enrollment ownership
        const enrollment = await this.enrollmentRepo.findByIdSecure(enrollmentId, userId);
        if (!enrollment) return null;

        // Count COMPLETED progress records for this enrollment
        const completedRecords = await LearnerLessonProgress.countDocuments({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
            status: ELessonProgressStatus.COMPLETED,
        }).exec();

        await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
            completedLessonCount: completedRecords,
        }).exec();

        // Check if course is now complete after repair
        if (
            completedRecords >= enrollment.totalRequiredLessonCount &&
            enrollment.totalRequiredLessonCount > 0
        ) {
            await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
                status: EEnrollmentStatus.COMPLETED,
                completedAt: new Date(),
            }).exec();
        }

        logger.info('Recalculated completed lesson count', {
            enrollmentId,
            previous: enrollment.completedLessonCount,
            new: completedRecords,
        });

        return {
            enrollmentId,
            completedLessonCount: completedRecords,
        };
    }

    /**
     * Compute the status of a unit based on its lessons' progress.
     */
    private async computeUnitStatus(
        unitId: string,
        enrollmentId: string,
    ): Promise<'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'> {
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
        })
            .select('lessonId status')
            .lean()
            .exec() as Array<{ lessonId: unknown; status: string }>;

        // Get all lessons in this unit
        const lessons = await Lesson.find({ unitId: new mongoose.Types.ObjectId(unitId) })
            .select('_id')
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (lessons.length === 0) return 'AVAILABLE';

        const lessonIds = new Set(lessons.map((l) => String(l._id)));
        const unitProgress = progressRecords.filter((p) =>
            lessonIds.has(String(p.lessonId)),
        );

        if (unitProgress.length === 0) return 'AVAILABLE';
        if (unitProgress.every((p) => p.status === 'COMPLETED')) return 'COMPLETED';
        if (unitProgress.some((p) => p.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
        return 'AVAILABLE';
    }

    /**
     * Find the next recommended lesson for the user within a course.
     *
     * Returns the first non-completed lesson ordered by (unit.orderIndex, lesson.orderIndex),
     * or null if all lessons are completed.
     */
    private async findNextLesson(
        courseId: string,
        enrollmentId: string,
        userId: string,
    ): Promise<string | null> {
        // Get all unit IDs for this course
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(courseId) })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (units.length === 0) return null;

        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        // Get all lessons ordered by (unitIndex, lessonIndex)
        const lessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id unitId')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown; unitId: unknown }>;

        if (lessons.length === 0) return null;

        // Get completed lesson IDs
        const completedProgress = await LearnerLessonProgress.find({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
            status: ELessonProgressStatus.COMPLETED,
        })
            .select('lessonId')
            .lean()
            .exec() as Array<{ lessonId: unknown }>;

        const completedIds = new Set(
            completedProgress.map((p) => String(p.lessonId)),
        );

        // Find first non-completed lesson
        for (const lesson of lessons) {
            if (!completedIds.has(String(lesson._id))) {
                return String(lesson._id);
            }
        }

        return null; // All lessons completed
    }

    /**
     * Get previous and next lesson IDs for navigation context.
     */
    private async getNavigation(
        courseId: string,
        enrollmentId: string,
        userId: string,
        currentLessonId: string,
    ): Promise<{ previousLessonId: string | null; nextLessonId: string | null }> {
        // Get all unit IDs for this course
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(courseId) })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (units.length === 0) {
            return { previousLessonId: null, nextLessonId: null };
        }

        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        // Get all lessons ordered by (unitIndex, lessonIndex)
        const allLessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        const lessonIds = allLessons.map((l) => String(l._id));
        const currentIndex = lessonIds.indexOf(currentLessonId);

        if (currentIndex === -1) {
            return { previousLessonId: null, nextLessonId: null };
        }

        return {
            previousLessonId: currentIndex > 0 ? lessonIds[currentIndex - 1] ?? null : null,
            nextLessonId: currentIndex < lessonIds.length - 1 ? lessonIds[currentIndex + 1] ?? null : null,
        };
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const learningService = new LearningService(
    new CourseEnrollmentMongoRepository(),
    new LearnerLessonProgressMongoRepository(),
    new LearnerLessonAttemptMongoRepository(),
);
