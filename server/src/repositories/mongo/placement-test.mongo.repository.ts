import mongoose from 'mongoose';
import { PlacementTest, type IPlacementTest, EPlacementTestStatus } from '../../models/mongo/placement-test.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacementTestListFilters {
    search?: string;
    language?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface PlacementTestListResult {
    data: Partial<IPlacementTest>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PoolStat {
    poolTag: string;
    publishedCount: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class PlacementTestMongoRepository extends BaseMongoRepository<IPlacementTest> {
    constructor() {
        super(PlacementTest);
    }

    private normalizeLanguage(input: string): string {
        return input.trim().toLowerCase().replace(/_/g, '-');
    }

    private escapeRegex(input: string): string {
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    /**
     * Paginated list with filters — .lean() + .select() for performance.
     */
    async findMany(filters: PlacementTestListFilters): Promise<PlacementTestListResult> {
        const {
            search,
            language,
            status,
            page = 1,
            limit = 20,
        } = filters;

        const filter: Record<string, unknown> = {};

        if (search) {
            filter['name'] = { $regex: search, $options: 'i' };
        }
        if (language) filter.language = language;
        if (status) filter.status = status;

        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(filter)
                .select('languageId language name standard outputFramework status version settings createdAt updatedAt createdBy updatedBy')
                .sort({ language: 1, status: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.model.countDocuments(filter).exec(),
        ]);

        return {
            data: data as Partial<IPlacementTest>[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Full document with all modules — used in wizard.
     */
    async findByIdWithModules(id: string): Promise<IPlacementTest | null> {
        return this.model.findById(id).lean().exec() as Promise<IPlacementTest | null>;
    }

    /**
     * All versions for a given language+name pair (for version history).
     */
    async findVersionHistory(language: string, name: string): Promise<Partial<IPlacementTest>[]> {
        return this.model
            .find({ language, name })
            .select('version status createdAt updatedAt createdBy updatedBy')
            .sort({ version: -1 })
            .lean()
            .exec() as Promise<Partial<IPlacementTest>[]>;
    }

    /**
     * Finds a specific archived version to support rollback.
     */
    async findByLanguageNameVersion(
        language: string,
        name: string,
        version: number,
    ): Promise<IPlacementTest | null> {
        return this.model
            .findOne({ language, name, version })
            .lean()
            .exec() as Promise<IPlacementTest | null>;
    }

    /**
     * Active test for a given language — used by user-facing onboarding flow.
     */
    async findActiveByLanguage(language: string): Promise<IPlacementTest | null> {
        const normalized = this.normalizeLanguage(language);
        const baseLanguage = normalized.split('-')[0] ?? normalized;

        const selectFields = 'languageId language name status version modules cefrMapping';

        const exactMatch = await this.model
            .findOne({
                status: EPlacementTestStatus.ACTIVE,
                language: { $regex: `^${this.escapeRegex(normalized)}$`, $options: 'i' },
            })
            .select(selectFields)
            .lean()
            .exec();

        if (exactMatch) {
            return exactMatch as IPlacementTest;
        }

        const baseMatch = await this.model
            .findOne({
                status: EPlacementTestStatus.ACTIVE,
                language: { $regex: `^${this.escapeRegex(baseLanguage)}$`, $options: 'i' },
            })
            .select(selectFields)
            .lean()
            .exec();

        if (baseMatch) {
            return baseMatch as IPlacementTest;
        }

        // Accept locale variants when client sends only a base language (e.g. "en" => "en-us").
        return this.model
            .findOne({
                status: EPlacementTestStatus.ACTIVE,
                language: { $regex: `^${this.escapeRegex(baseLanguage)}-[a-z0-9]+$`, $options: 'i' },
            })
            .select(selectFields)
            .lean()
            .exec() as Promise<IPlacementTest | null>;
    }

    // ─── WRITE ────────────────────────────────────────────────────────────────

    /**
     * Update a placement test using $set — returns full updated document.
     */
    async updateById(
        id: string,
        data: Partial<Omit<IPlacementTest, '_id' | 'createdAt'>>,
    ): Promise<IPlacementTest | null> {
        return this.model
            .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
            .lean()
            .exec() as Promise<IPlacementTest | null>;
    }

    /**
     * Archive all active versions of a test (language+name) before publishing a new one.
     */
    async archiveActiveByLanguageName(
        language: string,
        name: string,
        excludeId?: string,
    ): Promise<void> {
        const filter: Record<string, unknown> = {
            language,
            name,
            status: EPlacementTestStatus.ACTIVE,
        };
        if (excludeId) {
            filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
        }

        await this.model
            .updateMany(filter, { $set: { status: EPlacementTestStatus.ARCHIVED } })
            .exec();
    }

    /**
     * Return the latest version number for a language+name group.
     */
    async getLatestVersion(language: string, name: string): Promise<number> {
        const latest = await this.model
            .findOne({ language, name })
            .sort({ version: -1 })
            .select('version')
            .lean()
            .exec();
        return (latest as Partial<IPlacementTest> | null)?.version ?? 0;
    }

    /**
     * Basic analytics summary (counts per CEFR level, dropout).
     * Placeholder: extend with aggregation pipeline when PlacementResult collection is available.
     */
    async getAnalyticsSummary(
        _testId: string,
        _range: string,
    ): Promise<Record<string, unknown>> {
        // TODO: aggregate from PlacementResult collection
        return {};
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const placementTestMongoRepository = new PlacementTestMongoRepository();
