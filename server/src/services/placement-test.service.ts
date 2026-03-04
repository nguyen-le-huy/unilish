import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { placementTestMongoRepository } from '../repositories/mongo/placement-test.mongo.repository.js';
import { Question } from '../models/mongo/question.model.js';
import {
    EPlacementTestStatus,
    type IPlacementTest,
    type IModuleMCQ,
} from '../models/mongo/placement-test.model.js';
import type {
    GetPlacementTestsQuery,
    CreatePlacementTestBody,
    UpdatePlacementTestBody,
    AnalyticsQuery,
} from '../validations/placement-test.validation.js';
import type { PlacementTestListResult } from '../repositories/mongo/placement-test.mongo.repository.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PoolValidationResult {
    isValid: boolean;
    modules: {
        moduleIndex: number;
        moduleName: string;
        type: string;
        parts?: PoolPartValidation[];
    }[];
}

export interface PoolPartValidation {
    part: number;
    name: string;
    poolTag: string;
    required: number;
    minimumPool: number;
    publishedCount: number;
    isValid: boolean;
}

// ─── Default CEFR Thresholds ──────────────────────────────────────────────────

const DEFAULT_CEFR_THRESHOLDS = [
    { level: 'A1' as const, mcqMin: 0, mcqMax: 0.25, writingMin: 0, writingMax: 0.25, speakingMin: 0, speakingMax: 0.25 },
    { level: 'A2' as const, mcqMin: 0.25, mcqMax: 0.45, writingMin: 0.25, writingMax: 0.45, speakingMin: 0.25, speakingMax: 0.45 },
    { level: 'B1' as const, mcqMin: 0.45, mcqMax: 0.60, writingMin: 0.45, writingMax: 0.60, speakingMin: 0.45, speakingMax: 0.60 },
    { level: 'B2' as const, mcqMin: 0.60, mcqMax: 0.75, writingMin: 0.60, writingMax: 0.75, speakingMin: 0.60, speakingMax: 0.75 },
    { level: 'C1' as const, mcqMin: 0.75, mcqMax: 0.90, writingMin: 0.75, writingMax: 0.90, speakingMin: 0.75, speakingMax: 0.90 },
    { level: 'C2' as const, mcqMin: 0.90, mcqMax: 1, writingMin: 0.90, writingMax: 1, speakingMin: 0.90, speakingMax: 1 },
];

// ─── Service ──────────────────────────────────────────────────────────────────

class PlacementTestService {

    // ─── READ ─────────────────────────────────────────────────────────────────

