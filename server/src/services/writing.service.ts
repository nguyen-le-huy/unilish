import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { writingRepo } from '../repositories/mongo/writing.mongo.repository.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import type { WritingContent, WritingRubricCriterion } from '../types/lesson-content.types.js';
import type {
    SaveWritingContentBody,
    GenerateWritingBody,
} from '../validations/writing.validation.js';

// ─── Singleton Clients ─────────────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

// ─── Internal Types ────────────────────────────────────────────────────────────

interface LessonLanguageContext {
    scenario: string;
    keywords: string[];
}

interface GPTWritingResponse {
    prompt: string;
    promptTranslation: string;
    modelAnswer: string;
    rubric: Array<{
        name: string;
        description: string;
        maxScore: number;
    }>;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class WritingService {

    // ── READ ──────────────────────────────────────────────────────────────────

    static async getContent(lessonId: string): Promise<WritingContent> {
        return writingRepo.getContent(lessonId);
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────

    static async saveContent(
        lessonId: string,
        body: SaveWritingContentBody,
    ): Promise<WritingContent> {
        const existing = await writingRepo.getContent(lessonId);

        const updated: WritingContent = {
            type: 'WRITING',
            taskType: body.taskType ?? existing.taskType,
            prompt: body.prompt ?? existing.prompt,
            promptTranslation: body.promptTranslation ?? existing.promptTranslation,
            wordCountTarget: body.wordCountTarget ?? existing.wordCountTarget,
            wordCountMin: body.wordCountMin ?? existing.wordCountMin,
            wordCountMax: body.wordCountMax ?? existing.wordCountMax,
            modelAnswer: body.modelAnswer ?? existing.modelAnswer,
            rubric: body.rubric ?? existing.rubric,
            practiceConfig: {
                mode: 'FIXED',
                questionIds: existing.practiceConfig.questionIds,
                passingScore: body.practiceConfig?.passingScore ?? existing.practiceConfig.passingScore,
            },
            generationStatus: body.generationStatus ?? existing.generationStatus,
        };

        return writingRepo.saveContent(lessonId, updated);
    }

    // ── AI: GENERATE PROMPT + MODEL ANSWER + RUBRIC ───────────────────────────

    static async generateContent(
        lessonId: string,
        body: GenerateWritingBody,
    ): Promise<{ prompt: string; promptTranslation: string; modelAnswer: string; rubric: WritingContent['rubric'] }> {
        const ctx = await this._resolveLessonContext(lessonId);

        logger.info('[WritingService] generateContent', {
            lessonId,
            level: body.level,
            taskType: body.taskType,
        });

        // Signal UI: generation in progress
        await writingRepo.setGenerationStatus(lessonId, 'GENERATING');

        const aiPrompt = this._buildGenerationPrompt(ctx, body);

        let gptData: GPTWritingResponse;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.7,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert EFL writing task designer. Return ONLY valid JSON matching the schema provided.',
                    },
                    { role: 'user', content: aiPrompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            gptData = JSON.parse(raw) as GPTWritingResponse;
        } catch (err) {
            logger.error('[WritingService] OpenAI error during generateContent', { err });
            await writingRepo.setGenerationStatus(lessonId, 'ERROR');
            throw new AppError(
                'Không thể tạo bài viết. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const prompt = gptData.prompt ?? '';
        const promptTranslation = gptData.promptTranslation ?? '';
        const modelAnswer = gptData.modelAnswer ?? '';
        const rubric: WritingRubricCriterion[] = (gptData.rubric ?? []).map((r) => ({
            id: uuidv4(),
            name: r.name ?? 'Criterion',
            description: r.description ?? '',
            maxScore: r.maxScore ?? 25,
        }));

        // Persist atomically
        await writingRepo.setGeneratedContent(lessonId, {
            prompt,
            promptTranslation,
            modelAnswer,
            rubric,
        });

        // Also update taskType and wordCount on lesson content
        await writingRepo.saveContent(lessonId, {
            ...(await writingRepo.getContent(lessonId)),
            taskType: body.taskType,
            wordCountTarget: body.wordCountTarget,
            wordCountMin: Math.floor(body.wordCountTarget * 0.8),
            wordCountMax: Math.floor(body.wordCountTarget * 1.4),
        });

        logger.info('[WritingService] generateContent completed', { lessonId });

        return { prompt, promptTranslation, modelAnswer, rubric };
    }

    // ── Private: Context Resolution ────────────────────────────────────────────

    private static async _resolveLessonContext(lessonId: string): Promise<LessonLanguageContext> {
        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);

        const unit = await Unit.findById(lesson.unitId).select('contextSeed courseId').lean().exec();
        if (!unit) throw new AppError('Chương học không tồn tại', HttpStatus.NOT_FOUND);

        const course = await Course.findById(unit.courseId).select('seriesId level').lean().exec();
        if (!course) throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);

        const series = await CourseSeries
            .findById(course.seriesId)
            .select('languageId')
            .lean()
            .exec();
        if (!series) throw new AppError('Bộ khóa học không tồn tại', HttpStatus.NOT_FOUND);

        return {
            scenario: unit.contextSeed?.scenario ?? '',
            keywords: unit.contextSeed?.keywords ?? [],
        };
    }

    // ── Private: Prompt Builder ────────────────────────────────────────────────

    private static _buildGenerationPrompt(
        ctx: LessonLanguageContext,
        body: GenerateWritingBody,
    ): string {
        return `
You are an expert EFL (English as a Foreign Language) writing task designer.

Task: Design a writing task that:
- Is set in this scenario: "${ctx.scenario}"
${body.topic ? `- Topic / desired focus: "${body.topic}"` : ''}
- CEFR level: ${body.level}
- Task type: ${body.taskType}
- Target word count: approximately ${body.wordCountTarget} words
- Incorporates these vocabulary/concepts: ${ctx.keywords.join(', ')}

Return ONLY a valid JSON object with this exact structure:
{
  "prompt": "<The writing task instructions — clear, 2–4 sentences, HTML paragraph tags allowed>",
  "promptTranslation": "<Full Vietnamese translation of the prompt — plain text>",
  "modelAnswer": "<A complete, high-quality model answer at the ${body.level} level, ~${body.wordCountTarget} words, plain text>",
  "rubric": [
    { "name": "Task Achievement", "description": "How well the task requirements are addressed", "maxScore": 25 },
    { "name": "Coherence & Cohesion", "description": "Logical flow and use of linking devices", "maxScore": 25 },
    { "name": "Lexical Resource", "description": "Range and accuracy of vocabulary", "maxScore": 25 },
    { "name": "Grammatical Range & Accuracy", "description": "Range and accuracy of grammar structures", "maxScore": 25 }
  ]
}

RULES:
- "prompt" must be the student-facing task instruction, NOT a meta-description.
- "modelAnswer" must be a complete student response, not a teacher commentary.
- "rubric" total maxScore must sum to 100.
- Return only the JSON object — no markdown fences, no extra text.
`.trim();
    }
}
