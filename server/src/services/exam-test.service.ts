import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import {
    EExamFormat,
    EExamScoringFramework,
    EExamTestKind,
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
import { ieltsPracticeAttemptMongoRepository } from '../repositories/mongo/ielts-practice-attempt.mongo.repository.js';
import type {
    CreateExamTestBody,
    GetExamTestsQuery,
    UpdateExamTestBody,
    CreateVersionBody,
} from '../validations/exam-test.validation.js';
import type { PublishValidationResult, PublishValidationError, TestDetailDto } from '../types/ielts-practice.types.js';
import { IeltsPracticeContentSchema } from '../validations/ielts-content.validation.js';
import { toTestDetailDto } from '../mappers/ielts-practice.mapper.js';

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

    // ─── Item count helper ─────────────────────────────────────────────────

    private static computeItemCount(content: Record<string, unknown> | undefined, questionType: string | undefined): number | undefined {
        if (!content || !questionType) return undefined;

        switch (questionType) {
            case 'form_completion': {
                const items = content.items;
                return Array.isArray(items) ? items.length : undefined;
            }
            case 'true_false_not_given': {
                const statements = content.statements;
                return Array.isArray(statements) ? statements.length : undefined;
            }
            case 'academic_task_1_chart':
                return 1;
            case 'ai_conversation':
                return 0;
            default:
                return undefined;
        }
    }

    // ─── Validation helpers ────────────────────────────────────────────────

    private validateSkillPracticeContent(
        content: Record<string, unknown>,
        skill: string,
    ): PublishValidationResult {
        const errors: PublishValidationError[] = [];

        // Validate against Zod schema
        const parsed = IeltsPracticeContentSchema.safeParse(content);

        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                errors.push({
                    path: `content.${issue.path.join('.')}`,
                    code: issue.code.toUpperCase(),
                    message: issue.message,
                });
            }
            return { valid: false, errors };
        }

        // Additional business validations per skill
        const questionType = content.questionType as string;

        if (skill === 'listening' || questionType === 'form_completion') {
            const items = content.items as Array<Record<string, unknown>> | undefined;
            if (!items || items.length < 1) {
                errors.push({
                    path: 'content.items',
                    code: 'INVALID_CARDINALITY',
                    message: 'Listening Form Completion cần ít nhất 1 item',
                });
            }
            if (!content.audioAssetId) {
                errors.push({
                    path: 'content.audioAssetId',
                    code: 'REQUIRED',
                    message: 'Audio asset là bắt buộc',
                });
            }
        }

        if (skill === 'reading' || questionType === 'true_false_not_given') {
            const passage = content.passage as string[] | undefined;
            if (!passage || passage.length === 0 || passage.every((p) => p.trim().length === 0)) {
                errors.push({
                    path: 'content.passage',
                    code: 'REQUIRED',
                    message: 'Passage không được để trống',
                });
            }
            const statements = content.statements as Array<Record<string, unknown>> | undefined;
            if (!statements || statements.length === 0) {
                errors.push({
                    path: 'content.statements',
                    code: 'REQUIRED',
                    message: 'Cần ít nhất một statement',
                });
            }
        }

        if (skill === 'writing' || questionType === 'academic_task_1_chart') {
            if (!content.imageAssetId) {
                errors.push({
                    path: 'content.imageAssetId',
                    code: 'REQUIRED',
                    message: 'Image asset là bắt buộc cho Writing Task 1',
                });
            }
        }

        if (skill === 'speaking' || questionType === 'ai_conversation') {
            if (!content.openingPrompt) {
                errors.push({
                    path: 'content.openingPrompt',
                    code: 'REQUIRED',
                    message: 'Opening prompt là bắt buộc',
                });
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // ─── CRUD ──────────────────────────────────────────────────────────────

    async getAll(query: GetExamTestsQuery): Promise<ExamTestListResult & { data: Array<Partial<IExamTest> & { attemptCount?: number }> }> {
        const filters: ExamTestListFilters = {
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined && { search: query.search }),
            ...(query.format !== undefined && { format: query.format }),
            ...(query.kind !== undefined && { kind: query.kind }),
            ...(query.status !== undefined && { status: query.status }),
            ...(query.skill !== undefined && { skill: query.skill }),
        };

        const result = await examTestMongoRepository.findMany(filters);

        // Batch-load attempt counts for skill-practice tests
        const skillPracticeTests = result.data.filter((t) => t.kind === 'skill_practice');
        if (skillPracticeTests.length > 0) {
            const testIds = skillPracticeTests.map((t) => String(t._id));
            const counts = await ieltsPracticeAttemptMongoRepository.countByExamTestIds(testIds);
            const countMap = new Map(counts.map((c) => [c.examTestId, c.count]));
            for (const test of result.data) {
                (test as Record<string, unknown>).attemptCount = countMap.get(String(test._id)) ?? 0;
            }
        }

        return result as ExamTestListResult & { data: Array<Partial<IExamTest> & { attemptCount?: number }> };
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

        const kind = data.kind ?? EExamTestKind.FULL_EXAM;

        // Generate logicalTestId for skill-practice
        const logicalTestId = kind === EExamTestKind.SKILL_PRACTICE
            ? new mongoose.Types.ObjectId()
            : undefined;

        const created = await examTestMongoRepository.create({
            name: data.name,
            format: data.format,
            kind,
            ...(kind === EExamTestKind.SKILL_PRACTICE && data.slug ? { slug: data.slug } : {}),
            ...(logicalTestId ? { logicalTestId } : {}),
            languageId: new mongoose.Types.ObjectId(data.languageId),
            language: data.language,
            ...(data.description !== undefined ? { description: data.description } : {}),
            status: EExamTestStatus.DRAFT,
            version: latestVersion + 1,
            ...(data.skill !== undefined ? { skill: data.skill } : {}),
            ...(data.content !== undefined ? {
                content: data.content,
                questionType: data.content.questionType,
                itemCount: ExamTestService.computeItemCount(data.content, data.content.questionType),
            } : {}),
            ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
            modules: data.modules ?? ExamTestService.buildDefaultModules(data.format),
            scoringConfig: data.scoringConfig ?? ExamTestService.buildDefaultScoringConfig(data.format),
            settings,
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IExamTest>);

        logger.info('ExamTest created', {
            testId: String(created._id),
            format: created.format,
            kind: created.kind,
            adminId,
        });

        return created;
    }

    async update(id: string, data: UpdateExamTestBody, adminId: string): Promise<IExamTest> {
        const existing = await this.getById(id);

        // Reject update on non-draft skill-practice
        if (existing.kind === EExamTestKind.SKILL_PRACTICE && existing.status !== EExamTestStatus.DRAFT) {
            throw new AppError(
                'Không thể sửa đề đã active/paused/archived. Hãy tạo version mới.',
                HttpStatus.CONFLICT,
                { errorCode: 'VERSION_REQUIRED' } as Record<string, unknown>,
            );
        }

        const payload: Record<string, unknown> = {
            ...data,
            ...(data.languageId !== undefined ? { languageId: new mongoose.Types.ObjectId(data.languageId) } : {}),
            updatedBy: new mongoose.Types.ObjectId(adminId),
        };

        // If content is updated, sync questionType + itemCount
        if (data.content) {
            payload.questionType = data.content.questionType;
            payload.itemCount = ExamTestService.computeItemCount(data.content, data.content.questionType);
        }

        // If slug changed, verify it's unique among active of same logicalTestId
        if (data.slug && data.slug !== existing.slug) {
            const existingWithSlug = await examTestMongoRepository.findActiveBySlug(data.slug);
            if (existingWithSlug && String(existingWithSlug._id) !== id) {
                throw new AppError('Slug đã được sử dụng bởi đề khác', HttpStatus.CONFLICT);
            }
        }

        const updated = await examTestMongoRepository.updateById(id, payload as Partial<IExamTest>);

        if (!updated) {
            throw new AppError('Cập nhật bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return updated;
    }

    async delete(id: string, adminId: string): Promise<IExamTest> {
        const existing = await this.getById(id);

        if (existing.status === EExamTestStatus.ARCHIVED) {
            // Idempotent: already archived, just return
            return existing;
        }

        const deleted = await examTestMongoRepository.softDelete(id);

        if (!deleted) {
            throw new AppError('Xóa bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('ExamTest soft-deleted (archived)', {
            testId: id,
            adminId,
        });

        return deleted;
    }

    async hardDelete(id: string, adminId: string): Promise<{ id: string; deleted: true }> {
        const existing = await this.getById(id);

        if (
            existing.status !== EExamTestStatus.DRAFT
            && existing.status !== EExamTestStatus.ARCHIVED
        ) {
            throw new AppError(
                'Chỉ có thể xoá vĩnh viễn đề draft hoặc archived',
                HttpStatus.CONFLICT,
            );
        }

        const attemptCount = await ieltsPracticeAttemptMongoRepository.countByExamTestId(id);
        if (attemptCount > 0) {
            throw new AppError(
                'Không thể xoá vĩnh viễn đề đã có lượt làm. Hãy lưu trữ đề.',
                HttpStatus.CONFLICT,
            );
        }

        const deleted = await examTestMongoRepository.hardDelete(id);
        if (!deleted) {
            throw new AppError('Xoá bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('ExamTest hard-deleted', {
            testId: id,
            adminId,
        });

        return { id, deleted: true };
    }

    // ─── Status management ──────────────────────────────────────────────────

    async updateStatus(
        id: string,
        status: typeof EExamTestStatus[keyof typeof EExamTestStatus],
        adminId: string,
    ): Promise<IExamTest> {
        const existing = await this.getById(id);

        // Validate state transitions
        if (existing.status === EExamTestStatus.ARCHIVED && status !== EExamTestStatus.DRAFT) {
            throw new AppError('Không thể thay đổi trạng thái của đề đã archived', HttpStatus.CONFLICT);
        }

        // For publish (draft/active → active)
        if (status === EExamTestStatus.ACTIVE) {
            // Run full validation
            if (existing.kind === EExamTestKind.SKILL_PRACTICE && existing.content && existing.skill) {
                const validation = this.validateSkillPracticeContent(existing.content, existing.skill);
                if (!validation.valid) {
                    throw new AppError('Nội dung chưa đủ điều kiện publish', HttpStatus.UNPROCESSABLE_ENTITY, {
                        errorCode: 'PUBLISH_VALIDATION_FAILED',
                        errors: validation.errors,
                    } as Record<string, unknown>);
                }
            }

            // Archive any active version of the same logical test
            if (existing.logicalTestId) {
                const activeLogicalId = String(existing.logicalTestId);
                await examTestMongoRepository.updateMany(
                    {
                        logicalTestId: new mongoose.Types.ObjectId(activeLogicalId),
                        status: EExamTestStatus.ACTIVE,
                        _id: { $ne: new mongoose.Types.ObjectId(id) },
                    },
                    { $set: { status: EExamTestStatus.ARCHIVED } },
                );
            } else {
                // Legacy: archive by name+format
                await examTestMongoRepository.archiveActiveByNameFormat(existing.name, existing.format, id);
            }

            const now = new Date();
            const updated = await examTestMongoRepository.updateById(id, {
                status: EExamTestStatus.ACTIVE,
                publishedAt: existing.publishedAt ?? now,
                updatedBy: new mongoose.Types.ObjectId(adminId),
            } as Partial<IExamTest>);

            if (!updated) {
                throw new AppError('Cập nhật trạng thái bài thi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            logger.info('ExamTest published', {
                testId: id,
                kind: existing.kind,
                adminId,
            });

            return updated;
        }

        // For pause/archive
        const updated = await examTestMongoRepository.updateById(id, {
            status,
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

    // ─── Version operations ────────────────────────────────────────────────

    async getVersionHistory(id: string): Promise<Partial<IExamTest>[]> {
        const existing = await this.getById(id);

        if (existing.logicalTestId) {
            return examTestMongoRepository.findVersionsByLogicalTestId(String(existing.logicalTestId));
        }

        return examTestMongoRepository.findVersionHistory(existing.name, existing.format);
    }

    async createVersion(id: string, body: CreateVersionBody, adminId: string): Promise<IExamTest> {
        const existing = await this.getById(id);

        // Only active/paused can be versioned (create new draft from)
        if (existing.status !== EExamTestStatus.ACTIVE && existing.status !== EExamTestStatus.PAUSED) {
            throw new AppError(
                'Chỉ có thể tạo version từ đề active hoặc paused',
                HttpStatus.CONFLICT,
            );
        }

        const logicalTestId = existing.logicalTestId
            ? String(existing.logicalTestId)
            : undefined;

        // Check if there's already a draft for this logical test
        if (logicalTestId) {
            const existingDraft = await examTestMongoRepository.findLatestDraftByLogicalTestId(logicalTestId);
            if (existingDraft) {
                throw new AppError(
                    'Đã có bản draft cho đề này. Vui lòng sửa hoặc xóa draft trước.',
                    HttpStatus.CONFLICT,
                    { errorCode: 'DRAFT_VERSION_EXISTS' } as Record<string, unknown>,
                );
            }
        }

        const nextVersion = logicalTestId
            ? (await examTestMongoRepository.getLatestVersionByLogicalTestId(logicalTestId)) + 1
            : (await examTestMongoRepository.getLatestVersion(existing.name, existing.format)) + 1;

        // Build the new draft
        const patch = body?.patch ?? {};

        const newDraftData: Record<string, unknown> = {
            name: existing.name,
            format: existing.format,
            kind: existing.kind,
            languageId: existing.languageId,
            language: existing.language,
            status: EExamTestStatus.DRAFT,
            version: nextVersion,
            modules: existing.modules,
            scoringConfig: existing.scoringConfig,
            settings: existing.settings,
            createdBy: new mongoose.Types.ObjectId(adminId),
            updatedBy: new mongoose.Types.ObjectId(adminId),
        };

        // Conditionally include optional fields
        if (logicalTestId) {
            newDraftData.logicalTestId = new mongoose.Types.ObjectId(logicalTestId);
        }
        if (existing.slug) {
            newDraftData.slug = existing.slug;
        }
        if (existing.description) {
            newDraftData.description = existing.description;
        }
        if (existing.skill) {
            newDraftData.skill = existing.skill;
        }
        if (existing.questionType) {
            newDraftData.questionType = existing.questionType;
        }
        if (existing.durationMinutes) {
            newDraftData.durationMinutes = existing.durationMinutes;
        }
        if (existing.content) {
            newDraftData.content = existing.content;
        }

        // Apply optional patch (deep merge)
        if (Object.keys(patch).length > 0) {
            Object.assign(newDraftData, patch);
        }

        const created = await examTestMongoRepository.create(newDraftData);

        logger.info('ExamTest version created', {
            sourceTestId: id,
            newVersion: nextVersion,
            adminId,
        });

        return created;
    }

    async rollback(id: string, version: number, adminId: string): Promise<IExamTest> {
        const current = await this.getById(id);

        let target: IExamTest | null;

        if (current.logicalTestId) {
            target = await examTestMongoRepository.findOne({
                logicalTestId: current.logicalTestId,
                version,
            } as Record<string, unknown>) as unknown as IExamTest | null;
        } else {
            target = await examTestMongoRepository.findByNameFormatVersion(
                current.name,
                current.format,
                version,
            );
        }

        if (!target) {
            throw new AppError('Không tìm thấy phiên bản cần rollback', HttpStatus.NOT_FOUND);
        }

        // Use create-version logic to create a new draft from the target
        const nextVersion = await examTestMongoRepository.getLatestVersionByLogicalTestId(
            String(target.logicalTestId),
        );

        const newVersion = nextVersion + 1;

        const rollbackData: Record<string, unknown> = {
            name: target.name,
            format: target.format,
            kind: target.kind,
            languageId: target.languageId,
            language: target.language,
            status: EExamTestStatus.DRAFT,
            version: newVersion,
            modules: target.modules,
            scoringConfig: target.scoringConfig,
            settings: target.settings,
            createdBy: new mongoose.Types.ObjectId(adminId),
            updatedBy: new mongoose.Types.ObjectId(adminId),
        };

        if (target.logicalTestId) {
            rollbackData.logicalTestId = new mongoose.Types.ObjectId(String(target.logicalTestId));
        }
        if (target.slug) {
            rollbackData.slug = target.slug;
        }
        if (target.description) {
            rollbackData.description = target.description;
        }
        if (target.skill) {
            rollbackData.skill = target.skill;
        }
        if (target.questionType) {
            rollbackData.questionType = target.questionType;
        }
        if (target.durationMinutes) {
            rollbackData.durationMinutes = target.durationMinutes;
        }
        if (target.content) {
            rollbackData.content = target.content;
        }

        const rollbackDraft = await examTestMongoRepository.create(rollbackData as Partial<IExamTest>);

        logger.info('ExamTest rollback created', {
            sourceTestId: id,
            sourceVersion: version,
            targetVersion: newVersion,
            rollbackId: String(rollbackDraft._id),
            adminId,
        });

        return rollbackDraft;
    }

    // ─── Admin preview ────────────────────────────────────────────────────

    async getPreview(id: string): Promise<TestDetailDto> {
        const existing = await this.getById(id);

        if (existing.kind !== EExamTestKind.SKILL_PRACTICE) {
            throw new AppError('Preview chỉ hỗ trợ skill-practice', HttpStatus.BAD_REQUEST);
        }

        return toTestDetailDto(existing);
    }

    // ─── Publish validation ────────────────────────────────────────────────

    async validatePublish(id: string): Promise<PublishValidationResult> {
        const existing = await this.getById(id);

        if (existing.kind !== EExamTestKind.SKILL_PRACTICE || !existing.skill) {
            return { valid: true, errors: [] };
        }

        const errors: PublishValidationError[] = [];

        // Slug presence check
        if (!existing.slug) {
            errors.push({ path: 'slug', code: 'REQUIRED', message: 'Slug là bắt buộc để publish' });
        }

        if (!existing.content) {
            errors.push({ path: 'content', code: 'REQUIRED', message: 'Content là bắt buộc' });
            return { valid: false, errors };
        }

        if (!existing.durationMinutes) {
            errors.push({ path: 'durationMinutes', code: 'REQUIRED', message: 'Thời lượng là bắt buộc' });
        }

        // Content structure validation
        const contentErrors = this.validateSkillPracticeContent(existing.content, existing.skill);
        errors.push(...contentErrors.errors);

        // Media validation (AC-24): check asset IDs exist
        const content = existing.content as Record<string, unknown>;
        const questionType = existing.questionType;

        if (questionType === 'form_completion') {
            const audioId = content.audioAssetId as string | undefined;
            if (!audioId || audioId.trim().length === 0) {
                errors.push({ path: 'content.audioAssetId', code: 'MEDIA_REQUIRED', message: 'Audio asset là bắt buộc' });
            }
        }

        if (questionType === 'academic_task_1_chart') {
            const imageId = content.imageAssetId as string | undefined;
            if (!imageId || imageId.trim().length === 0) {
                errors.push({ path: 'content.imageAssetId', code: 'MEDIA_REQUIRED', message: 'Image asset là bắt buộc' });
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // ─── Analytics ─────────────────────────────────────────────────────────

    async getAnalytics(id: string): Promise<Record<string, unknown>> {
        await this.getById(id);

        const agg = await ieltsPracticeAttemptMongoRepository.getAggregateAnalytics(id);
        const completionRate = agg.totalAttempts > 0
            ? agg.completedAttempts / agg.totalAttempts
            : 0;

        return {
            totalAttempts: agg.totalAttempts,
            completedAttempts: agg.completedAttempts,
            completionRate: Math.round(completionRate * 10000) / 10000,
            averageDurationSeconds: agg.averageDurationSeconds,
            averageNormalizedScore: Math.round(agg.averageNormalizedScore * 10000) / 10000,
            gradingFailed: 0,
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

    // ─── Learner-facing methods ────────────────────────────────────────────

    async getActiveTestBySlug(slug: string): Promise<IExamTest> {
        const test = await examTestMongoRepository.findActiveBySlug(slug);

        if (!test) {
            throw new AppError('Không tìm thấy đề', HttpStatus.NOT_FOUND);
        }

        return test;
    }

    async getActiveTestsBySkill(
        skill: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
    ): Promise<ExamTestListResult> {
        return examTestMongoRepository.findActiveBySkill(skill, page, limit, search);
    }

    async getSkillSummaries(): Promise<Array<{ skill: string; activeTests: number }>> {
        const results = await examTestMongoRepository.countActiveGroupedBySkill();
        const allSkills = ['listening', 'reading', 'writing', 'speaking'];
        const countMap = new Map(results.map((r) => [r._id, r.count]));

        return allSkills.map((skill) => ({
            skill,
            activeTests: countMap.get(skill) ?? 0,
        }));
    }
}

export const examTestService = new ExamTestService();
