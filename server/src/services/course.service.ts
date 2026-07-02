import { HttpStatus } from '../constants/http-status.js';
import type { ICourse } from '../models/mongo/course.model.js';
import { CourseMongoRepository } from '../repositories/mongo/course.mongo.repository.js';
import { LanguageMongoRepository } from '../repositories/mongo/language.mongo.repository.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import type {
    CreateCourseBody,
    GetCoursesListQuery,
    UpdateCourseBody,
} from '../validations/course.validation.js';

// ─── Prerequisite cycle detection ─────────────────────────────────────────────

async function wouldCreatePrerequisiteCycle(
    courseRepo: CourseMongoRepository,
    courseId: string,
    prerequisiteId: string,
): Promise<boolean> {
    const visited = new Set<string>();
    let currentId: string | undefined = prerequisiteId;

    // Walk the prerequisite chain up to a reasonable depth
    const MAX_DEPTH = 20;
    for (let i = 0; i < MAX_DEPTH && currentId; i++) {
        if (currentId === courseId) return true;
        if (visited.has(currentId)) return true; // existing cycle (shouldn't happen, but safe)
        visited.add(currentId);

        const course = await courseRepo.findByIdFull(currentId);
        if (!course || !course.prerequisiteCourseId) break;

        currentId = String(course.prerequisiteCourseId);
    }

    return false;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CourseService {
    constructor(
        private readonly courseRepo: CourseMongoRepository,
        private readonly languageRepo: LanguageMongoRepository,
        private readonly learningGoalRepo: LearningGoalMongoRepository,
    ) { }

    // ─── Read list (paginated) ───────────────────────────────────────────────

    async getCoursesList(query: GetCoursesListQuery): Promise<{
        courses: ICourse[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        return this.courseRepo.findAllWithPagination(
            {
                languageId: query.languageId,
                learningGoalId: query.learningGoalId,
                level: query.level,
                isActive: query.isActive,
                search: query.search,
            },
            {
                page: query.page,
                limit: query.limit,
                sort: query.sort,
                order: query.order,
            },
        );
    }

    // ─── Read single ─────────────────────────────────────────────────────────

    async getCourseById(courseId: string): Promise<ICourse> {
        const course = await this.courseRepo.findByIdFull(courseId);
        if (!course) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        return course;
    }

    /**
     * Returns the full course tree (course → units → lessons) in a single aggregate.
     * Used by the Studio 3-panel UI to avoid N+1 waterfall queries.
     */
    async getCourseTree(courseId: string): Promise<ICourse> {
        const tree = await this.courseRepo.getCourseTree(courseId);
        if (!tree) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        return tree;
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    async createCourse(body: CreateCourseBody): Promise<ICourse> {
        // 1. Validate Language exists
        const language = await this.languageRepo.findById(body.languageId);
        if (!language) {
            throw new AppError('Ngôn ngữ không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Learning Goal exists
        const goal = await this.learningGoalRepo.findById(body.learningGoalId);
        if (!goal) {
            throw new AppError('Mục tiêu học tập không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 3. Check slug uniqueness → 409
        const slugDuplicate = await this.courseRepo.slugExists(body.slug);
        if (slugDuplicate) {
            throw new AppError(
                `Slug "${body.slug}" đã tồn tại. Vui lòng chọn slug khác.`,
                HttpStatus.CONFLICT,
            );
        }

        // 4. Check compound-index uniqueness → 409
        const compoundDuplicate = await this.courseRepo.compoundKeyExists(
            body.languageId,
            body.learningGoalId,
            body.level,
            body.orderIndex,
        );
        if (compoundDuplicate) {
            throw new AppError(
                `Đã có khóa học khác ở cùng ngôn ngữ, mục tiêu, level ${body.level} và vị trí ${body.orderIndex}.`,
                HttpStatus.CONFLICT,
            );
        }

        // 5. Validate prerequisite Course exists
        if (body.prerequisiteCourseId) {
            const prereq = await this.courseRepo.findByIdFull(body.prerequisiteCourseId);
            if (!prereq) {
                throw new AppError(
                    'Khóa học tiên quyết không tồn tại',
                    HttpStatus.NOT_FOUND,
                );
            }
        }

        const created = await this.courseRepo.createCourse(body as Record<string, unknown>);

        logger.info('Course created', {
            courseId: String(created._id),
            languageId: body.languageId,
            learningGoalId: body.learningGoalId,
            slug: body.slug,
        });
        return created;
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    async updateCourse(courseId: string, body: UpdateCourseBody): Promise<ICourse> {
        const existing = await this.courseRepo.findByIdFull(courseId);
        if (!existing) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        // If languageId or learningGoalId changes, validate existence
        if (body.languageId) {
            const language = await this.languageRepo.findById(body.languageId);
            if (!language) {
                throw new AppError('Ngôn ngữ không tồn tại', HttpStatus.NOT_FOUND);
            }
        }

        if (body.learningGoalId) {
            const goal = await this.learningGoalRepo.findById(body.learningGoalId);
            if (!goal) {
                throw new AppError('Mục tiêu học tập không tồn tại', HttpStatus.NOT_FOUND);
            }
        }

        // Slug uniqueness check → 409 (exclude self)
        if (body.slug && body.slug !== existing.slug) {
            const slugDuplicate = await this.courseRepo.slugExists(body.slug, courseId);
            if (slugDuplicate) {
                throw new AppError(
                    `Slug "${body.slug}" đã tồn tại. Vui lòng chọn slug khác.`,
                    HttpStatus.CONFLICT,
                );
            }
        }

        // Compound-index uniqueness check → 409
        const resolvedLangId = body.languageId ?? String(existing.languageId);
        const resolvedGoalId = body.learningGoalId ?? String(existing.learningGoalId);
        const resolvedLevel = body.level ?? existing.level;
        const resolvedOrder = body.orderIndex ?? existing.orderIndex;

        if (
            body.languageId ||
            body.learningGoalId ||
            body.level !== undefined ||
            body.orderIndex !== undefined
        ) {
            const compoundDuplicate = await this.courseRepo.compoundKeyExists(
                resolvedLangId,
                resolvedGoalId,
                resolvedLevel,
                resolvedOrder,
                courseId,
            );
            if (compoundDuplicate) {
                throw new AppError(
                    `Đã có khóa học khác ở cùng ngôn ngữ, mục tiêu, level ${resolvedLevel} và vị trí ${resolvedOrder}.`,
                    HttpStatus.CONFLICT,
                );
            }
        }

        // Prerequisite validation
        if (body.prerequisiteCourseId !== undefined) {
            if (body.prerequisiteCourseId === courseId) {
                throw new AppError(
                    'Khóa học không thể là điều kiện tiên quyết của chính nó',
                    HttpStatus.BAD_REQUEST,
                );
            }
            if (body.prerequisiteCourseId) {
                const prereq = await this.courseRepo.findByIdFull(body.prerequisiteCourseId);
                if (!prereq) {
                    throw new AppError(
                        'Khóa học tiên quyết không tồn tại',
                        HttpStatus.NOT_FOUND,
                    );
                }
                // Cycle detection
                const cycle = await wouldCreatePrerequisiteCycle(
                    this.courseRepo,
                    courseId,
                    body.prerequisiteCourseId,
                );
                if (cycle) {
                    throw new AppError(
                        'Không thể thiết lập điều kiện tiên quyết này vì sẽ tạo vòng lặp',
                        HttpStatus.BAD_REQUEST,
                    );
                }
            }
        }

        const updated = await this.courseRepo.updateCourse(courseId, body as Record<string, unknown>);
        if (!updated) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        logger.info('Course updated', { courseId });
        return updated;
    }

    // ─── Toggle status ───────────────────────────────────────────────────────

    async toggleCourseStatus(courseId: string): Promise<ICourse> {
        const current = await this.courseRepo.findByIdFull(courseId);
        if (!current) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        const updated = await this.courseRepo.updateCourse(courseId, {
            isActive: !current.isActive,
        });
        return updated!;
    }

    // ─── Delete ──────────────────────────────────────────────────────────────

    async deleteCourse(courseId: string): Promise<void> {
        const course = await this.courseRepo.findByIdFull(courseId);
        if (!course) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        // Preserve delete guard: reject when Units exist
        if (course.totalUnits > 0) {
            throw new AppError(
                `Không thể xóa course "${course.name}" vì còn ${course.totalUnits} unit bên trong. Hãy xóa các unit trước.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.courseRepo.deleteById(courseId);

        logger.info('Course deleted', { courseId });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const courseService = new CourseService(
    new CourseMongoRepository(),
    new LanguageMongoRepository(),
    new LearningGoalMongoRepository(),
);
