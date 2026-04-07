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

// ══════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ══════════════════════════════════════════════════

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const writingGradeSchema = z.object({
    TR: z.number().min(0).max(9),
    CC: z.number().min(0).max(9),
    LR: z.number().min(0).max(9),
    GRA: z.number().min(0).max(9),
    feedback: z.object({
        strengths: z.array(z.string()).min(1).max(3),
        errors: z.array(z.string()).min(1).max(3),
        tips: z.array(z.string()).min(1).max(3),
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
 * Calculate average band score from all four writing criteria
 */
const calculateOverallBand = (criteria: IWritingCriteria): number => {
    const values = [criteria.TR, criteria.CC, criteria.LR, criteria.GRA]
        .filter((item): item is number => typeof item === 'number' && Number.isFinite(item));

    if (values.length === 0) {
        return 0;
    }

    return clampBand(values.reduce((sum, value) => sum + value, 0) / values.length);
};

// ══════════════════════════════════════════════════
// GPT GRADING SERVICE
// ══════════════════════════════════════════════════

/**
 * Grade writing essay using GPT with IELTS criteria
 * @throws Error if grading fails after retry
 */
const gradeWritingWithGpt = async (
    essay: string,
    promptText: string,
): Promise<{ criteria: IWritingCriteria; feedback: IWritingFeedback }> => {
    const systemPrompt = `Bạn là giám khảo chấm bài viết IELTS Writing Task 2 với tiêu chuẩn nghiêm ngặt.
Nhiệm vụ: Chấm điểm bài luận theo 4 tiêu chí IELTS và đưa ra phản hồi xây dựng.

OUTPUT: Trả về JSON hợp lệ với cấu trúc sau (KHÔNG thêm markdown hay text khác):
{
  "TR": number,
  "CC": number,
  "LR": number,
  "GRA": number,
  "feedback": {
    "strengths": [string, string, string],
    "errors": [string, string, string],
    "tips": [string, string, string]
  }
}

QUY TẮC CHẤM ĐIỂM:
- Thang điểm: 0.0 đến 9.0 (bội số 0.5)
- Mỗi mảng feedback có 1-3 câu ngắn gọn, cụ thể
- TẤT CẢ feedback PHẢI viết bằng Tiếng Việt có dấu
- Không dùng markdown, không thêm key ngoài schema`;

    const userPrompt = `📝 ĐỀ BÀI:
${promptText}

✍️ BÀI LUẬN CỦA HỌC VIÊN:
${essay}

📊 YÊU CẦU CHẤM ĐIỂM:

1. **TR (Task Response)** - Phản hồi yêu cầu đề bài
   - Trả lời đầy đủ tất cả phần của đề bài?
   - Lập luận rõ ràng và nhất quán?
   - Ý tưởng được phát triển đầy đủ với ví dụ cụ thể?

2. **CC (Coherence & Cohesion)** - Mạch lạc & liên kết
   - Cấu trúc bài rõ ràng (mở - thân - kết)?
   - Sử dụng từ nối (cohesive devices) tự nhiên?
   - Mỗi đoạn có ý chính rõ ràng?

3. **LR (Lexical Resource)** - Vốn từ vựng
   - Dùng từ vựng phong phú, chính xác?
   - Có collocations tự nhiên?
   - Ít lỗi chính tả, dùng từ?

4. **GRA (Grammatical Range & Accuracy)** - Ngữ pháp
   - Đa dạng cấu trúc câu (đơn, ghép, phức)?
   - Độ chính xác ngữ pháp cao?
   - Ít lỗi cơ bản?

Hãy chấm điểm công bằng, khách quan theo tiêu chuẩn IELTS thực tế.`;

    try {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_GRADING_MODEL,
            reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
            response_format: { type: 'json_object' },
            temperature: 0.3,
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
        const validated = writingGradeSchema.safeParse(parsed);

        if (!validated.success) {
            logger.error('[Writing Grading Worker] Invalid GPT response schema', {
                issues: validated.error.issues,
                rawContent: rawContent.substring(0, 500),
            });
            throw new Error('Invalid grading response schema');
        }

        return {
            criteria: {
                TR: clampBand(validated.data.TR),
                CC: clampBand(validated.data.CC),
                LR: clampBand(validated.data.LR),
                GRA: clampBand(validated.data.GRA),
            },
            feedback: validated.data.feedback,
        };
    } catch (error) {
        logger.error('[Writing Grading Worker] GPT grading failed', {
            error: error instanceof Error ? error.message : String(error),
            essayLength: essay.length,
            promptLength: promptText.length,
        });
        throw error;
    }
};

// ══════════════════════════════════════════════════
// JOB PROCESSOR
// ══════════════════════════════════════════════════

/**
 * Process writing grading job from BullMQ queue
 * 1. Validate session and attempt
 * 2. Call GPT for grading
 * 3. Persist results to MongoDB
 * 4. Advance session to speaking module
 */
const processWritingGradingJob = async (job: Job<WritingGradingJobPayload>): Promise<void> => {
    const { sessionId, writingAttemptId, essay, promptText } = job.data;

    logger.info('[Writing Grading Worker] Job started', {
        jobId: job.id,
        sessionId,
        writingAttemptId,
        essayLength: essay.length,
    });

    // ─────────────────────────────────────────────────
    // Step 1: Validate session
    // ─────────────────────────────────────────────────
    const session = await placementSessionMongoRepository.findById(sessionId);
    if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    if (!session.writing?.attemptId) {
        throw new Error(`Writing attempt missing in session: ${sessionId}`);
    }

    if (session.writing.attemptId !== writingAttemptId) {
        throw new Error(
            `Writing attempt mismatch. Expected: ${writingAttemptId}, Got: ${session.writing.attemptId}`,
        );
    }

    // ─────────────────────────────────────────────────
    // Step 2: Grade with GPT
    // ─────────────────────────────────────────────────
    const { criteria, feedback } = await gradeWritingWithGpt(essay, promptText);
    const overallBand = calculateOverallBand(criteria);

    // ─────────────────────────────────────────────────
    // Step 3: Persist results & advance to Speaking
    // ─────────────────────────────────────────────────
    await placementSessionMongoRepository.patchById(sessionId, {
        $set: {
            currentModule: EPlacementSessionModule.SPEAKING,
            'writing.status': EPlacementSubmoduleStatus.DONE,
            'writing.band': overallBand,
            'writing.criteria': criteria,
            'writing.feedback': feedback,
        },
    });

    logger.info('[Writing Grading Worker] Job completed successfully', {
        jobId: job.id,
        sessionId,
        writingAttemptId,
        band: overallBand,
        criteria,
        model: env.OPENAI_GRADING_MODEL,
    });
};

// ══════════════════════════════════════════════════
// WORKER INITIALIZATION & EVENT HANDLERS
// ══════════════════════════════════════════════════

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
    logger.info('[Writing Grading Worker] ✅ Job completed', { jobId: job.id });
});

writingGradingWorker.on('failed', (job, error) => {
    logger.error('[Writing Grading Worker] ❌ Job failed', {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

writingGradingWorker.on('error', (error) => {
    logger.error('[Writing Grading Worker] ⚠️ Worker error', {
        error: error.message,
        stack: error.stack,
    });
});
