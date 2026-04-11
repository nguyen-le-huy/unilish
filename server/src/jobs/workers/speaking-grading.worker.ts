import { Worker, type Job } from 'bullmq';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { placementSessionMongoRepository } from '../../repositories/mongo/placement-session.mongo.repository.js';
import {
    EPlacementSessionStatus,
    EPlacementSubmoduleStatus,
    type ISpeakingCriteria,
    type ISpeakingFeedback,
} from '../../models/mongo/placement-session.model.js';
import { logger } from '../../utils/logger.js';
import type { SpeakingGradingJobPayload } from '../queues/speaking-grading.queue.js';

// ══════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const speakingGradeSchema = z.object({
    fluency: z.number().min(0).max(9),
    lexical: z.number().min(0).max(9),
    grammar: z.number().min(0).max(9),
    feedback: z.object({
        strengths: z.array(z.string()).min(1).max(3),
        errors: z.array(z.string()).min(1).max(3),
        tips: z.array(z.string()).min(1).max(3),
        transcriptHighlights: z.array(z.string()).min(1).max(3),
    }),
});

// ══════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════

/**
 * Clamp and round band score to nearest 0.5 within IELTS range [0.0 - 9.0]
 */
const clampBand = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    const rounded = Math.round(value * 2) / 2;
    return Math.max(0, Math.min(9, rounded));
};

/**
 * Extract numeric value from unknown object field
 */
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

/**
 * Normalize Azure pronunciation scores to IELTS band scale
 * Handles different score ranges: [0-1], [0-9], [0-100]
 */
const normalizeScoreToBand = (raw: number): number => {
    if (!Number.isFinite(raw)) {
        return 0;
    }

    // Percentage scale [0-1]
    if (raw <= 1) {
        return clampBand(raw * 9);
    }

    // Band scale [0-9]
    if (raw <= 9) {
        return clampBand(raw);
    }

    // Percentage scale [0-100]
    return clampBand((raw / 100) * 9);
};

/**
 * Calculate overall speaking band from four criteria
 */
const calculateOverallBand = (criteria: ISpeakingCriteria): number => {
    const values = [criteria.fluency, criteria.lexical, criteria.grammar, criteria.pronunciation]
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item));

    if (values.length === 0) {
        return 0;
    }

    return clampBand(values.reduce((sum, value) => sum + value, 0) / values.length);
};

// ══════════════════════════════════════════════════
// AZURE PRONUNCIATION ASSESSMENT
// ══════════════════════════════════════════════════

const AZURE_METRIC_KEYS = [
    'pronunciationScore',
    'accuracyScore',
    'fluencyScore',
    'completenessScore',
    'prosodyScore',
] as const;

type AzureMetricKey = typeof AZURE_METRIC_KEYS[number];

/**
 * Summarize Azure pronunciation metrics for GPT context
 */
const summarizeAzurePronunciationMetrics = (pronunciationData: Array<Record<string, unknown>>): string => {
    if (pronunciationData.length === 0) {
        return 'Không có dữ liệu đánh giá phát âm từ Azure Speech.';
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
        return 'Không có dữ liệu đánh giá phát âm hợp lệ từ Azure Speech.';
    }

    return summaryLines.join('\n');
};

/**
 * Aggregate Azure pronunciation metrics into single IELTS band score
 */
const aggregatePronunciationBand = (pronunciationData: Array<Record<string, unknown>>): number => {
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
        return 0;
    }

    return clampBand(candidates.reduce((sum, value) => sum + value, 0) / candidates.length);
};

// ══════════════════════════════════════════════════
// GPT GRADING SERVICE
// ══════════════════════════════════════════════════

/**
 * Grade speaking transcript using GPT with IELTS criteria
 * @throws Error if grading fails
 */
