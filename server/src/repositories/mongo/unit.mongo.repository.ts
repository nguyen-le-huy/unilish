import { Unit, type IUnit } from '../../models/mongo/unit.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';

// ─── Repository ───────────────────────────────────────────────────────────────

export class UnitMongoRepository extends BaseMongoRepository<IUnit> {
    constructor() {
        super(Unit);
    }

    /**
     * Find all units belonging to a course, ordered by position.
     * MANDATORY: .lean() + .select() on every read path.
     */
    async findByCourseId(courseId: string): Promise<IUnit[]> {
        return this.model
            .find({ courseId })
            .select('-__v')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Promise<IUnit[]>;
    }

    /**
     * Find a single unit by its ObjectId with full fields.
     */
    async findByIdFull(unitId: string): Promise<IUnit | null> {
        return this.model
            .findById(unitId)
            .select('-__v')
            .lean()
            .exec() as Promise<IUnit | null>;
    }

    /**
     * Create a new unit from a plain object payload.
     */
    async createUnit(data: Partial<IUnit>): Promise<IUnit> {
        return this.model.create(data);
    }

    /**
     * Update a unit by its ObjectId. Returns updated document.
     */
    async updateById(unitId: string, data: Partial<IUnit>): Promise<IUnit | null> {
        return this.model
            .findByIdAndUpdate(unitId, data, { new: true, runValidators: true })
            .select('-__v')
            .lean()
            .exec() as Promise<IUnit | null>;
    }

    /**
     * Delete a unit by ObjectId.
     */
    async deleteById(unitId: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(unitId).exec();
        return !!result;
    }

    /**
     * Count units in a course (used for cascade-delete checks).
     */
    async countByCourseId(courseId: string): Promise<number> {
        return this.model.countDocuments({ courseId }).exec();
    }

    /**
     * Get the highest orderIndex in a course (to auto-assign next position).
     */
    async getMaxOrderIndex(courseId: string): Promise<number> {
        const result = await this.model
            .findOne({ courseId })
            .select('orderIndex')
            .sort({ orderIndex: -1 })
            .lean()
            .exec() as IUnit | null;
        return result?.orderIndex ?? 0;
    }

    /**
     * Bulk-reorder units using a bulkWrite for atomicity.
     * Accepts an array of { id, orderIndex } pairs.
     */
    async reorderUnits(orders: Array<{ id: string; orderIndex: number }>): Promise<void> {
        const ops = orders.map(({ id, orderIndex }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { orderIndex } },
            },
        }));
        await this.model.bulkWrite(ops);
    }
}
