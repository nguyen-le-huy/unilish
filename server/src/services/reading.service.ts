import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { readingRepo } from '../repositories/mongo/reading.mongo.repository.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { QuestionGenerationService } from './question-generation.service.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { Question, EQuestionType } from '../models/mongo/question.model.js';
import { Concept, EConceptType } from '../models/mongo/concept.model.js';
import { readingTtsQueue } from '../jobs/queues/reading-tts.queue.js';
import type { ReadingContent, ReadingGlossaryItem } from '../types/lesson-content.types.js';
import type {
    SaveReadingContentBody,
    GenerateReadingBody,
    GenerateReadingQuestionsBody,
    UpdateReadingQuestionBody,
} from '../validations/reading.validation.js';

// ─── Singleton Clients ─────────────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

// ─── Internal Types ────────────────────────────────────────────────────────────

interface LessonLanguageContext {
    languageCode: string;
    languageId: string;
    scenario: string;
    keywords: string[];
}

interface GPTReadingResponse {
    text: string;
    translation: string;
    glossary: Record<string, {
        word: string;
        definition: string;
        type: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';
        ipa: string;
    }>;
}

interface AIQuestion {
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'TRUE_FALSE';
    stem: string;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswers?: string[];
    explanation?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class ReadingService {

    // ── READ ──────────────────────────────────────────────────────────────────

    static async getContent(lessonId: string): Promise<ReadingContent> {
        return readingRepo.getContent(lessonId);
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────

    static async saveContent(
        lessonId: string,
        body: SaveReadingContentBody,
    ): Promise<ReadingContent> {
        const existing = await readingRepo.getContent(lessonId);

        const updated: ReadingContent = {
            type: 'READING',
            text: body.text ?? existing.text,
            translation: body.translation ?? existing.translation,
            glossary: body.glossary ?? existing.glossary,
            media: body.media ?? existing.media,
            practiceConfig: {
                mode: 'FIXED',
                questionIds: existing.practiceConfig.questionIds,
                passingScore: body.practiceConfig?.passingScore ?? existing.practiceConfig.passingScore,
            },
            generationStatus: body.generationStatus ?? existing.generationStatus,
        };

        return readingRepo.saveContent(lessonId, updated);
    }

    // ── AI: GENERATE TEXT + GLOSSARY ──────────────────────────────────────────

    static async generateContent(
        lessonId: string,
        body: GenerateReadingBody,
    ): Promise<{ text: string; translation: string; glossary: ReadingContent['glossary'] }> {
        const ctx = await this._resolveLessonContext(lessonId);

        logger.info('[ReadingService] generateContent', {
            lessonId,
            level: body.level,
            textType: body.textType,
        });

        // Mark as GENERATING immediately so UI can show a progress state
        await readingRepo.setGenerationStatus(lessonId, 'GENERATING');

        const prompt = this._buildReadingPrompt(ctx, body);

        let gptData: GPTReadingResponse;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.7,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert EFL reading passage author. Return ONLY valid JSON matching the schema provided.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            gptData = JSON.parse(raw) as GPTReadingResponse;
        } catch (err) {
            logger.error('[ReadingService] OpenAI error during generateContent', { err });
            await readingRepo.setGenerationStatus(lessonId, 'ERROR');
            throw new AppError(
                'Không thể tạo bài đọc. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const text = gptData.text ?? '';
        const translation = gptData.translation ?? '';
        const rawGlossary = gptData.glossary ?? {};

        // Normalize — ensure all mark keys referenced in text actually exist in glossary
        const glossary: ReadingContent['glossary'] = {};
        for (const [key, val] of Object.entries(rawGlossary)) {
            glossary[key] = {
                word: val.word ?? key,
                definition: val.definition ?? '',
                type: val.type ?? 'other',
                ipa: val.ipa ?? '',
            };
        }

        // Persist atomically
        await readingRepo.setTextAndGlossary(lessonId, text, glossary, translation);

        return { text, translation, glossary };
    }

    // ── AI: FILL MISSING GLOSSARY DEFINITIONS ────────────────────────────────

    static async fillGlossary(
        lessonId: string,
    ): Promise<ReadingContent['glossary']> {
        const content = await readingRepo.getContent(lessonId);

        // Find entries where definition is empty
        const missing = Object.entries(content.glossary).filter(
            ([, item]) => !item.definition.trim(),
        );

        if (missing.length === 0) {
            return content.glossary;
        }

        logger.info('[ReadingService] fillGlossary', { lessonId, missing: missing.length });

        const prompt = `
You are an EFL dictionary assistant.
For each item below, fill in the "definition" (Vietnamese) and "ipa" fields.
Return ONLY valid JSON: { "glossary": { "<key>": { "definition": "...", "ipa": "..." }, ... } }

Items:
${missing.map(([k, v]) => `"${k}": { "word": "${v.word}", "type": "${v.type}" }`).join('\n')}
`.trim();

        let filled: { glossary: Record<string, Pick<ReadingGlossaryItem, 'definition' | 'ipa'>> };
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.2,
                messages: [{ role: 'user', content: prompt }],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            filled = JSON.parse(raw) as typeof filled;
        } catch (err) {
            logger.error('[ReadingService] OpenAI error during fillGlossary', { err });
            throw new AppError(
                'Không thể điền định nghĩa từ vựng. Vui lòng thử lại.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // Merge fills into existing glossary
        const updatedGlossary = { ...content.glossary };
        for (const [key, patch] of Object.entries(filled.glossary ?? {})) {
            if (updatedGlossary[key]) {
                updatedGlossary[key] = {
                    ...updatedGlossary[key]!,
                    definition: patch.definition || updatedGlossary[key]!.definition,
                    ipa: patch.ipa || updatedGlossary[key]!.ipa,
                };
            }
        }

        await readingRepo.setTextAndGlossary(lessonId, content.text, updatedGlossary);
        return updatedGlossary;
    }

    // ── AUDIO GENERATION (BullMQ) ─────────────────────────────────────────────

    static async generateAudio(lessonId: string): Promise<void> {
        const content = await readingRepo.getContent(lessonId);

        if (!content.text) {
            throw new AppError(
                'Bài học chưa có nội dung văn bản để tạo âm thanh.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const plainText = this._stripHtmlTags(content.text);

        await readingTtsQueue.add(
            'reading-narration-tts',
            { lessonId, text: plainText, type: 'reading_narration' },
            { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );

        logger.info('[ReadingService] generateAudio queued', { lessonId });
    }

    // ── QUESTION GENERATION ───────────────────────────────────────────────────

    static async generateQuestions(
        lessonId: string,
        body: GenerateReadingQuestionsBody,
    ): Promise<{ questionIds: string[]; count: number }> {
        const content = await readingRepo.getContent(lessonId);

        if (!content.text) {
            throw new AppError(
                'Bài học chưa có văn bản. Hãy tạo nội dung trước.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const ctx = await this._resolveLessonContext(lessonId);
        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);

        const langObjectId = new mongoose.Types.ObjectId(ctx.languageId);

        // Upsert a READING Concept for this lesson
        const conceptKey = `reading_${lessonId}`;
        const concept = await Concept.findOneAndUpdate(
            { languageId: langObjectId, key: conceptKey },
            {
                $setOnInsert: {
                    languageId: langObjectId,
                    key: conceptKey,
                    name: `Reading: ${lesson.title}`,
                    type: EConceptType.READING ?? 'READING',
                    description: content.text.substring(0, 200),
                    metaData: {},
                },
            },
            { upsert: true, new: true, lean: true },
        ).exec();

        if (!concept) {
            throw new AppError('Không thể tạo Concept cho bài đọc', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const count = body.count ?? 5;

        // Delete previously generated questions
        const existingContent = await readingRepo.getContent(lessonId);
        if (existingContent.practiceConfig.questionIds.length > 0) {
            await Question.deleteMany({
                _id: { $in: existingContent.practiceConfig.questionIds },
            }).exec();
        }

        const questions = await this._generateQuestionsWithAI(
            content,
            count,
            lesson.unitId.toString(),
            langObjectId,
            concept._id as mongoose.Types.ObjectId,
            body.types,
        );

        logger.info('[ReadingService] generateQuestions', { lessonId, count: questions.length });

        const inserted = await Question.insertMany(questions);
        const questionIds = inserted.map((q) => q._id.toString());

        await readingRepo.setQuestionIds(lessonId, questionIds);

        return { questionIds, count: questionIds.length };
    }

    // ── QUESTION CRUD ─────────────────────────────────────────────────────────

    static async getQuestions(lessonId: string) {
        const content = await readingRepo.getContent(lessonId);
        const questionIds = content.practiceConfig?.questionIds ?? [];
        if (questionIds.length === 0) return [];

        return Question.find({ _id: { $in: questionIds } }).lean().exec();
    }

    static async swapQuestion(lessonId: string, questionId: string) {
        const existing = await Question.findById(questionId).lean().exec();
        if (!existing) throw new AppError('Câu hỏi không tồn tại', HttpStatus.NOT_FOUND);

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

        const content = await readingRepo.getContent(lessonId);
        const updatedIds = content.practiceConfig.questionIds
            .filter((id) => id.toString() !== questionId)
            .concat(replacement._id.toString());
        await readingRepo.setQuestionIds(lessonId, updatedIds);

        return replacement;
    }

    static async updateQuestion(questionId: string, updates: Record<string, unknown>) {
        return QuestionGenerationService.updateQuestion(questionId, updates);
    }

    static async deleteQuestion(lessonId: string, questionId: string): Promise<void> {
        const content = await readingRepo.getContent(lessonId);
        const remaining = content.practiceConfig.questionIds.filter((id) => id !== questionId);
        await readingRepo.setQuestionIds(lessonId, remaining);
        await Question.findByIdAndDelete(questionId).exec();
        logger.info('[ReadingService] deleteQuestion', { lessonId, questionId });
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
            languageCode: 'en',
            languageId: series.languageId.toString(),
            scenario: unit.contextSeed?.scenario ?? '',
            keywords: unit.contextSeed?.keywords ?? [],
        };
    }

    // ── Private: AI Prompt Builder ─────────────────────────────────────────────

    private static _buildReadingPrompt(
        ctx: LessonLanguageContext,
        body: GenerateReadingBody,
    ): string {
        return `
You are an expert EFL (English as a Foreign Language) content creator specialising in reading comprehension.

Task: Write a reading passage that:
- Is set in this scenario: "${ctx.scenario}"
${body.topic ? `- Topic / desired content: "${body.topic}"` : ''}
- CEFR level: ${body.level}
- Text type: ${body.textType}
- Target word count: approximately ${body.wordCount} words
- Incorporates these vocabulary/concepts: ${ctx.keywords.join(', ')}
- Contains 4–8 key vocabulary words that should be highlighted with <mark data-concept="gen_{n}">…</mark> tags (n = integer starting at 1).
  Each highlighted word must have a corresponding entry in the "glossary" object.

Return ONLY a valid JSON object with this exact structure:
{
  "text": "<HTML passage with <mark data-concept='gen_1'>word</mark> tags>",
  "translation": "<Full Vietnamese translation of the passage — plain text, no HTML>",
  "glossary": {
    "gen_1": { "word": "...", "definition": "... (Vietnamese)", "type": "noun|verb|adjective|adverb|phrase|other", "ipa": "/.../"},
    "gen_2": { ... }
  }
}

RULES:
- The "text" value MUST be valid HTML (use <p> tags for paragraphs).
- "translation" is a full, natural Vietnamese translation of the entire passage (plain text, no HTML).
- Every data-concept value (gen_1, gen_2, …) must have a matching key in "glossary".
- "definition" must be in Vietnamese.
- "ipa" is the IPA transcription of the English word.
- Return only the JSON object — no markdown fences, no extra text.
`.trim();
    }

    // ── Private: AI Question Generation ───────────────────────────────────────

    private static async _generateQuestionsWithAI(
        content: ReadingContent,
        count: number,
        unitId: string,
        languageId: mongoose.Types.ObjectId,
        testedConcept: mongoose.Types.ObjectId,
        types?: string[],
    ): Promise<object[]> {
        const wantFill = !types || types.includes('FILL_IN_BLANK');
        const wantMC   = !types || types.includes('MULTIPLE_CHOICE');
        const wantTF   = !types || types.includes('TRUE_FALSE');

        // Distribute count across requested types
        const enabledTypes = [wantMC && 'MC', wantFill && 'FILL', wantTF && 'TF'].filter(Boolean);
        const base = Math.floor(count / (enabledTypes.length || 1));
        const extra = count % (enabledTypes.length || 1);
        let mcCount   = wantMC   ? base + (extra > 0 ? 1 : 0) : 0;
        let fillCount = wantFill ? base + (extra > 1 ? 1 : 0) : 0;
        let tfCount   = wantTF   ? base : 0;

        // Adjust rounding
        const total = mcCount + fillCount + tfCount;
        if (total < count) mcCount += count - total;

        const instructions: string[] = [];
        if (mcCount > 0) {
            instructions.push(
                `- ${mcCount} questions of type "MULTIPLE_CHOICE": provide EXACTLY 4 options, exactly 1 with "isCorrect": true. No "correctAnswers" field.`,
            );
        }
        if (fillCount > 0) {
            instructions.push(
                `- ${fillCount} questions of type "FILL_IN_BLANK": write a sentence with "____" replacing one key word. Provide 1–2 correct answers in "correctAnswers". No "options" field.`,
            );
        }
        if (tfCount > 0) {
            instructions.push(
                `- ${tfCount} questions of type "MULTIPLE_CHOICE" with True/False: options must be exactly [{ "text": "True", "isCorrect": <bool> }, { "text": "False", "isCorrect": <bool> }].`,
            );
        }

        const plainText = this._stripHtmlTags(content.text);

        const prompt = `
You are an expert EFL content creator. Generate reading comprehension questions based on the passage.

PASSAGE:
"${plainText}"

TASK: Generate exactly ${count} questions:
${instructions.join('\n')}

RULES:
- Questions must test comprehension of the given passage.
- Do NOT copy full sentences verbatim.
- Each question must have a "explanation" in Vietnamese (1 concise sentence).
- Return ONLY valid JSON:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "stem": "...",
      "options": [{ "text": "...", "isCorrect": true }, ...],
      "explanation": "..."
    },
    {
      "type": "FILL_IN_BLANK",
      "stem": "She ____ the report yesterday.",
      "correctAnswers": ["submitted"],
      "explanation": "..."
    }
  ]
}
`.trim();

        let parsed: { questions: AIQuestion[] };
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            parsed = JSON.parse(raw) as { questions: AIQuestion[] };
        } catch (err) {
            logger.error('[ReadingService] AI question generation failed', { err });
            throw new AppError(
                'Không thể tạo câu hỏi bằng AI. Vui lòng thử lại.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const aiQuestions = parsed.questions ?? [];

        return aiQuestions.map((q) => {
            if (q.type === 'MULTIPLE_CHOICE') {
                const opts = (q.options ?? []).slice(0, 4);
                while (opts.length < 4) {
                    opts.push({ text: `[Option ${opts.length + 1}]`, isCorrect: false });
                }
                return {
                    languageId,
                    testedConcept,
                    unitId,
                    type: EQuestionType.MULTIPLE_CHOICE,
                    difficultyLevel: 2,
                    stem: { text: q.stem },
                    content: {
                        options: opts.map((o) => ({ id: uuidv4(), text: o.text, isCorrect: !!o.isCorrect })),
                    },
                    explanation: q.explanation ?? '',
                    tags: ['reading'],
                };
            }

            // FILL_IN_BLANK
            return {
                languageId,
                testedConcept,
                unitId,
                type: EQuestionType.FILL_IN_BLANK,
                difficultyLevel: 2,
                stem: { text: q.stem },
                content: {
                    correctAnswers: (q.correctAnswers ?? []).filter(Boolean),
                },
                explanation: q.explanation ?? '',
                tags: ['reading'],
            };
        });
    }

    // ── Private: Utility ──────────────────────────────────────────────────────

    /**
     * Strip all HTML tags from a string for safe TTS input.
     * Also collapses whitespace to a single space.
     */
    private static _stripHtmlTags(html: string): string {
        return html
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }
}
