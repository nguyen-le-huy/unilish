import mongoose from 'mongoose';
import { Lesson, type ILesson } from '../../models/mongo/lesson.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import type { VocabContent, VocabGenerationStatus } from '../../types/lesson-content.types.js';

// ─── Repository ───────────────────────────────────────────────────────────────

export class LessonMongoRepository extends BaseMongoRepository<ILesson> {
    constructor() {
        super(Lesson);
    }

    /**
     * Find all lessons belonging to a unit, ordered by position.
     * MANDATORY: .lean() + .select() on every read path.
     */
    async findByUnitId(unitId: string): Promise<ILesson[]> {
        return this.model
            .find({ unitId })
            .select('-__v -content')   // Exclude heavy polymorphic content from list views
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Promise<ILesson[]>;
    }

    /**
     * Find a single lesson by its ObjectId with ALL fields (including content).
     */
    async findByIdFull(lessonId: string): Promise<ILesson | null> {
        return this.model
            .findById(lessonId)
            .select('-__v')
            .lean()
            .exec() as Promise<ILesson | null>;
    }

    /**
     * Create a new lesson from a plain object payload.
     */
    async createLesson(data: Partial<ILesson>): Promise<ILesson> {
        return this.model.create(data);
    }

    /**
     * Update a lesson by its ObjectId. Returns updated document.
     */
    async updateById(lessonId: string, data: Partial<ILesson>): Promise<ILesson | null> {
        return this.model
            .findByIdAndUpdate(lessonId, data, { new: true, runValidators: true })
            .select('-__v')
            .lean()
            .exec() as Promise<ILesson | null>;
    }

    /**
     * Delete a lesson by ObjectId.
     */
    async deleteById(lessonId: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(lessonId).exec();
        return !!result;
    }

    /**
     * Delete all lessons belonging to a unit (cascade from unit deletion).
     */
    async deleteByUnitId(unitId: string): Promise<number> {
        const result = await this.model.deleteMany({ unitId }).exec();
        return result.deletedCount;
    }

    /**
     * Count lessons in a unit.
     */
    async countByUnitId(unitId: string): Promise<number> {
        return this.model.countDocuments({ unitId }).exec();
    }

    /**
     * Get the highest orderIndex in a unit (to auto-assign next position).
     */
    async getMaxOrderIndex(unitId: string): Promise<number> {
        const result = await this.model
            .findOne({ unitId })
            .select('orderIndex')
            .sort({ orderIndex: -1 })
            .lean()
            .exec() as ILesson | null;
        return result?.orderIndex ?? 0;
    }

    /**
     * Bulk-reorder lessons using a bulkWrite for atomicity.
     * Accepts an array of { id, orderIndex } pairs.
     */
    async reorderLessons(orders: Array<{ id: string; orderIndex: number }>): Promise<void> {
        const ops = orders.map(({ id, orderIndex }) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { orderIndex } },
            },
        }));
        await this.model.bulkWrite(ops);
    }

    // ─── Vocab-Specific Methods ───────────────────────────────────────────────

    /**
     * Retrieve only the vocab content field for a lesson.
     * Uses lean() + select() for minimal footprint.
     */
    async findVocabContent(lessonId: string): Promise<VocabContent | null> {
        const doc = await this.model
            .findById(lessonId)
            .select('content')
            .lean()
            .exec() as Pick<ILesson, 'content'> | null;
        return (doc?.content as VocabContent) ?? null;
    }

    /**
     * Atomically replace the entire vocab content block.
     */
    async saveVocabContent(lessonId: string, content: VocabContent): Promise<ILesson> {
        const updated = await this.model
            .findByIdAndUpdate(
                lessonId,
                { $set: { content } },
                { new: true, runValidators: false },
            )
            .select('-__v')
            .lean()
            .exec() as ILesson | null;

        if (!updated) throw new Error(`Lesson ${lessonId} not found`);
        return updated;
    }

    /**
     * Atomic $set on a single vocab item's audio URL.
     * Avoids replacing the entire content array.
     */
    async updateVocabItemAudio(
        lessonId: string,
        itemId: string,
        target: 'word' | 'sentence',
        url: string,
    ): Promise<void> {
        const field =
            target === 'word'
                ? 'content.items.$[el].audioWordUrl'
                : 'content.items.$[el].audioSentenceUrl';

        await this.model
            .updateOne(
                { _id: lessonId },
                { $set: { [field]: url } },
                { arrayFilters: [{ 'el.id': itemId }] },
            )
            .exec();
    }

    /**
     * Update the generationStatus field inside content.
     */
    async updateVocabGenerationStatus(
        lessonId: string,
        status: VocabGenerationStatus,
    ): Promise<void> {
        await this.model
            .updateOne({ _id: lessonId }, { $set: { 'content.generationStatus': status } })
            .exec();
    }

    /**
     * Set the taughtConcepts array (replaces existing).
     */
    async setTaughtConcepts(
        lessonId: string,
        conceptIds: mongoose.Types.ObjectId[],
    ): Promise<void> {
        await this.model
            .updateOne({ _id: lessonId }, { $set: { taughtConcepts: conceptIds } })
            .exec();
    }
}