    async getAll(query: GetPlacementTestsQuery): Promise<PlacementTestListResult> {
        const filters: import('../repositories/mongo/placement-test.mongo.repository.js').PlacementTestListFilters = {
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined && { search: query.search }),
            ...(query.language !== undefined && { language: query.language }),
            ...(query.status !== undefined && { status: query.status }),
        };
        return placementTestMongoRepository.findMany(filters);
    }

    async getById(id: string): Promise<IPlacementTest> {
        const test = await placementTestMongoRepository.findByIdWithModules(id);
        if (!test) {
            throw new AppError('Không tìm thấy bài kiểm tra đầu vào', HttpStatus.NOT_FOUND);
        }
        return test;
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    async create(data: CreatePlacementTestBody, adminId: string): Promise<IPlacementTest> {
        const test = await placementTestMongoRepository.create({
            ...data,
            languageId: new mongoose.Types.ObjectId(data.languageId),
            status: EPlacementTestStatus.DRAFT,
            version: 1,
            cefrMapping: data.cefrMapping ?? {
                weights: { mcq: 0.4, writing: 0.3, speaking: 0.3 },
                thresholds: DEFAULT_CEFR_THRESHOLDS,
            },
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IPlacementTest>);

        logger.info('PlacementTest created', {
            testId: String(test._id),
            language: test.language,
            adminId,
        });

        return test;
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    /**
     * Update a draft/paused test — overwrite in place.
     * Active tests: archive current, create new version.
     */
    async update(id: string, data: UpdatePlacementTestBody, adminId: string): Promise<IPlacementTest> {
        const existing = await this.getById(id);

        const updated = await placementTestMongoRepository.updateById(id, {
            ...data,
            updatedBy: new mongoose.Types.ObjectId(adminId),
        } as unknown as Partial<IPlacementTest>);

        if (!updated) {
            throw new AppError('Cập nhật bài kiểm tra thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('PlacementTest updated', {
            testId: id,
            language: existing.language,
            adminId,
        });

        return updated;
    }

    // ─── STATUS CHANGE ────────────────────────────────────────────────────────

    /**
     * Change status with business rules enforcement:
     * - active → validate pool BEFORE switching
     * - active → archives previous active version for same language+name
     * - active → bumps version if current version was already published before
     */
    async updateStatus(
        id: string,
        status: 'active' | 'paused' | 'archived',
        adminId: string,
    ): Promise<IPlacementTest> {
        const existing = await this.getById(id);

        if (status === EPlacementTestStatus.ACTIVE) {
            // Validate pool before publishing
            const validation = await this.validatePool(id);
            if (!validation.isValid) {
                const failedParts = validation.modules
                    .flatMap((m) => m.parts ?? [])
                    .filter((p) => !p.isValid)
                    .map((p) => `${p.poolTag} (cần ${p.minimumPool}, có ${p.publishedCount})`)
                    .join(', ');
                throw new AppError(
                    `Không đủ câu hỏi trong pool: ${failedParts}`,
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            // Archive any other active tests for same language+name
            await placementTestMongoRepository.archiveActiveByLanguageName(
                existing.language,
                existing.name,
                id,
            );

            // Bump version if this was previously published
            if (existing.status !== EPlacementTestStatus.DRAFT) {
                const latestVersion = await placementTestMongoRepository.getLatestVersion(
                    existing.language,
                    existing.name,
                );
                await placementTestMongoRepository.updateById(id, {
                    status: EPlacementTestStatus.ACTIVE,
                    version: latestVersion + 1,
                    updatedBy: new mongoose.Types.ObjectId(adminId),
                });
            }
        }

        const updated = await placementTestMongoRepository.updateById(id, {
            status,
            updatedBy: new mongoose.Types.ObjectId(adminId),
        });

        if (!updated) {
            throw new AppError('Cập nhật trạng thái thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('PlacementTest status changed', {
            testId: id,
            from: existing.status,
            to: status,
            adminId,
        });

        return updated;
    }

    // ─── VERSION HISTORY ──────────────────────────────────────────────────────

    async getVersionHistory(id: string): Promise<Partial<IPlacementTest>[]> {
        const existing = await this.getById(id);
        return placementTestMongoRepository.findVersionHistory(existing.language, existing.name);
    }

    // ─── ROLLBACK ─────────────────────────────────────────────────────────────

    /**
     * Creates a new draft document as a copy of the target version.
     * The original archived version is preserved.
     */
    async rollback(id: string, targetVersion: number, adminId: string): Promise<IPlacementTest> {
        const target = await this.getById(id);

        const versionSnapshot = await placementTestMongoRepository.findByLanguageNameVersion(
            target.language,
            target.name,
            targetVersion,
        );

        if (!versionSnapshot) {
            throw new AppError(
                `Không tìm thấy phiên bản v${targetVersion}`,
                HttpStatus.NOT_FOUND,
            );
        }

        const latestVersion = await placementTestMongoRepository.getLatestVersion(
            target.language,
            target.name,
        );

        const { _id, createdAt, updatedAt, ...rest } = versionSnapshot as IPlacementTest & {
            createdAt: Date;
            updatedAt: Date;
        };

        // Suppress unused variable warnings for destructured fields
        void _id;
        void createdAt;
        void updatedAt;

        const rollbackDraft = await placementTestMongoRepository.create({
            ...rest,
            status: EPlacementTestStatus.DRAFT,
            version: latestVersion + 1,
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IPlacementTest>);

        logger.info('PlacementTest rolled back', {
            sourceId: id,
            fromVersion: targetVersion,
            newVersion: latestVersion + 1,
            adminId,
        });

        return rollbackDraft;
    }

    // ─── POOL VALIDATION ──────────────────────────────────────────────────────

    /**
     * For each MCQ module, count published questions by poolTag.
     * Rule: pool must have at least (questionsCount × 2) published questions.
     */
    async validatePool(id: string): Promise<PoolValidationResult> {
        const test = await this.getById(id);

        const moduleResults = await Promise.all(
            test.modules.map(async (module, idx) => {
                if (module.type !== 'mcq') {
                    return {
                        moduleIndex: idx,
                        moduleName: module.name,
                        type: module.type,
                    };
                }

                const mcqModule = module as IModuleMCQ;

                const partResults = await Promise.all(
                    mcqModule.parts.map(async (part) => {
                        const publishedCount = await Question.countDocuments({
                            tags: part.poolTag,
                            status: 'published',
                        }).exec();

                        const minimumPool = part.questionsCount * 2; // ×2 buffer requirement
                        return {
                            part: part.part,
                            name: part.name,
                            poolTag: part.poolTag,
                            required: part.questionsCount,
                            minimumPool,
                            publishedCount,
                            isValid: publishedCount >= minimumPool,
                        };
                    }),
                );

                return {
                    moduleIndex: idx,
                    moduleName: mcqModule.name,
                    type: 'mcq',
                    parts: partResults,
                };
            }),
        );

        const isValid = moduleResults.every(
            (m) => !m.parts || m.parts.every((p) => p.isValid),
        );

        return { isValid, modules: moduleResults };
    }

    // ─── ANALYTICS ────────────────────────────────────────────────────────────

    async getAnalytics(id: string, query: AnalyticsQuery): Promise<Record<string, unknown>> {
        await this.getById(id); // validate exists
        return placementTestMongoRepository.getAnalyticsSummary(id, query.range);
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const placementTestService = new PlacementTestService();
