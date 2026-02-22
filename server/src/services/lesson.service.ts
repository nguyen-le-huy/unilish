import { HttpStatus } from '../constants/http-status.js';
import type { ILesson } from '../models/mongo/lesson.model.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { UnitMongoRepository } from '../repositories/mongo/unit.mongo.repository.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import type {
    CreateLessonBody,
    ReorderLessonsBody,
    UpdateLessonBody,
} from '../validations/lesson.validation.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class LessonService {
    constructor(
        private readonly lessonRepo: LessonMongoRepository,
        private readonly unitRepo: UnitMongoRepository,
    ) {}

    // ─── Read ──────────────────────────────────────────────────────────────

    async getLessonsByUnitId(unitId: string): Promise<ILesson[]> {
        return this.lessonRepo.findByUnitId(unitId);
    }

    async getLessonById(lessonId: string): Promise<ILesson> {
        const lesson = await this.lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Lesson không tồn tại', HttpStatus.NOT_FOUND);
        }
        return lesson;
    }

    // ─── Write ─────────────────────────────────────────────────────────────

    async createLesson(body: CreateLessonBody): Promise<ILesson> {
        // Validate parent unit exists
        const unitExists = await this.unitRepo.findByIdFull(body.unitId);
        if (!unitExists) {
            throw new AppError('Unit không tồn tại', HttpStatus.NOT_FOUND);
        }

        // Auto-assign the next orderIndex
        const maxOrder = await this.lessonRepo.getMaxOrderIndex(body.unitId);
        const orderIndex = maxOrder + 1;

        const created = await this.lessonRepo.createLesson({
            ...body,
            orderIndex,
            content: {},  // Polymorphic content — populated in Sprint 2
        } as unknown as Partial<ILesson>);

        logger.info('Lesson created', { lessonId: String(created._id), unitId: body.unitId });
        return created;
    }

    async updateLesson(lessonId: string, body: UpdateLessonBody): Promise<ILesson> {
        const updated = await this.lessonRepo.updateById(
            lessonId,
            body as unknown as Partial<ILesson>,
        );
        if (!updated) {
            throw new AppError('Lesson không tồn tại', HttpStatus.NOT_FOUND);
        }
        return updated;
    }

    async deleteLesson(lessonId: string): Promise<void> {
        const lesson = await this.lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Lesson không tồn tại', HttpStatus.NOT_FOUND);
        }

        await this.lessonRepo.deleteById(lessonId);

        logger.info('Lesson deleted', { lessonId, unitId: String(lesson.unitId) });
    }

    async reorderLessons(body: ReorderLessonsBody): Promise<void> {
        const orders = body.orderedIds.map((id, index) => ({
            id,
            orderIndex: index + 1,
        }));
        await this.lessonRepo.reorderLessons(orders);
        logger.info('Lessons reordered', { unitId: body.unitId, count: orders.length });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const lessonService = new LessonService(
    new LessonMongoRepository(),
    new UnitMongoRepository(),
);
