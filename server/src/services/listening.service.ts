import mongoose from 'mongoose';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { listeningRepo } from '../repositories/mongo/listening.mongo.repository.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { Concept } from '../models/mongo/concept.model.js';
import { Question, EQuestionType } from '../models/mongo/question.model.js';
import { QuestionGenerationService } from './question-generation.service.js';
import { ContextAlignmentService } from './context-alignment.service.js';
import type { ListeningContent } from '../types/lesson-content.types.js';
import type {
    SaveListeningContentBody,
    GenerateListeningQuestionsBody,
} from '../validations/listening.validation.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

type ListeningQuestionType = 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'TRUE_FALSE';

interface LessonLanguageContext {
    languageId: string;
    scenario: string;
    keywords: string[];
}

interface AiQuestionOption {
    text: string;
    isCorrect: boolean;
}

interface AiQuestionDraft {
    type: ListeningQuestionType;
    stem: string;
    options?: AiQuestionOption[];
    correctAnswers?: string[];
    answer?: boolean;
    explanation?: string;
}

interface ListeningTypeDistribution {
    multipleChoice: number;
    fillInBlank: number;
    trueFalse: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────
// Business logic layer for LISTENING lesson content.
// This is the ONLY layer allowed to call the repository — controllers never
// bypass the service to talk to the data layer directly.

export class ListeningService {

    // ── READ ──────────────────────────────────────────────────────────────────

    /**
     * Return the full listening content block for a lesson.
     * The repository guarantees a safe empty structure is returned when the
     * document hasn't been initialised yet.
     */
    static async getContent(lessonId: string): Promise<ListeningContent> {
        return listeningRepo.getContent(lessonId);
    }

    // ── WRITE ─────────────────────────────────────────────────────────────────

    /**
     * Persist partial or full listening content.
     * Merges the incoming payload with the existing document so that a
     * partial PATCH-style save never overwrites unrelated fields.
     */
    static async saveContent(
        lessonId: string,
        body: SaveListeningContentBody,
    ): Promise<ListeningContent> {
        const context = await this._resolveLessonContext(lessonId);

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                context.scenario,
                ...(body.transcript ?? []).flatMap((line) => [line.speaker, line.role, line.text, line.translation ?? '']),
            ],
            'LISTENING',
        );

        // Load current state — repository enforces type === 'LISTENING' guard
        const existing = await listeningRepo.getContent(lessonId);

        const updated: ListeningContent = {
            type: 'LISTENING',
            media: body.media
                ? { ...existing.media, ...body.media }
                : existing.media,
            transcript: body.transcript ?? existing.transcript,
            interactiveConfig: body.interactiveConfig
                ? { ...existing.interactiveConfig, ...body.interactiveConfig }
                : existing.interactiveConfig,
            practiceConfig: {
                mode: 'FIXED',
                questionIds: existing.practiceConfig.questionIds, // never overwritten here
                passingScore:
                    body.practiceConfig?.passingScore ?? existing.practiceConfig.passingScore,
            },
            generationStatus: body.generationStatus ?? existing.generationStatus,
        };

        const result = await listeningRepo.saveContent(lessonId, updated);

        logger.info('Listening content saved', { lessonId });

