import mongoose from 'mongoose';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { ieltsPracticeAttemptMongoRepository } from '../repositories/mongo/ielts-practice-attempt.mongo.repository.js';
import { examTestMongoRepository } from '../repositories/mongo/exam-test.mongo.repository.js';
import { toTestDetailDto } from '../mappers/ielts-practice.mapper.js';
import { gradeObjective, gradeWritingWithAi, gradingQueueAdapter } from './ielts-grading.service.js';
import { buildIdempotencyKey, tryClaimIdempotency, setIdempotencyResponse } from '../utils/idempotency.js';
import { isSkillEnabled } from '../utils/feature-flags.js';
import type { IExamTest } from '../models/mongo/exam-test.model.js';
import type { IIeltsPracticeAttempt } from '../models/mongo/ielts-practice-attempt.model.js';
import type {
    AttemptStartResponse,
    AttemptSaveResponse,
    AttemptSubmitResponse,
    ObjectiveResult,
    ObjectiveResultDetail,
    AiResult,
    GradingResult,
    TestDetailDto,
} from '../types/ielts-practice.types.js';
import type { SaveDraftBody, StartAttemptBody, SubmitAttemptBody } from '../validations/ielts-attempt.validation.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDefaultDraft(skill: string): Record<string, unknown> {
    switch (skill) {
        case 'listening':
            return { answers: {}, flaggedItemIds: [] };
        case 'reading':
            return { answers: {}, flaggedItemIds: [] };
        case 'writing':
            return { essay: '', wordCount: 0 };
        case 'speaking':
            return { transcriptSegments: [], audioAssetIds: [] };
        default:
            return {};
    }
}

function calculateWordCount(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    return text.trim().split(/\s+/).length;
}

function toAttemptResponse(
    attempt: IIeltsPracticeAttempt,
    test: TestDetailDto,
    resumed: boolean,
): AttemptStartResponse {
    return {
        attemptId: String(attempt._id),
        testId: String(attempt.examTestId),
        testVersion: attempt.examVersion,
        skill: attempt.skill as AttemptStartResponse['skill'],
        questionType: attempt.questionType as AttemptStartResponse['questionType'],
        status: attempt.result ? 'graded' : attempt.status,
        startedAt: attempt.startedAt.toISOString(),
        deadlineAt: attempt.deadlineAt.toISOString(),
        revision: attempt.revision,
        draft: attempt.draft,
        test,
        resumed,
        ...(attempt.submittedAt ? { submittedAt: attempt.submittedAt.toISOString() } : {}),
        ...(attempt.lastSavedAt ? { lastSavedAt: attempt.lastSavedAt.toISOString() } : {}),
        ...(attempt.result ? { result: attempt.result as unknown as GradingResult } : {}),
    };
}

