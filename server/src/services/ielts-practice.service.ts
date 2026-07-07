import { examTestService } from './exam-test.service.js';
import { examTestMongoRepository } from '../repositories/mongo/exam-test.mongo.repository.js';
import { ieltsPracticeAttemptMongoRepository } from '../repositories/mongo/ielts-practice-attempt.mongo.repository.js';
import { toTestDetailDto } from '../mappers/ielts-practice.mapper.js';
import { isSkillEnabled, isSkillAvailable } from '../utils/feature-flags.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import type { IIeltsPracticeAttempt } from '../models/mongo/ielts-practice-attempt.model.js';
import type {
    LearnerAttemptScoreDto,
    LearnerTestStatsDto,
    TestSummaryDto,
    TestDetailDto,
    SkillSummaryDto,
    IeltsHubSummaryDto,
    IeltsSkill,
} from '../types/ielts-practice.types.js';

function buildScoreLabel(result: Record<string, unknown> | undefined): string | undefined {
    if (!result) return undefined;

    if (result.gradingType === 'objective') {
        const correct = Number(result.correct ?? 0);
        const total = Number(result.total ?? 0);
        if (total > 0) return `${correct}/${total}`;
    }

    if (result.gradingType === 'ai') {
        const overallBand = Number(result.overallBand ?? 0);
        if (overallBand > 0) return `Band ${overallBand.toFixed(1)}`;
    }

    return undefined;
}

function buildLearnerStats(
    attempts: Array<{
        _id: unknown;
        status: string;
        startedAt: Date;
        submittedAt?: Date;
        result?: Record<string, unknown>;
    }> = [],
): LearnerTestStatsDto | undefined {
    if (attempts.length === 0) return undefined;

    const scores: LearnerAttemptScoreDto[] = attempts.map((attempt) => {
        const result = attempt.result;
        const scoreLabel = buildScoreLabel(result);
        const score: LearnerAttemptScoreDto = {
            attemptId: String(attempt._id),
            status: result ? 'graded' : attempt.status as LearnerAttemptScoreDto['status'],
            startedAt: attempt.startedAt.toISOString(),
        };

        if (attempt.submittedAt) {
            score.submittedAt = attempt.submittedAt.toISOString();
        }

        if (scoreLabel) {
            score.scoreLabel = scoreLabel;
        }

        if (result?.gradingType === 'objective') {
            score.normalizedScore = Number(result.normalizedScore ?? 0);
            score.correct = Number(result.correct ?? 0);
            score.total = Number(result.total ?? 0);
        }

        if (result?.gradingType === 'ai') {
            score.overallBand = Number(result.overallBand ?? 0);
        }

        return score;
    });

    return {
        attemptCount: attempts.length,
        completedCount: attempts.length,
        latestAttempt: scores[0]!,
        scores,
    };
}

export class IeltsPracticeService {
    /**
     * Get skill summary for the hub page (respects feature flags).
     */
    async getSkillSummary(): Promise<IeltsHubSummaryDto> {
        const skills = await examTestService.getSkillSummaries();
        return {
            skills: skills
                .filter((s) => isSkillAvailable(s.skill))
                .map((s) => ({
                    skill: s.skill as SkillSummaryDto['skill'],
                    activeTests: s.activeTests,
                })),
        };
    }

    /**
     * Get paginated list of active tests for a skill with real attempt counts
     * and the learner's active attempt ID (if any).
     * Respects feature flags — returns empty list for disabled skills.
     */
    async getTestsBySkill(
        skill: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
        userId?: string,
    ): Promise<{ data: TestSummaryDto[]; total: number; page: number; limit: number; totalPages: number }> {
        // Feature flag check
        if (!isSkillAvailable(skill)) {
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }

        const result = await examTestService.getActiveTestsBySkill(skill, page, limit, search);
        const testDocs = result.data;
        const testIds = testDocs.map((t) => String(t._id));

        // Batch-load attempt counts
        const attemptCounts = new Map<string, number>();
        if (testIds.length > 0) {
            const counts = await ieltsPracticeAttemptMongoRepository.countByExamTestIds(testIds);
            for (const { examTestId, count } of counts) {
                attemptCounts.set(examTestId, count);
            }
        }

        // Batch-load active attempt IDs for the current user (Phase 4)
        let activeAttemptIds = new Map<string, string>();
        let learnerHistory = new Map<string, IIeltsPracticeAttempt[]>();
        if (userId && testIds.length > 0) {
            [activeAttemptIds, learnerHistory] = await Promise.all([
                ieltsPracticeAttemptMongoRepository.findInProgressByExamTestIds(userId, testIds),
                ieltsPracticeAttemptMongoRepository.findLearnerHistoryByExamTestIds(userId, testIds),
            ]);
        }

        const summaries: TestSummaryDto[] = testDocs.map((test) => {
            const testFull = test as Record<string, unknown>;
            const testId = String(testFull._id);

            const questionType = testFull.questionType as string;
            let itemCount = 0;
            if (questionType === 'form_completion') itemCount = (testFull.itemCount as number) ?? 0;
            else if (questionType === 'academic_task_1_chart') itemCount = 1;
            else if (questionType === 'true_false_not_given') {
                // itemCount stored on doc; fallback 0 if not set
                itemCount = (testFull.itemCount as number) ?? 0;
            }

            const dto: TestSummaryDto = {
                id: testId,
                slug: (testFull.slug as string) ?? '',
                title: (testFull.name as string) ?? '',
                skill: testFull.skill as TestSummaryDto['skill'],
                questionType: testFull.questionType as TestSummaryDto['questionType'],
                itemCount,
                durationMinutes: (testFull.durationMinutes as number) ?? 0,
                attemptCount: attemptCounts.get(testId) ?? 0,
                availability: 'free',
                publishedAt: testFull.publishedAt
                    ? (testFull.publishedAt as Date).toISOString()
                    : new Date().toISOString(),
            };

            // Include active attempt ID for the Resume button (Phase 4)
            const activeId = activeAttemptIds.get(testId);
            if (activeId) {
                dto.activeAttemptId = activeId;
            }

            const stats = buildLearnerStats(learnerHistory.get(testId));
            if (stats) {
                dto.learnerStats = stats;
            }

            if (testFull.description) {
                dto.description = testFull.description as string;
            }

            return dto;
        });

        return {
            data: summaries,
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }

    /**
     * Get redacted test detail by slug, including active attempt ID if any.
     * Respects feature flags — returns 404 for disabled skills.
     */
    async getTestDetailBySlug(slug: string, userId?: string): Promise<TestDetailDto> {
        const test = await examTestService.getActiveTestBySlug(slug);

        // Feature flag check
        if (test.skill && !isSkillEnabled(test.skill as IeltsSkill)) {
            throw new AppError('Không tìm thấy đề', HttpStatus.NOT_FOUND);
        }

        const testId = String(test._id);
        const dto = toTestDetailDto(test);

        // Include active attempt ID for the Resume button
        if (userId && test.logicalTestId) {
            const existing = await ieltsPracticeAttemptMongoRepository.findInProgress(
                userId,
                String(test.logicalTestId),
            );
            if (existing) {
                dto.activeAttemptId = String(existing._id);
            }
        }

        return dto;
    }
}

export const ieltsPracticeService = new IeltsPracticeService();