const gradeSpeakingWithGpt = async (
    transcripts: string[],
    azureMetricsSummary: string,
): Promise<{
    criteria: { fluency: number; lexical: number; grammar: number };
    feedback: ISpeakingFeedback;
}> => {
    const systemPrompt = `Bạn là giám khảo phỏng vấn IELTS Speaking với tiêu chuẩn nghiêm ngặt.
Nhiệm vụ: Chấm điểm bài nói theo 3 tiêu chí IELTS và đưa ra phản hồi xây dựng.

OUTPUT: Trả về JSON hợp lệ với cấu trúc sau (KHÔNG thêm markdown hay text khác):
{
  "fluency": number,
  "lexical": number,
  "grammar": number,
  "feedback": {
    "strengths": [string, string, string],
    "errors": [string, string, string],
    "tips": [string, string, string],
    "transcriptHighlights": [string, string, string]
  }
}

QUY TẮC CHẤM ĐIỂM:
- Thang điểm: 0.0 đến 9.0 (bội số 0.5)
- Mỗi mảng feedback có 1-3 câu ngắn gọn, cụ thể
- TẤT CẢ feedback PHẢI viết bằng Tiếng Việt có dấu
- Feedback phải tham chiếu cụ thể tới số liệu Azure Speech nếu có
- Không dùng markdown, không thêm key ngoài schema`;

    const userPrompt = `TRANSCRIPT BÀI NÓI CỦA HỌC VIÊN:
${transcripts.length > 0 ? transcripts.join('\n---\n') : 'Không có transcript. Chấm điểm thận trọng dựa trên dữ liệu có sẵn.'}

SỐ LIỆU PHÁT ÂM TỪ AZURE SPEECH:
${azureMetricsSummary}

YÊU CẦU CHẤM ĐIỂM:

1. **Fluency (Độ trôi chảy)**
   - Nói liên tục không ngắt quãng nhiều?
   - Tốc độ nói tự nhiên, không quá chậm?
   - Ít lặp lại từ, tự sửa câu?
   - Sử dụng fillers (um, ah) hợp lý?

2. **Lexical Resource (Vốn từ vựng)**
   - Dùng từ vựng phong phú, chính xác?
   - Có paraphrasing linh hoạt?
   - Dùng idioms, collocations tự nhiên?
   - Ít lỗi dùng từ?

3. **Grammar (Ngữ pháp)**
   - Đa dạng cấu trúc câu (đơn, ghép, phức)?
   - Độ chính xác ngữ pháp cao?
   - Dùng đúng thì, giọng, số?
   - Ít lỗi cơ bản?

**LƯU Ý:**
- Pronunciation KHÔNG chấm ở đây (đã có điểm riêng từ Azure)
- Tham khảo số liệu Azure để đánh giá độ rõ ràng khi phát âm ảnh hưởng tới comprehension
- Chấm điểm công bằng, khách quan theo tiêu chuẩn IELTS thực tế`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_GRADING_MODEL,
            reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error('Empty response from OpenAI');
        }

        const parsed = JSON.parse(rawContent) as unknown;
        const validated = speakingGradeSchema.safeParse(parsed);

        if (!validated.success) {
            logger.error('[Speaking Grading Worker] Invalid GPT response schema', {
                issues: validated.error.issues,
                rawContent: rawContent.substring(0, 500),
            });
            throw new Error('Invalid grading response schema');
        }

        return {
            criteria: {
                fluency: clampBand(validated.data.fluency),
                lexical: clampBand(validated.data.lexical),
                grammar: clampBand(validated.data.grammar),
            },
            feedback: validated.data.feedback,
        };
    } catch (error) {
        logger.error('[Speaking Grading Worker] GPT grading failed', {
            error: error instanceof Error ? error.message : String(error),
            transcriptCount: transcripts.length,
            transcriptLength: transcripts.join('').length,
        });
        throw error;
    }
};

// ══════════════════════════════════════════════════
// JOB PROCESSOR
// ══════════════════════════════════════════════════

/**
 * Process speaking grading job from BullMQ queue
 * 1. Validate session and attempt
 * 2. Aggregate Azure pronunciation metrics
 * 3. Call GPT for fluency/lexical/grammar grading
 * 4. Combine all criteria and persist results
 * 5. Mark placement test as completed
 */
const processSpeakingGradingJob = async (job: Job<SpeakingGradingJobPayload>): Promise<void> => {
    const { sessionId, speakingAttemptId, transcripts, pronunciationData } = job.data;

    logger.info('[Speaking Grading Worker] Job started', {
        jobId: job.id,
        sessionId,
        speakingAttemptId,
        transcriptCount: transcripts.length,
        pronunciationDataCount: pronunciationData.length,
    });

    // ─────────────────────────────────────────────────
    // Step 1: Validate session
    // ─────────────────────────────────────────────────
    const session = await placementSessionMongoRepository.findById(sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.speaking?.attemptId) {
        throw new Error(`Speaking attempt missing in session: ${sessionId}`);
    }

    if (session.speaking.attemptId !== speakingAttemptId) {
        throw new Error(
            `Speaking attempt mismatch. Expected: ${speakingAttemptId}, Got: ${session.speaking.attemptId}`,
        );
    }

    // ─────────────────────────────────────────────────
    // Step 2: Process Azure pronunciation metrics
    // ─────────────────────────────────────────────────
    const pronunciationBand = aggregatePronunciationBand(pronunciationData);
    const azureMetricsSummary = summarizeAzurePronunciationMetrics(pronunciationData);

    // ─────────────────────────────────────────────────
    // Step 3: Grade with GPT (fluency, lexical, grammar)
    // ─────────────────────────────────────────────────
    const gptGrading = await gradeSpeakingWithGpt(transcripts, azureMetricsSummary);

    // ─────────────────────────────────────────────────
    // Step 4: Combine all criteria
    // ─────────────────────────────────────────────────
    const criteria: ISpeakingCriteria = {
        fluency: gptGrading.criteria.fluency,
        lexical: gptGrading.criteria.lexical,
        grammar: gptGrading.criteria.grammar,
        pronunciation: pronunciationBand,
    };

    const overallBand = calculateOverallBand(criteria);
    const feedback = gptGrading.feedback;

    // ─────────────────────────────────────────────────
    // Step 5: Persist results & mark test as completed
    // ─────────────────────────────────────────────────
    await placementSessionMongoRepository.patchById(sessionId, {
        $set: {
            status: EPlacementSessionStatus.COMPLETED,
            'speaking.status': EPlacementSubmoduleStatus.DONE,
            'speaking.band': overallBand,
            'speaking.criteria': criteria,
            'speaking.feedback': feedback,
        },
    });

    logger.info('[Speaking Grading Worker] Job completed successfully', {
        jobId: job.id,
        sessionId,
        speakingAttemptId,
        band: overallBand,
        criteria,
        model: env.OPENAI_GRADING_MODEL,
    });
};

// ══════════════════════════════════════════════════
// WORKER INITIALIZATION & EVENT HANDLERS
// ══════════════════════════════════════════════════

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
    logger.info('[Speaking Grading Worker] ✅ Job completed', { jobId: job.id });
});

speakingGradingWorker.on('failed', (job, error) => {
    logger.error('[Speaking Grading Worker] ❌ Job failed', {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

speakingGradingWorker.on('error', (error) => {
    logger.error('[Speaking Grading Worker] ⚠️ Worker error', {
        error: error.message,
        stack: error.stack,
    });
});
