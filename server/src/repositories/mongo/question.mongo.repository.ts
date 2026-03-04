import mongoose from 'mongoose';
import { Question, type IQuestion } from '../../models/mongo/question.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import type { GetQuestionsQuery, CreateQuestionBody } from '../../validations/question.validation.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuestionListResult {
    data: Partial<IQuestion>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export type CreateQuestionData = CreateQuestionBody & {
    createdBy?: string;
    status?: IQuestion['status'];
    version?: number;
};

export type UpdateQuestionData = Partial<
    Pick<
        IQuestion,
        | 'source'
        | 'skill'
        | 'part'
        | 'difficulty'
        | 'difficultyLevel'
        | 'type'
        | 'stem'
        | 'content'
        | 'explanation'
        | 'tags'
        | 'status'
        | 'reviewedBy'
        | 'testedConcept'
    >
> & { version?: number };

// ─── Repository ──────────────────────────────────────────────────────────────

export class QuestionMongoRepository extends BaseMongoRepository<IQuestion> {
    constructor() {
        super(Question);
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    /**
     * Paginated list with advanced filters.
     * All reads use .lean() + .select() for performance.
     */
    async findMany(query: GetQuestionsQuery): Promise<QuestionListResult> {
        const {
            page,
            limit,
            search,
            languageId,
            source,
            skill,
            part,
            difficulty,
            status,
            type,
            tags,
            createdBy,
            minCorrectRate,
            maxCorrectRate,
            sortBy,
            sortOrder,
        } = query;

        const filter: Record<string, unknown> = {};

        // Full-text search on stem.text
        if (search) {
            filter['stem.text'] = { $regex: search, $options: 'i' };
        }

        if (languageId) filter.languageId = new mongoose.Types.ObjectId(languageId);
        if (source) filter.source = source;
        if (skill) filter.skill = skill;
        if (type) filter.type = type;
        if (status) filter.status = status;

        if (part !== undefined) filter.part = part;

        if (createdBy) {
            filter.createdBy = new mongoose.Types.ObjectId(createdBy);
        }

        // Comma-separated difficulty: "B1,B2"
        if (difficulty) {
            const levels = difficulty.split(',').map((d) => d.trim()).filter(Boolean);
            filter.difficulty = levels.length === 1 ? levels[0] : { $in: levels };
        }

        // Comma-separated tags: "business,formal"
        if (tags) {
            const tagList = tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (tagList.length > 0) {
                filter.tags = { $all: tagList };
            }
        }

        // Correct rate range
        if (minCorrectRate !== undefined || maxCorrectRate !== undefined) {
            const rateFilter: Record<string, number> = {};
            if (minCorrectRate !== undefined) rateFilter.$gte = minCorrectRate;
            if (maxCorrectRate !== undefined) rateFilter.$lte = maxCorrectRate;
            filter.avgCorrectRate = rateFilter;
        }

        const sortField = sortBy ?? 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select('-__v -content')  // exclude heavy content from list view
                .sort({ [sortField]: sortDirection })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec() as Promise<Partial<IQuestion>[]>,
            this.model.countDocuments(filter).exec(),
        ]);

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get full question details (includes content) by ID.
     */
    async findByIdWithDetails(id: string): Promise<IQuestion | null> {
        return this.model
            .findById(id)
            .select('-__v')
            .lean()
            .exec() as Promise<IQuestion | null>;
    }

    // ─── WRITE ────────────────────────────────────────────────────────────────

    async createQuestion(data: CreateQuestionData): Promise<IQuestion> {
        // Strip undefined fields before insert to satisfy exactOptionalPropertyTypes
        const cleanData: Record<string, unknown> = Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
        );
        const doc = await this.model.create(cleanData);
        return doc.toObject() as unknown as IQuestion;
    }

    async updateQuestion(id: string, data: UpdateQuestionData): Promise<IQuestion | null> {
        return this.model
            .findByIdAndUpdate(
                id,
                { $set: data },
                { new: true, runValidators: true }
            )
            .select('-__v')
            .lean()
            .exec() as Promise<IQuestion | null>;
    }

    async deleteQuestion(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(id).exec();
        return !!result;
    }

    // ─── BULK OPERATIONS ──────────────────────────────────────────────────────

    async bulkUpdateStatus(ids: string[], status: IQuestion['status']): Promise<number> {
        const result = await this.model.updateMany(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
            { $set: { status } },
        ).exec();
        return result.modifiedCount;
    }

    async bulkAddTag(ids: string[], tag: string): Promise<number> {
        const result = await this.model.updateMany(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
            { $addToSet: { tags: tag.toLowerCase() } },
        ).exec();
        return result.modifiedCount;
    }

    async bulkRemoveTag(ids: string[], tag: string): Promise<number> {
        const result = await this.model.updateMany(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
            { $pull: { tags: tag.toLowerCase() } },
        ).exec();
        return result.modifiedCount;
    }

    async bulkDelete(ids: string[]): Promise<number> {
        const result = await this.model.deleteMany(
            { _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } },
        ).exec();
        return result.deletedCount;
    }

    // ─── ANALYTICS ────────────────────────────────────────────────────────────

    async incrementUsage(id: string): Promise<void> {
        await this.model.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }).exec();
    }

    async updateCorrectRate(id: string, newRate: number): Promise<void> {
        await this.model.findByIdAndUpdate(id, { $set: { avgCorrectRate: newRate } }).exec();
    }

    // ─── EXPORT ───────────────────────────────────────────────────────────────

    async findForExport(filter: Record<string, unknown>): Promise<Partial<IQuestion>[]> {
        return this.model
            .find(filter)
            .select('source skill part difficulty status type stem explanation tags usageCount avgCorrectRate createdAt')
            .sort({ createdAt: -1 })
            .limit(5000)  // safety cap for export
            .lean()
            .exec() as Promise<Partial<IQuestion>[]>;
    }
}

export const questionMongoRepository = new QuestionMongoRepository();
