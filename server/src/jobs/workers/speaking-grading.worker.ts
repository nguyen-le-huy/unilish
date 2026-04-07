import { Worker, type Job } from 'bullmq';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { placementSessionMongoRepository } from '../../repositories/mongo/placement-session.mongo.repository.js';
import { EPlacementSessionStatus, EPlacementSubmoduleStatus, type ISpeakingCriteria, type ISpeakingFeedback } from '../../models/mongo/placement-session.model.js';
import { logger } from '../../utils/logger.js';
import type { SpeakingGradingJobPayload } from '../queues/speaking-grading.queue.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const speakingGradeSchema = z.object({
    fluency: z.number().min(0).max(9),
    lexical: z.number().min(0).max(9),
    grammar: z.number().min(0).max(9),
    feedback: z.object({
        strengths: z.array(z.string()).default([]),
        errors: z.array(z.string()).default([]),
        tips: z.array(z.string()).default([]),
        transcriptHighlights: z.array(z.string()).default([]),
    }),
});

const clampBand = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const rounded = Math.round(value * 2) / 2;
    return Math.max(0, Math.min(9, rounded));
};

const buildSpeakingFeedback = (chunkCount: number): ISpeakingFeedback => {
    if (chunkCount >= 3) {
        return {
            strengths: [
                'Cau tra loi co do luu loat on dinh trong nhieu phan.',
                'Von tu vung kha linh hoat o chu de quen thuoc.',
            ],
            errors: ['Van con nhung khoang dung ngan khi mo rong y.'],
            tips: [
                'Tang toc do phan hoi o cau hoi tru tuong trong Part 3.',
                'Uu tien dung cau phuc co menh de bo nghia de nang diem grammar.',
            ],
            transcriptHighlights: ['Mau cau tra loi da bao phu day du part1, part2, part3.'],
        };
    }

    return {
        strengths: ['Da hoan thanh duoc cac phan tra loi co ban.'],
        errors: ['So luong du lieu am thanh it, can tra loi day du hon moi cau hoi.'],
        tips: [
            'Tra loi toi thieu 2-3 cau cho moi cau hoi Part 1 va Part 3.',
            'Part 2 can neu ro mo ta, ly do va cam nhan ca nhan.',
        ],
        transcriptHighlights: ['Can thu am day du tung cau hoi de AI phan tich chinh xac hon.'],
    };
};

const extractNumber = (source: Record<string, unknown>, key: string): number | null => {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
};

const normalizeScoreToBand = (raw: number): number => {
    if (!Number.isFinite(raw)) {
        return 0;
    }

    if (raw <= 1) {
        return clampBand(raw * 9);
    }

    if (raw <= 9) {
        return clampBand(raw);
    }

    return clampBand((raw / 100) * 9);
};

const AZURE_METRIC_KEYS = [
    'pronunciationScore',
    'accuracyScore',
    'fluencyScore',
    'completenessScore',
    'prosodyScore',
] as const;

type AzureMetricKey = typeof AZURE_METRIC_KEYS[number];

const summarizeAzurePronunciationMetrics = (pronunciationData: Array<Record<string, unknown>>): string => {
    if (pronunciationData.length === 0) {
        return 'Khong co du lieu diem Azure Pronunciation Assessment.';
    }

    const summaryLines: string[] = [];

    AZURE_METRIC_KEYS.forEach((key) => {
        const values = pronunciationData
            .map((item) => extractNumber(item, key))
            .filter((item): item is number => item !== null);

        if (values.length === 0) {
            return;
        }

        const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        summaryLines.push(`${key}: avg=${avg.toFixed(1)}, min=${min.toFixed(1)}, max=${max.toFixed(1)}`);
    });

    if (summaryLines.length === 0) {
        return 'Khong co du lieu diem Azure Pronunciation Assessment hop le.';
    }

    return summaryLines.join('\n');
};

const aggregatePronunciationBand = (pronunciationData: Array<Record<string, unknown>>): number | null => {
    const candidates: number[] = [];

    pronunciationData.forEach((item) => {
        AZURE_METRIC_KEYS.forEach((key: AzureMetricKey) => {
            const metricValue = extractNumber(item, key);
            if (metricValue !== null) {
                candidates.push(normalizeScoreToBand(metricValue));
            }
        });
    });

    if (candidates.length === 0) {
        return null;
    }

    return clampBand(candidates.reduce((sum, value) => sum + value, 0) / candidates.length);
};