        return result;
    }

    // ── GUARD ─────────────────────────────────────────────────────────────────

    /**
     * Ensure a lesson exists and is of type LISTENING.
     * Used internally and optionally by the AI service layer in Phase 3.
     */
    static async assertListeningLesson(lessonId: string): Promise<void> {
        // getContent throws BAD_REQUEST for wrong type, NOT_FOUND for missing
        await listeningRepo.getContent(lessonId);
    }

    // ── QUESTION GENERATION ─────────────────────────────────────────────────

    static async generateQuestions(
        lessonId: string,
        body: GenerateListeningQuestionsBody,
    ): Promise<{ questionIds: string[]; count: number }> {
        const content = await listeningRepo.getContent(lessonId);

        if (!content.transcript.length) {
            throw new AppError(
                'Bài học chưa có transcript. Hãy tạo kịch bản trước.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const hasDialogue = content.transcript.some((line) => line.text.trim().length > 0);
        if (!hasDialogue) {
            throw new AppError(
                'Transcript trống. Không thể tạo câu hỏi luyện nghe.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const ctx = await this._resolveLessonContext(lessonId);

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                ctx.scenario,
                ...content.transcript.flatMap((line) => [line.speaker, line.role, line.text, line.translation ?? '']),
            ],
            'LISTENING',
        );

        const langObjectId = new mongoose.Types.ObjectId(ctx.languageId);
        const conceptKey = `listening_${lessonId}`;

        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const listeningConcept = await Concept.findOneAndUpdate(
            { languageId: langObjectId, key: conceptKey },
            {
                $setOnInsert: {
                    languageId: langObjectId,
                    key: conceptKey,
                    name: `Listening: ${lesson.title}`,
                    type: 'SKILL',
                    description: content.transcript.map((line) => line.text).join(' ').slice(0, 400),
                    metaData: {
                        lessonType: 'LISTENING',
                    },
                },
            },
            { upsert: true, new: true, lean: true },
        ).exec();

        if (!listeningConcept) {
            throw new AppError('Không thể tạo Concept cho bài nghe', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const existingQuestionIds = content.practiceConfig.questionIds;
        if (existingQuestionIds.length > 0) {
            await Question.deleteMany({ _id: { $in: existingQuestionIds } }).exec();
        }

        const requestedTypes = body.types?.length
            ? body.types
            : ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'TRUE_FALSE'];

        const distribution = this._resolveDistribution(body, requestedTypes);

        const questionChunks = await Promise.all([
            distribution.multipleChoice > 0
                ? this._generateQuestionsWithAI(content, distribution.multipleChoice, ['MULTIPLE_CHOICE'], ctx)
                : Promise.resolve([]),
            distribution.fillInBlank > 0
                ? this._generateQuestionsWithAI(content, distribution.fillInBlank, ['FILL_IN_BLANK'], ctx)
                : Promise.resolve([]),
            distribution.trueFalse > 0
                ? this._generateQuestionsWithAI(content, distribution.trueFalse, ['TRUE_FALSE'], ctx)
                : Promise.resolve([]),
        ]);

        const questions = questionChunks.flat();

        if (questions.length === 0) {
            throw new AppError('Không tạo được câu hỏi từ transcript hiện tại.', HttpStatus.BAD_REQUEST);
        }

        const inserted = await Question.insertMany(
            questions.map((q) => ({
                languageId: langObjectId,
                testedConcept: listeningConcept._id,
                difficultyLevel: q.type === EQuestionType.TRUE_FALSE ? 1 : 2,
                type: q.type,
                stem: { text: q.stem },
                content: q.content,
                explanation: q.explanation,
                tags: ['listening', 'ai-generated'],
            })),
        );

        const questionIds = inserted.map((q) => q._id.toString());
        await listeningRepo.setQuestionIds(lessonId, questionIds);

        logger.info('[ListeningService] generateQuestions', {
            lessonId,
            count: questionIds.length,
            distribution,
        });

        return { questionIds, count: questionIds.length };
    }

    static async getQuestions(lessonId: string) {
        const content = await listeningRepo.getContent(lessonId);
        const questionIds = content.practiceConfig.questionIds;
        if (!questionIds.length) return [];

        return Question.find({ _id: { $in: questionIds } }).lean().exec();
    }

    static async swapQuestion(lessonId: string, questionId: string) {
        const existing = await Question.findById(questionId).lean().exec();
        if (!existing) {
            throw new AppError('Câu hỏi không tồn tại', HttpStatus.NOT_FOUND);
        }

        const alternatives = await Question.aggregate([
            {
                $match: {
                    testedConcept: existing.testedConcept,
                    type: existing.type,
                    _id: { $ne: existing._id },
                },
            },
            { $sample: { size: 1 } },
        ]).exec();

        if (!alternatives.length) {
            throw new AppError(
                'Không có câu hỏi thay thế trong ngân hàng cho concept này.',
                HttpStatus.NOT_FOUND,
            );
        }

        const replacement = alternatives[0]!;
        const content = await listeningRepo.getContent(lessonId);
        const updatedIds = content.practiceConfig.questionIds
            .filter((id) => id.toString() !== questionId)
            .concat(replacement._id.toString());

        await listeningRepo.setQuestionIds(lessonId, updatedIds);
        return replacement;
    }

    static async updateQuestion(questionId: string, updates: Record<string, unknown>) {
        return QuestionGenerationService.updateQuestion(questionId, updates);
    }

    static async deleteQuestion(lessonId: string, questionId: string): Promise<void> {
        const content = await listeningRepo.getContent(lessonId);
        const remaining = content.practiceConfig.questionIds.filter((id) => id !== questionId);
        await listeningRepo.setQuestionIds(lessonId, remaining);
        await Question.findByIdAndDelete(questionId).exec();
        logger.info('[ListeningService] deleteQuestion', { lessonId, questionId });
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private static async _resolveLessonContext(lessonId: string): Promise<LessonLanguageContext> {
        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const unit = await Unit.findById(lesson.unitId).select('contextSeed courseId').lean().exec();
        if (!unit) {
            throw new AppError('Chương học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const course = await Course.findById(unit.courseId).select('seriesId').lean().exec();
        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const series = await CourseSeries.findById(course.seriesId).select('languageId').lean().exec();
        if (!series) {
            throw new AppError('Bộ khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        return {
            languageId: series.languageId.toString(),
            scenario: unit.contextSeed?.scenario ?? '',
            keywords: unit.contextSeed?.keywords ?? [],
        };
    }

    private static _buildQuestionsPrompt(
        content: ListeningContent,
        count: number,
        types: ListeningQuestionType[],
        ctx: LessonLanguageContext,
    ): string {
        const transcriptText = content.transcript
            .map((line, index) => {
                const speaker = line.speaker || `Speaker ${index + 1}`;
                return `${speaker}: ${line.text}`;
            })
            .join('\n');

        const targetWords = content.transcript
            .flatMap((line) => line.words)
            .filter((word) => word.isTargetVocab)
            .map((word) => word.word)
            .filter((word, index, arr) => arr.findIndex((w) => w.toLowerCase() === word.toLowerCase()) === index)
            .slice(0, 20);

        return `
You are an expert ESL listening-assessment writer.

Create ${count} listening practice questions from the dialogue below.
- Scenario: "${ctx.scenario}"
- Course keywords: ${ctx.keywords.join(', ') || 'none'}
- Allowed question types: ${types.join(', ')}
- Focus: listening comprehension for language learners.
- If possible, include some gist/detail questions and some gap-fill based on exact dialogue wording.
- Use only facts from the transcript.
- For MULTIPLE_CHOICE: provide exactly 4 options and exactly 1 correct option.
- For FILL_IN_BLANK: include stem text with "_____" and provide 1-3 accepted answers.
- For TRUE_FALSE: provide a clear statement and boolean answer field.
- Keep question stems concise (<= 180 chars).

${targetWords.length > 0 ? `Prefer these target words when suitable: ${targetWords.join(', ')}` : ''}

Return ONLY valid JSON object with this shape:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "TRUE_FALSE",
      "stem": "...",
      "options": [{ "text": "...", "isCorrect": true|false }],
      "correctAnswers": ["..."],
      "answer": true,
      "explanation": "..."
    }
  ]
}

Transcript:
${transcriptText}
`.trim();
    }

    private static _resolveDistribution(
        body: GenerateListeningQuestionsBody,
        requestedTypes: ListeningQuestionType[],
    ): ListeningTypeDistribution {
        if (body.distribution) {
            return {
                multipleChoice: body.distribution.multipleChoice,
                fillInBlank: body.distribution.fillInBlank,
                trueFalse: body.distribution.trueFalse,
            };
        }

        const count = body.count ?? 6;
        const typeCount = requestedTypes.length;
        const base = Math.floor(count / typeCount);
        const remainder = count % typeCount;

        const seeded = requestedTypes.reduce<ListeningTypeDistribution>(
            (acc, type, index) => {
                const amount = base + (index < remainder ? 1 : 0);
                if (type === 'MULTIPLE_CHOICE') acc.multipleChoice = amount;
                if (type === 'FILL_IN_BLANK') acc.fillInBlank = amount;
                if (type === 'TRUE_FALSE') acc.trueFalse = amount;
                return acc;
            },
            { multipleChoice: 0, fillInBlank: 0, trueFalse: 0 },
        );

        return seeded;
    }

    private static async _generateQuestionsWithAI(
        content: ListeningContent,
        count: number,
        types: ListeningQuestionType[],
        ctx: LessonLanguageContext,
    ): Promise<Array<{
        type: typeof EQuestionType[keyof typeof EQuestionType];
        stem: string;
        content: Record<string, unknown>;
        explanation?: string;
    }>> {
        const prompt = this._buildQuestionsPrompt(content, count, types, ctx);

        let drafts: AiQuestionDraft[] = [];

        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.35,
                messages: [
                    {
                        role: 'system',
                        content:
                            'Return only strict JSON. Do not include markdown fences or additional text.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            const parsed = JSON.parse(raw) as { questions?: AiQuestionDraft[] };
            drafts = parsed.questions ?? [];
        } catch (err) {
            logger.error('[ListeningService] OpenAI error during generateQuestions', { err });
            throw new AppError(
                'Không thể tạo câu hỏi bài nghe. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return drafts
            .filter((draft) => types.includes(draft.type))
            .map((draft) => {
                const stem = draft.stem?.trim() ?? '';
                if (!stem) return null;

                if (draft.type === 'MULTIPLE_CHOICE') {
                    const options = (draft.options ?? [])
                        .filter((option) => option.text?.trim().length)
                        .slice(0, 4)
                        .map((option, index) => ({
                            id: `opt_${index + 1}`,
                            text: option.text.trim(),
                            isCorrect: option.isCorrect,
                        }));

                    const hasCorrect = options.some((option) => option.isCorrect);
                    if (options.length < 2 || !hasCorrect) return null;

                    return {
                        type: EQuestionType.MULTIPLE_CHOICE,
                        stem,
                        content: { options },
                        explanation: draft.explanation,
                    };
                }

                if (draft.type === 'FILL_IN_BLANK') {
                    const correctAnswers = (draft.correctAnswers ?? [])
                        .map((answer) => answer.trim())
                        .filter(Boolean)
                        .slice(0, 3);

                    if (!correctAnswers.length) return null;

                    return {
                        type: EQuestionType.FILL_IN_BLANK,
                        stem,
                        content: { correctAnswers },
                        explanation: draft.explanation,
                    };
                }

                const answer = Boolean(draft.answer);
                return {
                    type: EQuestionType.TRUE_FALSE,
                    stem,
                    content: {
                        options: [
                            { id: 'opt_true', text: 'True', isCorrect: answer },
                            { id: 'opt_false', text: 'False', isCorrect: !answer },
                        ],
                    },
                    explanation: draft.explanation,
                };
            })
            .filter((item): item is {
                type: typeof EQuestionType[keyof typeof EQuestionType];
                stem: string;
                content: Record<string, unknown>;
                explanation?: string;
            } => item !== null)
            .slice(0, count);
    }
}
