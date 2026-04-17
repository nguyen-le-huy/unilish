import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import {
    EExamFormat,
    EExamScoringFramework,
    EExamTestStatus,
    type IExamBandThreshold,
    type IExamModule,
    type IExamScoringConfig,
    type IExamTest,
    type IExamTestSettings,
} from '../models/mongo/exam-test.model.js';
import {
    examTestMongoRepository,
    type ExamTestListFilters,
    type ExamTestListResult,
} from '../repositories/mongo/exam-test.mongo.repository.js';
import type {
    CreateExamTestBody,
    GetExamTestsQuery,
    UpdateExamTestBody,
} from '../validations/exam-test.validation.js';

const DEFAULT_TOEIC_BANDS: IExamBandThreshold[] = [
    { band: '10–250', minScore: 0, maxScore: 0.25 },
    { band: '255–400', minScore: 0.25, maxScore: 0.4 },
    { band: '405–600', minScore: 0.4, maxScore: 0.6 },
    { band: '605–780', minScore: 0.6, maxScore: 0.79 },
    { band: '785–900', minScore: 0.79, maxScore: 0.91 },
    { band: '905–990', minScore: 0.91, maxScore: 1.0 },
];

const DEFAULT_IELTS_BANDS: IExamBandThreshold[] = [
    { band: 'Band 1–3', minScore: 0, maxScore: 0.35 },
    { band: 'Band 4', minScore: 0.35, maxScore: 0.45 },
    { band: 'Band 4.5', minScore: 0.45, maxScore: 0.5 },
    { band: 'Band 5', minScore: 0.5, maxScore: 0.55 },
    { band: 'Band 5.5', minScore: 0.55, maxScore: 0.6 },
    { band: 'Band 6', minScore: 0.6, maxScore: 0.65 },
    { band: 'Band 6.5', minScore: 0.65, maxScore: 0.7 },
    { band: 'Band 7', minScore: 0.7, maxScore: 0.78 },
    { band: 'Band 7.5+', minScore: 0.78, maxScore: 1.0 },
];

class ExamTestService {
    private static buildDefaultScoringConfig(format: string): IExamScoringConfig {
        if (format === EExamFormat.TOEIC_LR) {
            return {
                framework: EExamScoringFramework.TOEIC_SCORE,
                bandThresholds: DEFAULT_TOEIC_BANDS,
            };
        }

        return {
            framework: EExamScoringFramework.IELTS_BAND,
            bandThresholds: DEFAULT_IELTS_BANDS,
        };
    }

    private static buildDefaultModules(format: string): IExamModule[] {
        if (format === EExamFormat.TOEIC_LR) {
            return [
                {
                    type: 'listening',
                    name: 'Listening',
                    timeLimitMinutes: 45,
                    parts: [
                        { part: 1, name: 'Part 1 — Photographs', questionsCount: 6, poolTag: 'toeic-listening-part1' },
                        { part: 2, name: 'Part 2 — Q-Response', questionsCount: 25, poolTag: 'toeic-listening-part2' },
                        { part: 3, name: 'Part 3 — Conversations', questionsCount: 39, poolTag: 'toeic-listening-part3' },
                        { part: 4, name: 'Part 4 — Short Talks', questionsCount: 30, poolTag: 'toeic-listening-part4' },
                    ],
                },
                {
                    type: 'reading',
                    name: 'Reading',
                    timeLimitMinutes: 75,
                    parts: [
                        { part: 5, name: 'Part 5 — Incomplete Sentences', questionsCount: 30, poolTag: 'toeic-reading-part5' },
                        { part: 6, name: 'Part 6 — Text Completion', questionsCount: 16, poolTag: 'toeic-reading-part6' },
                        { part: 7, name: 'Part 7 — Comprehension', questionsCount: 54, poolTag: 'toeic-reading-part7' },
                    ],
                },
            ];
        }

        if (format === EExamFormat.IELTS) {
            return [
                {
                    type: 'listening',
                    name: 'Listening',
                    timeLimitMinutes: 30,
                    parts: [
                        { part: 1, name: 'Section 1', questionsCount: 10, poolTag: 'ielts-listening-section1' },
                        { part: 2, name: 'Section 2', questionsCount: 10, poolTag: 'ielts-listening-section2' },
                        { part: 3, name: 'Section 3', questionsCount: 10, poolTag: 'ielts-listening-section3' },
                        { part: 4, name: 'Section 4', questionsCount: 10, poolTag: 'ielts-listening-section4' },
                    ],
                },
                {
                    type: 'reading',
                    name: 'Reading',
                    timeLimitMinutes: 60,
                    parts: [
                        { part: 1, name: 'Passage 1', questionsCount: 14, poolTag: 'ielts-reading-passage1' },
                        { part: 2, name: 'Passage 2', questionsCount: 13, poolTag: 'ielts-reading-passage2' },
                        { part: 3, name: 'Passage 3', questionsCount: 13, poolTag: 'ielts-reading-passage3' },
                    ],
                },
                {
                    type: 'writing',
                    name: 'Writing',
                    timeLimitMinutes: 60,
                    tasks: [
                        { task: 1, minWords: 150, topics: [] },
                        { task: 2, minWords: 250, topics: [] },
                    ],
                },
                {
                    type: 'speaking',
                    name: 'Speaking',
                    part1Topics: [],
                    part2CueCards: [],
                    part3Topics: [],
                },
            ];
        }

        return [];
    }

