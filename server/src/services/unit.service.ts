import { HttpStatus } from '../constants/http-status.js';
import type { IUnit } from '../models/mongo/unit.model.js';
import { UnitMongoRepository } from '../repositories/mongo/unit.mongo.repository.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { CourseMongoRepository } from '../repositories/mongo/course.mongo.repository.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import type {
    CreateUnitBody,
    ReorderUnitsBody,
    UpdateUnitBody,
} from '../validations/unit.validation.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class UnitService {
    constructor(
        private readonly unitRepo: UnitMongoRepository,
        private readonly lessonRepo: LessonMongoRepository,
        private readonly courseRepo: CourseMongoRepository,
    ) {}

    // ─── Read ──────────────────────────────────────────────────────────────

    async getUnitsByCourseId(courseId: string): Promise<IUnit[]> {
        return this.unitRepo.findByCourseId(courseId);
    }

    async getUnitById(unitId: string): Promise<IUnit> {
        const unit = await this.unitRepo.findByIdFull(unitId);
        if (!unit) {
            throw new AppError('Unit không tồn tại', HttpStatus.NOT_FOUND);
        }
        return unit;
    }

    // ─── Write ─────────────────────────────────────────────────────────────

    async createUnit(body: CreateUnitBody): Promise<IUnit> {
        // Validate parent course exists
        const courseExists = await this.courseRepo.findByIdFull(body.courseId);
        if (!courseExists) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        // Auto-assign the next orderIndex
        const maxOrder = await this.unitRepo.getMaxOrderIndex(body.courseId);
        const orderIndex = maxOrder + 1;

        const created = await this.unitRepo.createUnit({
            ...body,
            orderIndex,
        } as unknown as Partial<IUnit>);

        // Keep course totalUnits in sync
        await this.courseRepo.incrementUnitCount(body.courseId);

        logger.info('Unit created', { unitId: String(created._id), courseId: body.courseId });
        return created;
    }

    async updateUnit(unitId: string, body: UpdateUnitBody): Promise<IUnit> {
        const updated = await this.unitRepo.updateById(
            unitId,
            body as unknown as Partial<IUnit>,
        );
        if (!updated) {
            throw new AppError('Unit không tồn tại', HttpStatus.NOT_FOUND);
        }
        return updated;
    }

    async deleteUnit(unitId: string): Promise<void> {
        const unit = await this.unitRepo.findByIdFull(unitId);
        if (!unit) {
            throw new AppError('Unit không tồn tại', HttpStatus.NOT_FOUND);
        }

        // Cascade: delete all lessons within this unit first
        const deletedLessonCount = await this.lessonRepo.deleteByUnitId(unitId);

        await this.unitRepo.deleteById(unitId);

        // Keep course totalUnits in sync
        await this.courseRepo.decrementUnitCount(String(unit.courseId));

        logger.info('Unit deleted', {
            unitId,
            courseId: String(unit.courseId),
            cascadedLessons: deletedLessonCount,
        });
    }

    async reorderUnits(body: ReorderUnitsBody): Promise<void> {
        const orders = body.orderedIds.map((id, index) => ({
            id,
            orderIndex: index + 1,
        }));
        await this.unitRepo.reorderUnits(orders);
        logger.info('Units reordered', { courseId: body.courseId, count: orders.length });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const unitService = new UnitService(
    new UnitMongoRepository(),
    new LessonMongoRepository(),
    new CourseMongoRepository(),
);
