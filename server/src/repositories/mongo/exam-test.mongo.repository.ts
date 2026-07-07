import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { ExamTest, EExamTestStatus, type IExamTest } from '../../models/mongo/exam-test.model.js';

export interface ExamTestListFilters {
    page?: number;
    limit?: number;
    search?: string;
    format?: string;
    kind?: string;
    status?: string;
    skill?: string;
}

export interface ExamTestListResult {
    data: Partial<IExamTest>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class ExamTestMongoRepository extends BaseMongoRepository<IExamTest> {
    constructor() {
        super(ExamTest);
    }

    private readonly fullSelectFields =
        'name format kind logicalTestId slug languageId language description status version skill questionType durationMinutes modules content scoringConfig settings publishedAt createdBy updatedBy createdAt updatedAt';

    private readonly listSelectFields =
        'name format kind logicalTestId slug languageId language description status version skill questionType durationMinutes itemCount scoringConfig settings publishedAt createdBy updatedBy createdAt updatedAt';

    async findMany(filters: ExamTestListFilters): Promise<ExamTestListResult> {
        const { page = 1, limit = 20, search, format, kind, status, skill } = filters;

        const filter: Record<string, unknown> = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }
        if (format) {
            filter.format = format;
        }
        if (kind) {
            filter.kind = kind;
        }
        if (status) {
            filter.status = status;
        }
        if (skill) {
            filter.skill = skill;
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select(this.listSelectFields)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        return {
            data: data as Partial<IExamTest>[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findById(id: string): Promise<IExamTest | null> {
        return this.model
            .findById(id)
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async create(data: Partial<IExamTest>): Promise<IExamTest> {
        return this.model.create(data);
    }

    async updateById(id: string, data: Partial<IExamTest>): Promise<IExamTest | null> {
        return this.model
            .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async softDelete(id: string): Promise<IExamTest | null> {
        return this.model
            .findByIdAndUpdate(
                id,
                { $set: { status: EExamTestStatus.ARCHIVED } },
                { new: true },
            )
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async hardDelete(id: string): Promise<boolean> {
        const deleted = await this.model.findByIdAndDelete(id).exec();
        return !!deleted;
    }

    async findVersionHistory(name: string, format: string): Promise<Partial<IExamTest>[]> {
        return this.model
            .find({ name, format })
            .select('_id name format kind status version createdAt updatedAt createdBy')
            .sort({ version: -1 })
            .lean()
            .exec() as Promise<Partial<IExamTest>[]>;
    }

    async findByNameFormatVersion(name: string, format: string, version: number): Promise<IExamTest | null> {
        return this.model
            .findOne({ name, format, version })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async getLatestVersion(name: string, format: string): Promise<number> {
        const latest = await this.model
            .findOne({ name, format })
            .sort({ version: -1 })
            .select('version')
            .lean()
            .exec();

        return (latest as Partial<IExamTest> | null)?.version ?? 0;
    }

    async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
        await this.model.updateMany(filter, update).exec();
    }

    async archiveActiveByNameFormat(name: string, format: string, excludeId: string): Promise<void> {
        await this.model
            .updateMany(
                {
                    name,
                    format,
                    status: EExamTestStatus.ACTIVE,
                    _id: { $ne: new mongoose.Types.ObjectId(excludeId) },
                },
                { $set: { status: EExamTestStatus.ARCHIVED } },
            )
            .exec();
    }

    // ─── IELTS skill-practice specific methods ──────────────────────────────

    async findActiveBySlug(slug: string): Promise<IExamTest | null> {
        return this.model
            .findOne({
                kind: 'skill_practice',
                slug,
                status: EExamTestStatus.ACTIVE,
            })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async findActiveBySkill(
        skill: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
    ): Promise<ExamTestListResult> {
        const filter: Record<string, unknown> = {
            kind: 'skill_practice',
            skill,
            status: EExamTestStatus.ACTIVE,
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select(this.listSelectFields)
                .sort({ publishedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        return {
            data: data as Partial<IExamTest>[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async countActiveBySkill(skill: string): Promise<number> {
        return this.model
            .countDocuments({
                kind: 'skill_practice',
                skill,
                status: EExamTestStatus.ACTIVE,
            })
            .exec();
    }

    async findActiveByLogicalTestId(logicalTestId: string): Promise<IExamTest | null> {
        return this.model
            .findOne({
                logicalTestId: new mongoose.Types.ObjectId(logicalTestId),
                status: EExamTestStatus.ACTIVE,
            })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    async findLatestDraftByLogicalTestId(logicalTestId: string): Promise<IExamTest | null> {
        return this.model
            .findOne({
                logicalTestId: new mongoose.Types.ObjectId(logicalTestId),
                status: EExamTestStatus.DRAFT,
            })
            .sort({ version: -1 })
            .select(this.fullSelectFields)
            .lean()
            .exec() as Promise<IExamTest | null>;
    }

    /**
     * Get the latest version of a logical test (any status).
     */
    async getLatestVersionByLogicalTestId(logicalTestId: string): Promise<number> {
        const latest = await this.model
            .findOne({
                logicalTestId: new mongoose.Types.ObjectId(logicalTestId),
            })
            .sort({ version: -1 })
            .select('version')
            .lean()
            .exec();

        return (latest as Partial<IExamTest> | null)?.version ?? 0;
    }

    /**
     * Get all versions for a logical test, sorted descending.
     */
    async findVersionsByLogicalTestId(logicalTestId: string): Promise<Partial<IExamTest>[]> {
        return this.model
            .find({
                logicalTestId: new mongoose.Types.ObjectId(logicalTestId),
            })
            .select('_id name format kind slug skill questionType status version createdAt updatedAt createdBy')
            .sort({ version: -1 })
            .lean()
            .exec() as Promise<Partial<IExamTest>[]>;
    }

    /**
     * Count all active skill-practice tests grouped by skill.
     */
    async countActiveGroupedBySkill(): Promise<Array<{ _id: string; count: number }>> {
        return this.model
            .aggregate([
                {
                    $match: {
                        kind: 'skill_practice',
                        status: EExamTestStatus.ACTIVE,
                    },
                },
                {
                    $group: {
                        _id: '$skill',
                        count: { $sum: 1 },
                    },
                },
            ])
            .exec();
    }
}

export const examTestMongoRepository = new ExamTestMongoRepository();
