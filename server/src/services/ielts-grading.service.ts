import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { IIeltsPracticeAttempt } from '../models/mongo/ielts-practice-attempt.model.js';
import type { AiResult, ObjectiveResult } from '../types/ielts-practice.types.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const WritingAiResultSchema = z.object({
    overallBand: z.number().min(0).max(9),
    criteria: z.object({
        taskAchievement: z.number().min(0).max(9),
        coherenceCohesion: z.number().min(0).max(9),
        lexicalResource: z.number().min(0).max(9),
        grammarRangeAccuracy: z.number().min(0).max(9),
    }),
    strengths: z.array(z.string()).min(1).max(5),
    improvements: z.array(z.string()).min(1).max(6),
    detailedFeedback: z.string().min(1),
    correctedEssay: z.string().min(1),
    teacherNotes: z.array(z.string()).min(1).max(6),
});

// ─── Answer normalization ────────────────────────────────────────────────────

/**
 * Normalize a text answer: trim whitespace, optionally lowercase.
 */
function normalizeAnswer(answer: string, caseSensitive: boolean): string {
    const trimmed = answer.trim();
    return caseSensitive ? trimmed : trimmed.toLowerCase();
}

/**
 * Check if a learner's answer matches any of the accepted answers.
 */
function matchAnswer(
    learnerAnswer: string,
    acceptedAnswers: string[],
    caseSensitive: boolean,
): boolean {
    const normalized = normalizeAnswer(learnerAnswer, caseSensitive);
    return acceptedAnswers.some(
        (accepted) => normalizeAnswer(accepted, caseSensitive) === normalized,
    );
}

function clampBand(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(9, Math.round(value * 2) / 2));
}

// ─── Objective Grading ───────────────────────────────────────────────────────

export interface ObjectiveGradingInput {
    skill: string;
    questionType: string;
    contentSnapshot: Record<string, unknown>;
    draft: Record<string, unknown>;
}

/**
 * Grade a Listening/Reading attempt objectively from the snapshot's answer key.
 * The snapshot contains the full admin content WITH answer keys.
 *
 * @returns ObjectiveResult or null if the skill doesn't support objective grading.
 */
export function gradeObjective(input: ObjectiveGradingInput): ObjectiveResult | null {
    const { skill, questionType, contentSnapshot, draft } = input;

    // Only Listening and Reading support objective grading
    if (skill === 'writing' || skill === 'speaking') {
        return null;
    }

    const answers = (draft.answers ?? {}) as Record<string, string>;

    if (questionType === 'form_completion') {
        const items = (contentSnapshot.items ?? []) as Array<{
            id: string;
            acceptedAnswers: string[];
            caseSensitive?: boolean;
        }>;

        const itemResults = items.map((item) => {
            const learnerAnswer = answers[item.id];
            if (!learnerAnswer || learnerAnswer.trim().length === 0) {
                return { itemId: item.id, correct: false };
            }

            const correct = matchAnswer(
                learnerAnswer,
                item.acceptedAnswers,
                item.caseSensitive ?? false,
            );

            return { itemId: item.id, correct };
        });

        const correct = itemResults.filter((r) => r.correct).length;
        const total = itemResults.length;

        return {
            gradingType: 'objective' as const,
            correct,
            total,
            normalizedScore: total > 0 ? correct / total : 0,
            itemResults,
        };
    }

    if (questionType === 'true_false_not_given') {
        const statements = (contentSnapshot.statements ?? []) as Array<{
            id: string;
            correctAnswer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
        }>;

        const itemResults = statements.map((stmt) => {
            const learnerAnswer = answers[stmt.id];
            if (!learnerAnswer) {
                return { itemId: stmt.id, correct: false };
            }

            const normalized = learnerAnswer.trim().toUpperCase() as 'TRUE' | 'FALSE' | 'NOT_GIVEN';
            const correct = normalized === stmt.correctAnswer;

            return { itemId: stmt.id, correct };
        });

        const correct = itemResults.filter((r) => r.correct).length;
        const total = itemResults.length;

        return {
            gradingType: 'objective' as const,
            correct,
            total,
            normalizedScore: total > 0 ? correct / total : 0,
            itemResults,
        };
    }

    return null;
}

