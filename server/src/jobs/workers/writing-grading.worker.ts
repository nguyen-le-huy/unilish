import { Worker, type Job } from 'bullmq';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { placementSessionMongoRepository } from '../../repositories/mongo/placement-session.mongo.repository.js';
import {
    EPlacementSessionModule,
    EPlacementSubmoduleStatus,
    type IWritingCriteria,
    type IWritingFeedback,
} from '../../models/mongo/placement-session.model.js';
import { logger } from '../../utils/logger.js';
import type { WritingGradingJobPayload } from '../queues/writing-grading.queue.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const writingGradeSchema = z.object({
    TR: z.number().min(0).max(9),
    CC: z.number().min(0).max(9),
    LR: z.number().min(0).max(9),
    GRA: z.number().min(0).max(9),
    feedback: z.object({
        strengths: z.array(z.string()).default([]),
        errors: z.array(z.string()).default([]),
        tips: z.array(z.string()).default([]),
    }),
});

const clampBand = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const rounded = Math.round(value * 2) / 2;
    return Math.max(0, Math.min(9, rounded));
};

const buildWritingFeedback = (ratio: number): IWritingFeedback => {
    if (ratio >= 1) {
        return {
            strengths: [
                'Bai viet dap ung dung yeu cau de bai.',
                'Y tuong duoc trien khai ro rang va de theo doi.',
            ],
            errors: ['Can tiep tuc mo rong collocation de tang tinh tu nhien.'],
            tips: [
                'Them vi du cu the cho tung luan diem quan trong.',
                'Ra soat cau phuc de toi uu do chinh xac ngu phap.',
            ],
        };
    }

    return {
        strengths: ['Bai viet co huong trinh bay ro rang.'],
        errors: [
            'Do dai bai viet chua dat muc khuyen nghi nen y tuong chua du sau.',
            'Lien ket giua cac doan van chua that su mach lac.',
        ],
        tips: [
            'Hoan thien so tu toi thieu truoc khi nop bai.',
            'Su dung them tu noi de lam ro quan he logic.',
        ],
    };
};

const averageCriteriaBand = (criteria: IWritingCriteria): number => {
    const values = [criteria.TR, criteria.CC, criteria.LR, criteria.GRA]
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item));

    if (values.length === 0) {
        return 0;
    }

    return clampBand(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const gradeWritingWithGpt = async (
    essay: string,
    promptText: string,
): Promise<{ criteria: IWritingCriteria; feedback: IWritingFeedback } | null> => {
    const prompt = `You are a strict IELTS writing examiner.
Evaluate the essay using four criteria: TR, CC, LR, GRA.

Return ONLY valid JSON in this format:
{
  "TR": number,
  "CC": number,
  "LR": number,
  "GRA": number,
  "feedback": {
    "strengths": [string],
    "errors": [string],
    "tips": [string]
  }
}

Rules:
- Band range for each criterion: 0.0 to 9.0
- Use increments of 0.5 where reasonable
- Keep each feedback array between 1 and 3 concise items
- All feedback text must be in Vietnamese only
- Do not include markdown or extra keys

Prompt:
${promptText}

Essay:
${essay}`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_GRADING_MODEL,
            reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You score writing responses and output strict JSON only. Feedback text must be Vietnamese only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw) as unknown;
        const validated = writingGradeSchema.safeParse(parsed);

        if (!validated.success) {
            logger.warn('[Writing Grading Worker] Invalid GPT grading payload', {
                issues: validated.error.issues,
            });
            return null;
        }

        return {
            criteria: {
                TR: clampBand(validated.data.TR),
                CC: clampBand(validated.data.CC),
                LR: clampBand(validated.data.LR),
                GRA: clampBand(validated.data.GRA),
            },
            feedback: {
                strengths: validated.data.feedback.strengths,
                errors: validated.data.feedback.errors,
                tips: validated.data.feedback.tips,
            },
        };
    } catch (error) {
        logger.warn('[Writing Grading Worker] GPT grading failed, fallback to heuristic', { error });
        return null;
    }
};

const processWritingGradingJob = async (job: Job<WritingGradingJobPayload>): Promise<void> => {
    const {
        sessionId,
        writingAttemptId,
        essay,
        promptText,
        criteria: gradingCriteria,
    } = job.data;

    const session = await placementSessionMongoRepository.findById(sessionId);
    if (!session) {
        logger.warn('[Writing Grading Worker] Session not found', { sessionId, jobId: job.id });
        return;
    }

    if (!session.writing?.attemptId) {
        logger.warn('[Writing Grading Worker] Writing attempt missing', { sessionId, jobId: job.id });
        return;
    }

    if (session.writing.attemptId !== writingAttemptId) {
        logger.warn('[Writing Grading Worker] Writing attempt mismatch', {
            sessionId,
            jobId: job.id,
            writingAttemptId,
            sessionWritingAttemptId: session.writing.attemptId,
        });
        return;
    }

    const wordLimit = Math.max(1, session.writing.wordLimit ?? 1);
    const wordCount = Math.max(0, session.writing.wordCount ?? 0);
    const completionRatio = wordCount / wordLimit;
    const gptGrading = await gradeWritingWithGpt(essay, promptText);
    if (!gptGrading) {
        throw new Error('Writing grading from GPT failed');
    }

    const criteria = gptGrading.criteria;
    const feedback = gptGrading.feedback;
    const band = averageCriteriaBand(criteria);

    await placementSessionMongoRepository.patchById(sessionId, {
        $set: {
            currentModule: EPlacementSessionModule.SPEAKING,
            'writing.status': EPlacementSubmoduleStatus.DONE,
            'writing.band': band,
            'writing.criteria': criteria,
            'writing.feedback': feedback,
        },
    });

    logger.info('[Writing Grading Worker] Job completed', {
        sessionId,
        jobId: job.id,
        writingAttemptId,
        criteria: gradingCriteria,
        promptLength: promptText.length,
        essayLength: essay.length,
        band,
        model: env.OPENAI_GRADING_MODEL,
        source: 'gpt',
    });
};

export const writingGradingWorker = new Worker<WritingGradingJobPayload>(
    'writing-grading',
    processWritingGradingJob,
    {
        connection: {
            url: env.REDIS_URI || 'redis://localhost:6379',
        },
        concurrency: 2,
    },
);

writingGradingWorker.on('completed', (job) => {
    logger.info('[Writing Grading Worker] Job completed', { jobId: job.id });
});

writingGradingWorker.on('failed', (job, err) => {
    logger.error('[Writing Grading Worker] Job failed', { jobId: job?.id, error: err.message });
});