function buildResultDetails(attempt: IIeltsPracticeAttempt): ObjectiveResultDetail[] {
    if (!attempt.result || attempt.result.gradingType !== 'objective') return [];

    const content = attempt.contentSnapshot ?? {};
    const answers = (attempt.draft.answers ?? {}) as Record<string, string>;
    const itemResults = (attempt.result.itemResults ?? []) as Array<{ itemId: string; correct: boolean }>;
    const resultById = new Map(itemResults.map((item) => [item.itemId, item.correct]));

    if (attempt.questionType === 'form_completion') {
        const items = (content.items ?? []) as Array<{
            id: string;
            order: number;
            before: string;
            after: string;
            acceptedAnswers: string[];
        }>;

        return items.map((item) => ({
            itemId: item.id,
            order: item.order,
            prompt: `${item.before} ____ ${item.after}`.replace(/\s+/g, ' ').trim(),
            learnerAnswer: answers[item.id] ?? '',
            correctAnswers: item.acceptedAnswers ?? [],
            correct: resultById.get(item.id) ?? false,
        }));
    }

    if (attempt.questionType === 'true_false_not_given') {
        const statements = (content.statements ?? []) as Array<{
            id: string;
            order: number;
            text: string;
            correctAnswer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
            explanation?: string;
        }>;

        return statements.map((statement) => ({
            itemId: statement.id,
            order: statement.order,
            prompt: statement.text,
            learnerAnswer: answers[statement.id] ?? '',
            correctAnswers: [statement.correctAnswer],
            correct: resultById.get(statement.id) ?? false,
            ...(statement.explanation ? { explanation: statement.explanation } : {}),
        }));
    }

    return [];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class IeltsAttemptService {
    /**
     * Start a fresh attempt. Any existing in-progress attempt for the same test is abandoned first.
     */
    async startAttempt(
        testId: string,
        userId: string,
        idempotencyKey: string,
        _body: StartAttemptBody,
    ): Promise<AttemptStartResponse> {
        // ── Idempotency ──────────────────────────────────────────────────────
        const idKey = buildIdempotencyKey(userId, 'start-attempt', idempotencyKey);
        const cached = await tryClaimIdempotency<AttemptStartResponse>(idKey);
        if (cached) return cached;

        // ── Fetch test ───────────────────────────────────────────────────────
        const test = await examTestMongoRepository.findById(testId);
        if (!test) {
            throw new AppError('Không tìm thấy đề', HttpStatus.NOT_FOUND, {
                errorCode: 'TEST_NOT_AVAILABLE',
            } as Record<string, unknown>);
        }

        if (test.status !== 'active') {
            throw new AppError('Đề không còn khả dụng', HttpStatus.NOT_FOUND, {
                errorCode: 'TEST_NOT_AVAILABLE',
            } as Record<string, unknown>);
        }

        if (test.kind !== 'skill_practice') {
            throw new AppError('Đề không phải IELTS Practice', HttpStatus.BAD_REQUEST);
        }

        // Feature flag check (Phase 5)
        if (test.skill && !isSkillEnabled(test.skill as import('../types/ielts-practice.types.js').IeltsSkill)) {
            throw new AppError('Kỹ năng này chưa được kích hoạt', HttpStatus.NOT_FOUND, {
                errorCode: 'TEST_NOT_AVAILABLE',
            } as Record<string, unknown>);
        }

        const skill = test.skill!;
        const questionType = test.questionType!;
        const durationMinutes = test.durationMinutes ?? 30;

        // ── Discard existing in-progress attempt ────────────────────────────
        if (test.logicalTestId) {
            const existing = await ieltsPracticeAttemptMongoRepository.findInProgress(
                userId,
                String(test.logicalTestId),
            );

            if (existing) {
                await ieltsPracticeAttemptMongoRepository.abandonAttempt(String(existing._id));
            }
        }

        // ── Create new attempt ───────────────────────────────────────────────
        const now = new Date();
        const deadlineAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

        // Create full content snapshot with answer keys
        const contentSnapshot = { ...test.content } as Record<string, unknown>;
        const defaultDraft = getDefaultDraft(skill);

        const createData: {
            userId: string;
            examTestId: string;
            logicalTestId?: string;
            examVersion: number;
            skill: string;
            questionType: string;
            contentSnapshot: Record<string, unknown>;
            draft: Record<string, unknown>;
            startedAt: Date;
            deadlineAt: Date;
        } = {
            userId,
            examTestId: testId,
            examVersion: test.version,
            skill,
            questionType,
            contentSnapshot,
            draft: defaultDraft,
            startedAt: now,
            deadlineAt,
        };

        if (test.logicalTestId) {
            createData.logicalTestId = String(test.logicalTestId);
        }

        const created = await ieltsPracticeAttemptMongoRepository.createAttempt(createData);

        const testDto = toTestDetailDto(test);
        const response = toAttemptResponse(created as IIeltsPracticeAttempt, testDto, false);

        await setIdempotencyResponse(idKey, response);

        logger.info('IELTS attempt started', {
            attemptId: String(created._id),
            testId,
            userId,
            skill,
        });

        return response;
    }

    /**
     * Get attempt detail (for resume/reload).
     */
    async getAttempt(attemptId: string, userId: string): Promise<AttemptStartResponse> {
        const attempt = await ieltsPracticeAttemptMongoRepository.findByIdSecure(attemptId, userId);

        if (!attempt) {
            throw new AppError('Không tìm thấy lượt làm bài', HttpStatus.NOT_FOUND, {
                errorCode: 'ATTEMPT_NOT_FOUND',
            } as Record<string, unknown>);
        }

        // Fetch the test detail to include redacted content
        const test = await examTestMongoRepository.findById(String(attempt.examTestId));
        const testDto = test ? toTestDetailDto(test) : ({} as TestDetailDto);

        return toAttemptResponse(attempt, testDto, false);
    }

    /**
     * Save draft (autosave) with revision-based optimistic concurrency.
     */
    async saveDraft(
        attemptId: string,
        userId: string,
        body: SaveDraftBody,
    ): Promise<AttemptSaveResponse> {
        const attempt = await ieltsPracticeAttemptMongoRepository.findByIdSecure(attemptId, userId);

        if (!attempt) {
            throw new AppError('Không tìm thấy lượt làm bài', HttpStatus.NOT_FOUND, {
                errorCode: 'ATTEMPT_NOT_FOUND',
            } as Record<string, unknown>);
        }

        // Check attempt state
        if (attempt.status !== 'in_progress') {
            const errorCode = attempt.status === 'expired' ? 'ATTEMPT_EXPIRED' : 'ATTEMPT_LOCKED';
            throw new AppError(
                attempt.status === 'expired'
                    ? 'Lượt làm bài đã hết thời gian'
                    : 'Lượt làm bài đã được nộp hoặc bỏ qua',
                HttpStatus.CONFLICT,
                { errorCode } as Record<string, unknown>,
            );
        }

        // Check expiry
        if (new Date() > attempt.deadlineAt) {
            // Auto-expire
            await ieltsPracticeAttemptMongoRepository.expireOverdue(new Date());
            throw new AppError('Lượt làm bài đã hết thời gian', HttpStatus.CONFLICT, {
                errorCode: 'ATTEMPT_EXPIRED',
            } as Record<string, unknown>);
        }

        const expectedRevision = body.revision;

        // Build draft object based on skill
        let draft: Record<string, unknown>;
        let flaggedItemIds: string[];

        switch (body.skill) {
            case 'listening':
                draft = { answers: body.answers ?? {}, flaggedItemIds: body.flaggedItemIds ?? [] };
                flaggedItemIds = body.flaggedItemIds ?? [];
                break;
            case 'reading':
                draft = { answers: body.answers ?? {}, flaggedItemIds: body.flaggedItemIds ?? [] };
                flaggedItemIds = body.flaggedItemIds ?? [];
                break;
            case 'writing': {
                const essay = body.essay ?? '';
                draft = { essay, wordCount: calculateWordCount(essay) };
                flaggedItemIds = [];
                break;
            }
            case 'speaking':
                draft = {
                    transcriptSegments: body.transcriptSegments ?? [],
                    audioAssetIds: body.audioAssetIds ?? [],
                };
                flaggedItemIds = [];
                break;
            default:
                draft = body as unknown as Record<string, unknown>;
                flaggedItemIds = [];
        }

        // Atomic conditional update
        const updated = await ieltsPracticeAttemptMongoRepository.saveDraftIfRevision(
            attemptId,
            expectedRevision,
            draft,
            flaggedItemIds,
        );

        if (!updated) {
            // Revision conflict or state changed — get current state
            const current = await ieltsPracticeAttemptMongoRepository.getCurrentDraft(attemptId);

            if (!current) {
                throw new AppError('Không tìm thấy lượt làm bài', HttpStatus.NOT_FOUND, {
                    errorCode: 'ATTEMPT_NOT_FOUND',
                } as Record<string, unknown>);
            }

            throw new AppError(
                'Bản nháp đã thay đổi trên thiết bị khác',
                HttpStatus.CONFLICT,
                {
                    errorCode: 'REVISION_CONFLICT',
                    latestRevision: current.revision,
                    latestDraft: current.draft,
                    savedAt: current.lastSavedAt?.toISOString() ?? new Date().toISOString(),
                } as Record<string, unknown>,
            );
        }

        return {
            attemptId,
            revision: updated.revision,
            savedAt: updated.lastSavedAt?.toISOString() ?? new Date().toISOString(),
        };
    }

    /**
     * Submit attempt. Performs objective grading for Listening/Reading.
     */
    async submitAttempt(
        attemptId: string,
        userId: string,
        idempotencyKey: string,
        body: SubmitAttemptBody,
    ): Promise<AttemptSubmitResponse> {
        // Idempotency
        const idKey = buildIdempotencyKey(userId, 'submit-attempt', idempotencyKey);
        const cached = await tryClaimIdempotency<AttemptSubmitResponse>(idKey);
        if (cached) return cached;

        // Fetch with snapshot for grading
        const attempt = await ieltsPracticeAttemptMongoRepository.findByIdSecure(attemptId, userId);

        if (!attempt) {
            throw new AppError('Không tìm thấy lượt làm bài', HttpStatus.NOT_FOUND, {
                errorCode: 'ATTEMPT_NOT_FOUND',
            } as Record<string, unknown>);
        }

        // Check state
        if (attempt.status !== 'in_progress') {
            if (attempt.status === 'submitted' || attempt.status === 'expired') {
                // Return existing result idempotently
                const response: AttemptSubmitResponse = {
                    attemptId,
                    status: attempt.result ? 'graded' : attempt.status as AttemptSubmitResponse['status'],
                    submittedAt: attempt.submittedAt?.toISOString() ?? attempt.updatedAt.toISOString(),
                };

                if (attempt.result?.gradingType === 'objective' || attempt.result?.gradingType === 'ai') {
                    response.result = attempt.result as unknown as GradingResult;
                }

                await setIdempotencyResponse(idKey, response);
                return response;
            }

            throw new AppError('Lượt làm bài đã được nộp hoặc bỏ qua', HttpStatus.CONFLICT, {
                errorCode: 'ATTEMPT_LOCKED',
            } as Record<string, unknown>);
        }

        // Check expiry
        const now = new Date();
        if (now > attempt.deadlineAt) {
            await ieltsPracticeAttemptMongoRepository.submitAttempt(
                attemptId,
                now,
                attempt.deadlineAt,
                body.revision,
            );
            throw new AppError('Lượt làm bài đã hết thời gian', HttpStatus.CONFLICT, {
                errorCode: 'ATTEMPT_EXPIRED',
            } as Record<string, unknown>);
        }

        // Fetch full snapshot for grading
        const fullAttempt = await ieltsPracticeAttemptMongoRepository.findByIdWithSnapshot(attemptId);
        if (!fullAttempt || !fullAttempt.contentSnapshot) {
            throw new AppError('Không thể đọc dữ liệu chấm bài', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Perform objective grading for Listening/Reading or AI grading for Writing
        const objectiveResult = gradeObjective({
            skill: fullAttempt.skill,
            questionType: fullAttempt.questionType,
            contentSnapshot: fullAttempt.contentSnapshot,
            draft: fullAttempt.draft,
        });
        let aiResult: AiResult | null = null;

        if (fullAttempt.skill === 'writing') {
            const essay = String(fullAttempt.draft.essay ?? '').trim();
            if (!essay) {
                throw new AppError('Bạn chưa viết bài để nộp', HttpStatus.UNPROCESSABLE_ENTITY, {
                    errorCode: 'EMPTY_SUBMISSION',
                } as Record<string, unknown>);
            }

            const content = fullAttempt.contentSnapshot;
            aiResult = await gradeWritingWithAi({
                prompt: String(content.prompt ?? ''),
                instruction: String(content.instruction ?? ''),
                imageUrl: String(content.imageAssetId ?? ''),
                imageAlt: String(content.imageAlt ?? ''),
                essay,
                minWords: Number(content.minWords ?? 150),
            });
        }
        const gradingResult = objectiveResult ?? aiResult ?? undefined;

        // Submit
        const updated = await ieltsPracticeAttemptMongoRepository.submitAttempt(
            attemptId,
            now,
            attempt.deadlineAt,
            body.revision,
            gradingResult as Record<string, unknown> | undefined,
        );

        if (!updated) {
            throw new AppError('Không thể nộp bài do xung đột revision', HttpStatus.CONFLICT, {
                errorCode: 'UNSAVED_REVISION',
            } as Record<string, unknown>);
        }

        // Speaking — use queue adapter (no-op in MVP)
        if (fullAttempt.skill === 'speaking') {
            await gradingQueueAdapter.enqueue(fullAttempt);
        }

        const response: AttemptSubmitResponse = {
            attemptId,
            status: gradingResult ? 'graded' : 'submitted',
            submittedAt: now.toISOString(),
        };

        if (gradingResult) {
            response.result = gradingResult;
        } else {
            response.grading = 'not_available';
        }

        await setIdempotencyResponse(idKey, response);

        logger.info('IELTS attempt submitted', {
            attemptId,
            userId,
            skill: fullAttempt.skill,
            status: response.status,
            correct: objectiveResult?.correct,
            total: objectiveResult?.total,
        });

        return response;
    }

    /**
     * Abandon attempt (idempotent, in_progress → abandoned).
     */
    async abandonAttempt(attemptId: string, userId: string): Promise<void> {
        const attempt = await ieltsPracticeAttemptMongoRepository.findByIdSecure(attemptId, userId);

        if (!attempt) {
            throw new AppError('Không tìm thấy lượt làm bài', HttpStatus.NOT_FOUND, {
                errorCode: 'ATTEMPT_NOT_FOUND',
            } as Record<string, unknown>);
        }

        if (attempt.status !== 'in_progress') {
            // Idempotent: already abandoned/submitted
            return;
        }

        await ieltsPracticeAttemptMongoRepository.abandonAttempt(attemptId);

        logger.info('IELTS attempt abandoned', {
            attemptId,
            userId,
        });
    }

    /**
     * Get attempt result (for result screen).
     */
    async getAttemptResult(attemptId: string, userId: string): Promise<{
        status: string;
        submittedAt?: string;
        result?: (ObjectiveResult & { details: ObjectiveResultDetail[] }) | AiResult;
        grading?: 'not_available';
    }> {
        const attempt = await ieltsPracticeAttemptMongoRepository.findByIdSecureWithSnapshot(attemptId, userId);

        if (!attempt) {
            throw new AppError('Không tìm thấy kết quả', HttpStatus.NOT_FOUND, {
                errorCode: 'ATTEMPT_NOT_FOUND',
            } as Record<string, unknown>);
        }

        if (attempt.status === 'in_progress') {
            throw new AppError('Bài làm chưa được nộp', HttpStatus.BAD_REQUEST);
        }

        const ret: {
            status: string;
            submittedAt?: string;
            result?: (ObjectiveResult & { details: ObjectiveResultDetail[] }) | AiResult;
            grading?: 'not_available';
        } = {
            status: attempt.result ? 'graded' : attempt.status,
        };

        if (attempt.submittedAt) {
            ret.submittedAt = attempt.submittedAt.toISOString();
        }

        if (attempt.result?.gradingType === 'objective') {
            ret.result = {
                gradingType: attempt.result.gradingType,
                correct: attempt.result.correct as number,
                total: attempt.result.total as number,
                normalizedScore: attempt.result.normalizedScore as number,
                itemResults: attempt.result.itemResults as Array<{ itemId: string; correct: boolean }>,
                details: buildResultDetails(attempt),
            };
        } else if (attempt.result?.gradingType === 'ai') {
            ret.result = attempt.result as unknown as AiResult;
        } else if (attempt.skill === 'writing' || attempt.skill === 'speaking') {
            ret.grading = 'not_available';
        }

        return ret;
    }

    /**
     * Expire overdue attempts (called periodically or on demand).
     */
    async expireOverdueAttempts(): Promise<number> {
        return ieltsPracticeAttemptMongoRepository.expireOverdue(new Date());
    }
}

export const ieltsAttemptService = new IeltsAttemptService();