    async getAll(query: GetExamTestsQuery): Promise<ExamTestListResult> {
        const filters: ExamTestListFilters = {
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined && { search: query.search }),
            ...(query.format !== undefined && { format: query.format }),
            ...(query.status !== undefined && { status: query.status }),
        };

        return examTestMongoRepository.findMany(filters);
    }

    async getById(id: string): Promise<IExamTest> {
        const examTest = await examTestMongoRepository.findById(id);

        if (!examTest) {
            throw new AppError('Không tìm thấy bài thi', HttpStatus.NOT_FOUND);
        }

        return examTest;
    }

    async create(data: CreateExamTestBody, adminId: string): Promise<IExamTest> {
        const latestVersion = await examTestMongoRepository.getLatestVersion(data.name, data.format);
        const settings: IExamTestSettings = {
            allowRetake: data.settings?.allowRetake ?? false,
            retakeCooldownDays: data.settings?.retakeCooldownDays ?? 30,
            ...(data.settings?.timeLimitOverrideMinutes !== undefined
                ? { timeLimitOverrideMinutes: data.settings.timeLimitOverrideMinutes }
                : {}),
        };

        const created = await examTestMongoRepository.create({
            name: data.name,
            format: data.format,
            languageId: new mongoose.Types.ObjectId(data.languageId),
            language: data.language,
            ...(data.description !== undefined ? { description: data.description } : {}),
            status: EExamTestStatus.DRAFT,
            version: latestVersion + 1,
            modules: data.modules ?? ExamTestService.buildDefaultModules(data.format),
            scoringConfig: data.scoringConfig ?? ExamTestService.buildDefaultScoringConfig(data.format),
            settings,
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IExamTest>);

        logger.info('ExamTest created', {
            testId: String(created._id),
            format: created.format,
            adminId,
        });

        return created;
    }

    async update(id: string, data: UpdateExamTestBody, adminId: string): Promise<IExamTest> {
        await this.getById(id);

        const payload: Partial<IExamTest> = {
            ...data,
            ...(data.languageId !== undefined ? { languageId: new mongoose.Types.ObjectId(data.languageId) } : {}),
            updatedBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IExamTest>;

        const updated = await examTestMongoRepository.updateById(id, payload);

        if (!updated) {
            throw new AppError('Cập nhật bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return updated;
    }

    async updateStatus(
        id: string,
        status: typeof EExamTestStatus[keyof typeof EExamTestStatus],
        adminId: string,
    ): Promise<IExamTest> {
        const existing = await this.getById(id);

        let nextVersion = existing.version;

        if (status === EExamTestStatus.ACTIVE) {
            await examTestMongoRepository.archiveActiveByNameFormat(existing.name, existing.format, id);

            if (existing.status !== EExamTestStatus.DRAFT) {
                nextVersion = (await examTestMongoRepository.getLatestVersion(existing.name, existing.format)) + 1;
            }
        }

        const updated = await examTestMongoRepository.updateById(id, {
            status,
            version: nextVersion,
            updatedBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IExamTest>);

        if (!updated) {
            throw new AppError('Cập nhật trạng thái bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('ExamTest status updated', {
            testId: id,
            status,
            adminId,
        });

        return updated;
    }

    async getVersionHistory(id: string): Promise<Partial<IExamTest>[]> {
        const existing = await this.getById(id);
        return examTestMongoRepository.findVersionHistory(existing.name, existing.format);
    }

    async rollback(id: string, version: number, adminId: string): Promise<IExamTest> {
        const current = await this.getById(id);
        const target = await examTestMongoRepository.findByNameFormatVersion(current.name, current.format, version);

        if (!target) {
            throw new AppError('Không tìm thấy phiên bản cần rollback', HttpStatus.NOT_FOUND);
        }

        const latestVersion = await examTestMongoRepository.getLatestVersion(target.name, target.format);

        const rollbackDraft = await examTestMongoRepository.create({
            name: target.name,
            format: target.format,
            languageId: target.languageId,
            language: target.language,
            ...(target.description ? { description: target.description } : {}),
            status: EExamTestStatus.DRAFT,
            version: latestVersion + 1,
            modules: target.modules,
            scoringConfig: target.scoringConfig,
            settings: target.settings,
            createdBy: new mongoose.Types.ObjectId(adminId),
            updatedBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IExamTest>);

        logger.info('ExamTest rollback created', {
            sourceTestId: id,
            sourceVersion: version,
            rollbackId: String(rollbackDraft._id),
            adminId,
        });

        return rollbackDraft;
    }

    async getAnalytics(id: string): Promise<Record<string, unknown>> {
        await this.getById(id);
        return {
            attempts: 0,
            completionRate: 0,
            averageScore: 0,
        };
    }

    async parseQuestions(rawText: string): Promise<Record<string, unknown>> {
        const lines = rawText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return {
            parsedCount: 0,
            questionItems: [],
            hints: ['Stub parser: integrate LLM parser in next phase'],
            linesReceived: lines.length,
        };
    }
}

export const examTestService = new ExamTestService();