// ─── AI Writing Grading ─────────────────────────────────────────────────────

export async function gradeWritingWithAi(input: {
    prompt: string;
    instruction: string;
    imageUrl?: string;
    imageAlt?: string;
    essay: string;
    minWords?: number;
}): Promise<AiResult> {
    const completion = await openaiClient.chat.completions.create({
        model: env.OPENAI_GRADING_MODEL,
        reasoning_effort: env.OPENAI_GRADING_REASONING_EFFORT,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `Bạn là giám khảo IELTS Writing Task 1 chuyên nghiệp.
Chấm bài nghiêm túc theo IELTS Writing Task 1 band descriptors.
Trả lời hoàn toàn bằng tiếng Việt có dấu, ngoại trừ các cụm tiếng Anh trong bài học.

OUTPUT: Chỉ trả JSON hợp lệ, không markdown, không thêm text ngoài JSON:
{
  "overallBand": number,
  "criteria": {
    "taskAchievement": number,
    "coherenceCohesion": number,
    "lexicalResource": number,
    "grammarRangeAccuracy": number
  },
  "strengths": [string],
  "improvements": [string],
  "detailedFeedback": string,
  "correctedEssay": string,
  "teacherNotes": [string]
}

Quy tắc:
- Điểm theo thang IELTS 0.0-9.0, làm tròn về bội số 0.5.
- Nhận xét phải cụ thể như giáo viên IELTS: nêu lỗi Task Achievement, overview, số liệu, so sánh, grammar, lexical resource.
- correctedEssay là phiên bản chữa lại tự nhiên, đúng grammar, phù hợp Task 1; không tự bịa số liệu ngoài đề.
- Nếu bài quá ngắn hoặc lạc đề, chấm thấp và giải thích rõ.`,
            },
            {
                role: 'user',
                content: `ĐỀ IELTS WRITING TASK 1:
${input.prompt}

HƯỚNG DẪN:
${input.instruction}

ẢNH/BIỂU ĐỒ:
${input.imageUrl ? `URL: ${input.imageUrl}` : 'Không có URL ảnh'}
${input.imageAlt ? `Mô tả ảnh: ${input.imageAlt}` : ''}

SỐ TỪ TỐI THIỂU: ${input.minWords ?? 150}

BÀI VIẾT HỌC VIÊN:
${input.essay}`,
            },
        ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
        throw new Error('OpenAI returned empty writing grading response');
    }

    const parsed = WritingAiResultSchema.parse(JSON.parse(raw));

    return {
        gradingType: 'ai',
        overallBand: clampBand(parsed.overallBand),
        criteria: {
            taskAchievement: clampBand(parsed.criteria.taskAchievement),
            coherenceCohesion: clampBand(parsed.criteria.coherenceCohesion),
            lexicalResource: clampBand(parsed.criteria.lexicalResource),
            grammarRangeAccuracy: clampBand(parsed.criteria.grammarRangeAccuracy),
        },
        strengths: parsed.strengths,
        improvements: parsed.improvements,
        detailedFeedback: parsed.detailedFeedback,
        correctedEssay: parsed.correctedEssay,
        teacherNotes: parsed.teacherNotes,
        gradingVersion: `openai:${env.OPENAI_GRADING_MODEL}`,
    };
}

// ─── Queue adapter interface ─────────────────────────────────────────────────

/**
 * Interface for submitting Writing/Speaking to a grading queue.
 * Not enabled in MVP — always returns { enqueued: false }.
 */
export interface GradingQueueAdapter {
    enqueue(attempt: IIeltsPracticeAttempt): Promise<{ enqueued: boolean }>;
}

/**
 * No-op adapter for MVP. Writing/Speaking submissions stop at "submitted".
 * Replace with real adapter when ADR-008 is accepted.
 */
export class NoopGradingQueueAdapter implements GradingQueueAdapter {
    async enqueue(_attempt: IIeltsPracticeAttempt): Promise<{ enqueued: boolean }> {
        return { enqueued: false };
    }
}

// Singleton
export const gradingQueueAdapter: GradingQueueAdapter = new NoopGradingQueueAdapter();