const gradeSpeakingWithGpt = async (
    transcripts: string[],
    gradingModel: string,
    azureMetricsSummary: string,
): Promise<{
    criteria: { fluency: number; lexical: number; grammar: number };
    feedback: ISpeakingFeedback;
} | null> => {
    const prompt = `You are a strict IELTS speaking examiner.
Score the transcript for three criteria: fluency, lexical, grammar.

Return ONLY valid JSON in this format:
{
  "fluency": number,
  "lexical": number,
  "grammar": number,
  "feedback": {
    "strengths": [string],
    "errors": [string],
    "tips": [string],
    "transcriptHighlights": [string]
  }
}

Rules:
- Bands 0.0 to 9.0, preferably 0.5 increments
- Keep feedback concise, 1 to 3 items per list
- All feedback text must be in Vietnamese only
- Feedback phai tham chieu cu the toi so lieu Azure neu co
- Output JSON only, no markdown

Transcript:
${transcripts.length > 0 ? transcripts.join('\n---\n') : 'No transcript captured. Grade conservatively based on available data.'}

Azure pronunciation metrics:
${azureMetricsSummary}`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: gradingModel,
            reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You score speaking transcripts and output strict JSON only. Feedback text must be Vietnamese only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw) as unknown;
        const validated = speakingGradeSchema.safeParse(parsed);

        if (!validated.success) {
            logger.warn('[Speaking Grading Worker] Invalid GPT grading payload', {
                issues: validated.error.issues,
            });
            return null;
        }

        return {
            criteria: {
                fluency: clampBand(validated.data.fluency),
                lexical: clampBand(validated.data.lexical),
                grammar: clampBand(validated.data.grammar),
            },
            feedback: {
                strengths: validated.data.feedback.strengths,
                errors: validated.data.feedback.errors,
                tips: validated.data.feedback.tips,
                transcriptHighlights: validated.data.feedback.transcriptHighlights,
            },
        };
    } catch (error) {
        logger.warn('[Speaking Grading Worker] GPT grading failed, fallback to heuristic', { error });
        return null;
    }
};

const processSpeakingGradingJob = async (job: Job<SpeakingGradingJobPayload>): Promise<void> => {
    const {
        sessionId,
        speakingAttemptId,
        transcripts,
        pronunciationData,
    } = job.data;

    const session = await placementSessionMongoRepository.findById(sessionId);
    if (!session) {
        logger.warn('[Speaking Grading Worker] Session not found', { sessionId, jobId: job.id });
        return;
    }

    if (!session.speaking?.attemptId) {
        logger.warn('[Speaking Grading Worker] Speaking attempt missing', { sessionId, jobId: job.id });
        return;
    }

    if (session.speaking.attemptId !== speakingAttemptId) {
        logger.warn('[Speaking Grading Worker] Speaking attempt mismatch', {
            sessionId,
            jobId: job.id,
            speakingAttemptId,
            sessionSpeakingAttemptId: session.speaking.attemptId,
        });
        return;
    }

    const chunkCount = session.speaking.audioChunks.length;
    const pronunciationBand = aggregatePronunciationBand(pronunciationData) ?? 0;
    const azureMetricsSummary = summarizeAzurePronunciationMetrics(pronunciationData);
    const speakingModel = env.OPENAI_GRADING_MODEL;

    const gptGrading = await gradeSpeakingWithGpt(transcripts, speakingModel, azureMetricsSummary);
    if (!gptGrading) {
        throw new Error('Speaking grading from GPT failed');
    }

    const criteria: ISpeakingCriteria = {
        fluency: gptGrading.criteria.fluency,
        lexical: gptGrading.criteria.lexical,
        grammar: gptGrading.criteria.grammar,
        pronunciation: pronunciationBand,
    };

    const speakingCriteriaValues = [criteria.fluency, criteria.lexical, criteria.grammar, criteria.pronunciation]
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
    const band = speakingCriteriaValues.length > 0
        ? clampBand(speakingCriteriaValues.reduce((sum, value) => sum + value, 0) / speakingCriteriaValues.length)
        : 0;

    const feedback = gptGrading.feedback;

    await placementSessionMongoRepository.patchById(sessionId, {
        $set: {
            status: EPlacementSessionStatus.COMPLETED,
            'speaking.status': EPlacementSubmoduleStatus.DONE,
            'speaking.band': band,
            'speaking.criteria': criteria,
            'speaking.feedback': feedback,
        },
    });

    logger.info('[Speaking Grading Worker] Job completed', {
        sessionId,
        jobId: job.id,
        speakingAttemptId,
        transcriptCount: transcripts.length,
        band,
        model: speakingModel,
        source: 'gpt-plus-pronunciation',
    });
};

export const speakingGradingWorker = new Worker<SpeakingGradingJobPayload>(
    'speaking-grading',
    processSpeakingGradingJob,
    {
        connection: {
            url: env.REDIS_URI || 'redis://localhost:6379',
        },
        concurrency: 2,
    },
);

speakingGradingWorker.on('completed', (job) => {
    logger.info('[Speaking Grading Worker] Job completed', { jobId: job.id });
});

speakingGradingWorker.on('failed', (job, err) => {
    logger.error('[Speaking Grading Worker] Job failed', { jobId: job?.id, error: err.message });
});
