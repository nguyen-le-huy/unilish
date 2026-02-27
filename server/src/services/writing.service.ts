import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
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
import type {
    WritingContent,
    WritingFormat,
    WritingTone,
    WritingRequiredConcept,
    WritingWarmupTask,
} from '../types/lesson-content.types.js';
import type {
    SaveWritingContentBody,
    GenerateWritingMissionBody,
} from '../validations/writing.validation.js';

// ─── Singleton Clients ─────────────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

// ─── Internal Types ────────────────────────────────────────────────────────────

interface LessonLanguageContext {
    scenario: string;
    keywords: string[];
}

interface GPTWritingMissionResponse {
    prompt: string;
    promptTranslation: string;
    requiredGrammar: string;
    sentenceStarters: string[];
    requiredConcepts: Array<{
        keyword: string;
        points: number;
    }>;
    warmupTasks: Array<{
        correct: string;
    }>;
}

interface GPTTestDriveResponse {
    taskCompletionScore: number;
    grammarFeedback: string;
    nativeRewrite: string;
    explanation: string;
}

const shuffleTokens = (tokens: string[]): string[] => {
    if (tokens.length <= 1) return tokens;

    const shuffled = [...tokens];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    const unchanged = shuffled.every((token, index) => token === tokens[index]);
    if (unchanged) {
        const [first, ...rest] = shuffled;
        return [...rest, first!];
    }

    return shuffled;
};

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
        const dedupedTaughtConcepts = Array.from(new Set(body.taughtConcepts));
        return writingRepo.saveContent(lessonId, {
            type: 'WRITING',
            prompt: body.prompt,
            promptTranslation: body.promptTranslation,
            config: body.config,
            requiredConcepts: body.requiredConcepts,
            requiredGrammar: body.requiredGrammar,
            sentenceStarters: body.sentenceStarters,
            warmupTasks: body.warmupTasks,
            taughtConcepts: dedupedTaughtConcepts,
        });
    }

    // ── AI: GENERATE PROMPT + MODEL ANSWER + RUBRIC ───────────────────────────

    static async generateMission(
        lessonId: string,
        body: GenerateWritingMissionBody,
    ): Promise<WritingContent> {
        const ctx = await this._resolveLessonContext(lessonId);

        logger.info('[WritingService] generateMission', {
            lessonId,
            level: body.level,
            format: body.format,
            tone: body.tone,
        });

        const aiPrompt = this._buildGenerationPrompt(ctx, body);

        let gptData: GPTWritingMissionResponse;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert EFL writing lesson designer. Return ONLY valid JSON matching schema.',
                    },
                    { role: 'user', content: aiPrompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            gptData = JSON.parse(raw) as GPTWritingMissionResponse;
        } catch (err) {
            logger.error('[WritingService] OpenAI error during generateMission', { err });
            throw new AppError(
                'Không thể tạo bài viết. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const keywordToObjectId = new Map<string, string>();
        for (const keyword of ctx.keywords) {
            keywordToObjectId.set(keyword.toLowerCase(), new mongoose.Types.ObjectId().toString());
        }

        const requiredConcepts: WritingRequiredConcept[] = (gptData.requiredConcepts ?? [])
            .slice(0, 12)
            .map((item) => {
                const normalizedKeyword = item.keyword?.trim() ?? '';
                const fallbackConceptId = keywordToObjectId.get(normalizedKeyword.toLowerCase())
                    ?? new mongoose.Types.ObjectId().toString();

                return {
                    id: uuidv4(),
                    conceptId: fallbackConceptId,
                    keyword: normalizedKeyword,
                    points: Number.isFinite(item.points) ? Math.max(0, Math.min(100, Math.round(item.points))) : 10,
                };
            })
            .filter((item) => item.keyword.length > 0);

        const warmupTasks: WritingWarmupTask[] = (gptData.warmupTasks ?? [])
            .slice(0, 8)
            .map((task): WritingWarmupTask => {
                const correct = (task.correct ?? '').trim();
                const orderedWords = correct
                    .replace(/[.,!?;:]/g, '')
                    .split(/\s+/)
                    .map((word) => word.trim())
                    .filter((word) => word.length > 0);
                const words = shuffleTokens(orderedWords);

                return {
                    id: uuidv4(),
                    type: 'UNSCRAMBLE',
                    words,
                    correct,
                };
            })
            .filter((task) => task.correct.length > 0 && task.words.length > 0);

        const generated: WritingContent = {
            type: 'WRITING',
            prompt: (gptData.prompt ?? '').trim(),
            promptTranslation: (gptData.promptTranslation ?? '').trim(),
            config: {
                minWords: body.minWords,
                maxWords: body.maxWords,
                format: body.format,
                tone: body.tone,
            },
            requiredConcepts,
            requiredGrammar: (gptData.requiredGrammar ?? '').trim(),
            sentenceStarters: (gptData.sentenceStarters ?? [])
                .map((starter) => starter.trim())
                .filter((starter) => starter.length > 0)
                .slice(0, 12),
            warmupTasks,
            taughtConcepts: Array.from(new Set(requiredConcepts.map((item) => item.conceptId))),
        };

        const saved = await writingRepo.saveContent(lessonId, generated);
        logger.info('[WritingService] generateMission completed', { lessonId });
        return saved;
    }

    static async testDriveGrade(
        lessonId: string,
        submission: string,
    ): Promise<{
        taskCompletionScore: number;
        grammarFeedback: string;
        nativeRewrite: string;
        explanation: string;
    }> {
        const content = await writingRepo.getContent(lessonId);
        const cleanSubmission = submission.trim();

        const graderPrompt = `
You are an expert English writing grader for adult learners.

Task prompt:
${content.prompt}

Writing constraints:
- Format: ${content.config.format}
- Tone: ${content.config.tone}
- Min words: ${content.config.minWords}
- Max words: ${content.config.maxWords}
- Required grammar: ${content.requiredGrammar || 'N/A'}
- Required keywords: ${content.requiredConcepts.map((c) => c.keyword).join(', ') || 'N/A'}

Student submission:
${cleanSubmission}

Return ONLY JSON with this exact shape:
{
  "taskCompletionScore": 0,
  "grammarFeedback": "...",
  "nativeRewrite": "...",
  "explanation": "..."
}

Scoring rule:
- taskCompletionScore is integer 0..10.
- grammarFeedback concise (1-2 sentences) in Vietnamese.
- nativeRewrite preserves student meaning but sounds natural.
- explanation explains at least one lexical/tone improvement in Vietnamese.
`.trim();

        let graded: GPTTestDriveResponse;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: 'You are a strict but helpful writing grader. Return JSON only.' },
                    { role: 'user', content: graderPrompt },
                ],
            });
            graded = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as GPTTestDriveResponse;
        } catch (error) {
            logger.error('[WritingService] testDriveGrade failed', { error });
            throw new AppError('Không thể chấm bài test drive. Vui lòng thử lại.', HttpStatus.BAD_GATEWAY);
        }

        return {
            taskCompletionScore: Number.isFinite(graded.taskCompletionScore)
                ? Math.max(0, Math.min(10, Math.round(graded.taskCompletionScore)))
                : 0,
            grammarFeedback: (graded.grammarFeedback ?? '').trim(),
            nativeRewrite: (graded.nativeRewrite ?? '').trim(),
            explanation: (graded.explanation ?? '').trim(),
        };
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
                body: GenerateWritingMissionBody,
    ): string {
        return `
You are an enterprise writing-instruction designer for EFL learners.

Design a process-writing lesson for scenario:
- Scenario: "${ctx.scenario}"
${body.topic ? `- Topic focus: "${body.topic}"` : ''}
- CEFR: ${body.level}
- Format: ${body.format}
- Tone: ${body.tone}
- Min words: ${body.minWords}
- Max words: ${body.maxWords}
- Prefer these contextual keywords: ${ctx.keywords.join(', ') || 'N/A'}

Return ONLY JSON with shape:
{
    "prompt": "student-facing writing prompt",
    "promptTranslation": "Vietnamese translation of prompt",
    "requiredGrammar": "grammar target name",
    "sentenceStarters": ["...", "..."],
    "requiredConcepts": [
        { "keyword": "luggage", "points": 10 }
    ],
    "warmupTasks": [
        { "correct": "My flight was delayed." },
        { "correct": "I lost my luggage at the airport." }
    ]
}

Rules:
- warmupTasks must be UNSCRAMBLE-ready complete sentences.
- requiredConcepts should be practical and context-bound.
- sentenceStarters should reduce blank-page anxiety.
- No markdown, no extra keys.
`.trim();
    }
}
