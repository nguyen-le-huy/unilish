import mongoose from 'mongoose';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { ExamTest, EExamTestStatus, type IExamTest } from '../../models/mongo/exam-test.model.js';

export interface ExamTestListFilters {
    page?: number;
    limit?: number;
    search?: string;
    format?: string;
    status?: string;
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
        'name format languageId language description status version modules scoringConfig settings createdBy updatedBy createdAt updatedAt';

    async findMany(filters: ExamTestListFilters): Promise<ExamTestListResult> {
        const { page = 1, limit = 20, search, format, status } = filters;

        const filter: Record<string, unknown> = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (format) {
            filter.format = format;
        }
        if (status) {
            filter.status = status;
        }

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select('-modules')
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

    async findVersionHistory(name: string, format: string): Promise<Partial<IExamTest>[]> {
        return this.model
            .find({ name, format })
            .select('_id name format status version createdAt updatedAt createdBy')
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
}

export const examTestMongoRepository = new ExamTestMongoRepository();
