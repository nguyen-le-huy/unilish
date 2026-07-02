import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { grammarRepo } from '../repositories/mongo/grammar.mongo.repository.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { QuestionGenerationService } from './question-generation.service.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { Question, EQuestionType, EQuestionSkill } from '../models/mongo/question.model.js';
import { Concept, EConceptType } from '../models/mongo/concept.model.js';
import { grammarTtsQueue } from '../jobs/queues/grammar-tts.queue.js';
import { ContextAlignmentService } from './context-alignment.service.js';
import type {
    GrammarContent,
    GrammarBlogBlock,
    GrammarExplanationBlock,
} from '../types/lesson-content.types.js';
import type {
    SaveGrammarContentBody,
    GenerateGrammarStoryBody,
    GenerateGrammarQuestionsBody,
} from '../validations/grammar.validation.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

interface LessonLanguageContext {
    languageCode: string;
    languageId: string;
    scenario: string;
    keywords: string[];
}

interface AIGeneratedBlogContent {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    readingTime: number;
    conceptName: string;
    hero: {
        hook: string;
        contextSentences: string[];
    };
    blocks: Array<
        | {
            type: 'EXPLANATION';
            heading: string;
            body: string;
            examples: Array<{ en: string; vi: string }>;
            highlightPattern: string;
        }
        | {
            type: 'INLINE_QUIZ';
            instruction: string;
            questions: Array<{
                stem: string;
                type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK';
                options?: string[];
                correct: string;
                acceptedAnswers?: string[];
                explanation: string;
            }>;
        }
        | {
            type: 'CALLOUT';
            variant: 'TIP' | 'WARNING' | 'EXAMPLE' | 'UNIT_CONTEXT';
            text: string;
        }
        | {
            type: 'UNIT_CONTEXT_BLOCK';
            heading: string;
            note: string;
            examples: Array<{ en: string; vi: string }>;
        }
    >;
    summaryTable: {
        columns: [string, string, string];
        rows: [string, string, string][];
    };
}

interface AIQuestionOption {
    text: string;
    isCorrect: boolean;
}

interface AIQuestion {
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'ERROR_CORRECTION';
    stem: string;
    options?: AIQuestionOption[];
    correctAnswers?: string[];
    errorWord?: string | null;
    correction?: string | null;
    isCorrect?: boolean;
    explanation?: string;
}

export class GrammarService {
    static async getContent(lessonId: string): Promise<GrammarContent> {
        return grammarRepo.getContent(lessonId);
    }

    static async saveContent(
        lessonId: string,
        body: SaveGrammarContentBody,
    ): Promise<GrammarContent> {
        this._assertMinimumBlockRules(body.blocks);

        const context = await this._resolveLessonContext(lessonId);
        const searchableText = this._buildSearchableText(body.hero.hook, body.blocks, body.summaryTable.rows);

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [context.scenario, body.conceptName, ...searchableText],
            'GRAMMAR',
        );

        const current = await grammarRepo.getContent(lessonId);

        const content: GrammarContent = {
            type: 'GRAMMAR',
            level: body.level,
            readingTime: body.readingTime,
            conceptName: body.conceptName,
            hero: body.hero,
            heroAudioUrl: current.heroAudioUrl ?? null,
            blocks: body.blocks,
            summaryTable: body.summaryTable,
            practiceConfig: {
                mode: 'FIXED',
                questionIds: current.practiceConfig.questionIds,
                passingScore: body.practiceConfig.passingScore,
            },
            taughtConcepts: body.taughtConcepts,
        };

        return grammarRepo.saveContent(lessonId, content);
    }

    static async generateStory(
        lessonId: string,
        body: GenerateGrammarStoryBody,
    ): Promise<Omit<SaveGrammarContentBody, 'practiceConfig' | 'taughtConcepts'>> {
        const ctx = await this._resolveLessonContext(lessonId);

        logger.info('[GrammarService] generateBlog', {
            lessonId,
            grammarName: body.grammarName,
            level: body.level,
            vocabCount: body.selectedVocab.length,
        });

        const prompt = this._buildBlogPrompt(ctx, body.grammarName, body.level, body.selectedVocab);

        let aiPayload: AIGeneratedBlogContent;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert EFL content creator. Return ONLY valid JSON matching the requested schema.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            aiPayload = JSON.parse(raw) as AIGeneratedBlogContent;
        } catch (error) {
            logger.error('[GrammarService] OpenAI blog generation failed', { error });
            throw new AppError(
                'Không thể tạo blog ngữ pháp bằng AI. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const blocks = (aiPayload.blocks ?? []).map((block) => {
            if (block.type === 'EXPLANATION') {
                return {
                    id: uuidv4(),
                    type: 'EXPLANATION',
                    heading: block.heading,
                    body: block.body,
                    examples: block.examples,
                    highlightPattern: block.highlightPattern,
                } as const;
            }

            if (block.type === 'INLINE_QUIZ') {
                return {
                    id: uuidv4(),
                    type: 'INLINE_QUIZ',
                    instruction: block.instruction,
                    questions: block.questions.map((question) => ({
                        id: uuidv4(),
                        stem: question.stem,
                        type: question.type,
                        options: question.options,
                        correct: question.correct,
                        acceptedAnswers: question.acceptedAnswers,
                        explanation: question.explanation,
                    })),
                } as const;
            }

            if (block.type === 'CALLOUT') {
                return {
                    id: uuidv4(),
                    type: 'CALLOUT',
                    variant: block.variant,
                    text: block.text,
                } as const;
            }

            return {
                id: uuidv4(),
                type: 'UNIT_CONTEXT_BLOCK',
                heading: block.heading,
                note: block.note,
                examples: block.examples,
            } as const;
        });

        this._assertMinimumBlockRules(blocks);

        return {
            level: aiPayload.level ?? body.level,
            readingTime: Math.max(1, aiPayload.readingTime ?? 4),
            conceptName: aiPayload.conceptName || body.grammarName,
            hero: {
                hook: aiPayload.hero?.hook ?? `Learn ${body.grammarName} in context`,
                contextSentences: aiPayload.hero?.contextSentences ?? [],
            },
            blocks,
            summaryTable: aiPayload.summaryTable ?? {
                columns: ['Pattern', 'Usage', 'Example'],
                rows: [],
            },
        };
    }

    static async generateQuestions(
        lessonId: string,
        body: GenerateGrammarQuestionsBody,
    ): Promise<{ questionIds: string[]; count: number }> {
        const content = await grammarRepo.getContent(lessonId);

        if (!content.blocks.length) {
            throw new AppError('Bài học chưa có nội dung blog ngữ pháp.', HttpStatus.BAD_REQUEST);
        }

        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const ctx = await this._resolveLessonContext(lessonId);
        const languageId = new mongoose.Types.ObjectId(ctx.languageId);

        const conceptKey = `grammar_${content.conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        const concept = await Concept.findOneAndUpdate(
            { languageId, key: conceptKey },
            {
                $setOnInsert: {
                    languageId,
                    key: conceptKey,
                    name: content.conceptName,
                    type: EConceptType.GRAMMAR,
                    description: content.hero.hook,
                    metaData: {
                        explanationBlocks: content.blocks.filter((item) => item.type === 'EXPLANATION').length,
                    },
                },
            },
            { upsert: true, new: true, lean: true },
        ).exec();

        if (!concept) {
            throw new AppError('Không thể tạo concept cho grammar lesson', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (content.practiceConfig.questionIds.length > 0) {
            await Question.deleteMany({ _id: { $in: content.practiceConfig.questionIds } }).exec();
        }

        const count = body.count ?? 10;
        const generated = await this._generateQuestionsWithAI(
            content,
            count,
            lesson.unitId.toString(),
            languageId,
            concept._id as mongoose.Types.ObjectId,
            body.types,
        );

        const inserted = await Question.insertMany(
            generated.map((question) => ({
                ...question,
                skill: EQuestionSkill.GRAMMAR,
            })),
        );
        const questionIds = inserted.map((item) => item._id.toString());

        await grammarRepo.setQuestionIds(lessonId, questionIds);

        return { questionIds, count: questionIds.length };
    }

    static async generateAudio(lessonId: string): Promise<void> {
        const content = await grammarRepo.getContent(lessonId);

        if (!content.hero.hook) {
            throw new AppError('Bài học chưa có phần mở đầu để tạo âm thanh.', HttpStatus.BAD_REQUEST);
        }

        await grammarTtsQueue.add(
            'grammar-story-tts',
            { lessonId, text: content.hero.hook, type: 'grammar_story' },
            { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        );

        logger.info('[GrammarService] generateAudio queued', { lessonId });
    }

    static async getQuestions(lessonId: string) {
        const content = await grammarRepo.getContent(lessonId);
        const questionIds = content.practiceConfig.questionIds;
        if (!questionIds.length) {
            return [];
        }

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
            throw new AppError('Không có câu hỏi thay thế phù hợp.', HttpStatus.NOT_FOUND);
        }

        const replacement = alternatives[0]!;

        const content = await grammarRepo.getContent(lessonId);
        const updated = content.practiceConfig.questionIds
            .filter((id) => id !== questionId)
            .concat(replacement._id.toString());

        await grammarRepo.setQuestionIds(lessonId, updated);

        return replacement;
    }

    static async updateQuestion(questionId: string, updates: Record<string, unknown>) {
        return QuestionGenerationService.updateQuestion(questionId, updates);
    }

    static async deleteQuestion(lessonId: string, questionId: string): Promise<void> {
        const content = await grammarRepo.getContent(lessonId);
        const remaining = content.practiceConfig.questionIds.filter((id) => id !== questionId);
        await grammarRepo.setQuestionIds(lessonId, remaining);
        await Question.findByIdAndDelete(questionId).exec();
        logger.info('[GrammarService] deleteQuestion', { lessonId, questionId });
    }

    private static _assertMinimumBlockRules(blocks: GrammarBlogBlock[]): void {
        const explanationCount = blocks.filter((block) => block.type === 'EXPLANATION').length;
        const inlineQuizCount = blocks.filter((block) => block.type === 'INLINE_QUIZ').length;
        const unitContextCount = blocks.filter((block) => block.type === 'UNIT_CONTEXT_BLOCK').length;

        if (explanationCount < 4) {
            throw new AppError('Bài học cần tối thiểu 4 block EXPLANATION.', HttpStatus.BAD_REQUEST);
        }

        if (inlineQuizCount < 1) {
            throw new AppError('Bài học cần ít nhất 1 block INLINE_QUIZ.', HttpStatus.BAD_REQUEST);
        }

        if (unitContextCount < 1) {
            throw new AppError('Bài học cần ít nhất 1 block UNIT_CONTEXT_BLOCK.', HttpStatus.BAD_REQUEST);
        }
    }

    private static _buildSearchableText(
        hook: string,
        blocks: GrammarBlogBlock[],
        summaryRows: [string, string, string][],
    ): string[] {
        const lines: string[] = [hook];

        blocks.forEach((block) => {
            if (block.type === 'EXPLANATION') {
                lines.push(block.heading, block.body);
                block.examples.forEach((example) => lines.push(example.en, example.vi));
                return;
            }

            if (block.type === 'INLINE_QUIZ') {
                lines.push(block.instruction);
                block.questions.forEach((question) => lines.push(question.stem, question.explanation));
                return;
            }

            if (block.type === 'CALLOUT') {
                lines.push(block.text);
                return;
            }

            lines.push(block.heading, block.note);
            block.examples.forEach((example) => lines.push(example.en, example.vi));
        });

        summaryRows.forEach((row) => lines.push(row[0], row[1], row[2]));

        return lines.filter(Boolean);
    }

    private static async _resolveLessonContext(lessonId: string): Promise<LessonLanguageContext> {
        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);

        const unit = await Unit.findById(lesson.unitId).select('contextSeed courseId').lean().exec();
        if (!unit) throw new AppError('Chương học không tồn tại', HttpStatus.NOT_FOUND);

        const course = await Course.findById(unit.courseId).select('languageId').lean().exec();
        if (!course) throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);

        return {
            languageCode: 'en',
            languageId: course.languageId.toString(),
            scenario: unit.contextSeed?.scenario ?? '',
            keywords: unit.contextSeed?.keywords ?? [],
        };
    }

    private static _buildBlogPrompt(
        ctx: LessonLanguageContext,
        grammarName: string,
        level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2',
        selectedVocab: string[],
    ): string {
        return `
Write a grammar lesson blog in JSON for CEFR level ${level}.
Scenario: ${ctx.scenario}
Concept: ${grammarName}
Unit keywords: ${ctx.keywords.join(', ')}
Required vocab to include in examples: ${selectedVocab.join(', ')}

Return ONLY JSON with fields:
{
  "level": "${level}",
  "readingTime": 4,
  "conceptName": "${grammarName}",
  "hero": { "hook": "...", "contextSentences": ["..."] },
  "blocks": [
    { "type": "EXPLANATION", "heading": "...", "body": "...", "examples": [{"en":"...","vi":"..."}], "highlightPattern": "..." },
    { "type": "INLINE_QUIZ", "instruction": "...", "questions": [{"stem":"...","type":"MULTIPLE_CHOICE","options":["..."],"correct":"...","explanation":"..."}] },
    { "type": "CALLOUT", "variant": "TIP", "text": "..." },
    { "type": "UNIT_CONTEXT_BLOCK", "heading": "...", "note": "...", "examples": [{"en":"...","vi":"..."}] }
  ],
  "summaryTable": {
    "columns": ["Giới từ", "Dùng khi nào", "Ví dụ"],
    "rows": [["AT", "...", "..."]]
  }
}

Rules:
- At least 4 EXPLANATION blocks.
- At least 1 INLINE_QUIZ block.
- At least 1 UNIT_CONTEXT_BLOCK block.
- Keep English examples natural and Vietnamese translations concise.
`.trim();
    }

    private static _buildQuestionPrompt(content: GrammarContent, count: number, types?: string[]): string {
        const explanationBlocks = content.blocks.filter(
            (block): block is GrammarExplanationBlock => block.type === 'EXPLANATION',
        );

        const explanationText = explanationBlocks
            .map((block) => `${block.heading}: ${block.body}`)
            .join('\n');

        const typeRule = !types || types.length === 0
            ? 'Use a balanced mix of MULTIPLE_CHOICE, FILL_IN_BLANK, ERROR_CORRECTION.'
            : `Use only these question types: ${types.join(', ')}`;

        return `
Generate exactly ${count} grammar practice questions in JSON.
Concept: ${content.conceptName}
Hero hook: ${content.hero.hook}
Key rules:
${explanationText}

${typeRule}

Return ONLY JSON:
{
  "questions": [
    {
      "type": "MULTIPLE_CHOICE",
      "stem": "...",
      "options": [{"text":"...","isCorrect":true}],
      "explanation": "..."
    },
    {
      "type": "FILL_IN_BLANK",
      "stem": "... _____ ...",
      "correctAnswers": ["..."],
      "explanation": "..."
    },
    {
      "type": "ERROR_CORRECTION",
      "stem": "...",
      "errorWord": "about",
      "correction": "in",
      "isCorrect": false,
      "explanation": "..."
    }
  ]
}
`.trim();
    }

    private static async _generateQuestionsWithAI(
        content: GrammarContent,
        count: number,
        unitId: string,
        languageId: mongoose.Types.ObjectId,
        testedConcept: mongoose.Types.ObjectId,
        types?: string[],
    ): Promise<object[]> {
        const prompt = this._buildQuestionPrompt(content, count, types);

        let parsed: { questions: AIQuestion[] };
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert EFL question writer. Return valid JSON only.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            parsed = JSON.parse(raw) as { questions: AIQuestion[] };
        } catch (error) {
            logger.error('[GrammarService] AI question generation failed', { error });
            throw new AppError('Không thể tạo câu hỏi bằng AI. Vui lòng thử lại.', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const aiQuestions = parsed.questions ?? [];
        const safeQuestions = aiQuestions.slice(0, count);

        return safeQuestions.map((question) => {
            if (question.type === 'MULTIPLE_CHOICE') {
                const options = (question.options ?? []).slice(0, 4);
                while (options.length < 4) {
                    options.push({ text: `Option ${options.length + 1}`, isCorrect: false });
                }

                return {
                    languageId,
                    testedConcept,
                    unitId,
                    type: EQuestionType.MULTIPLE_CHOICE,
                    difficultyLevel: 2,
                    stem: { text: question.stem },
                    content: {
                        options: options.map((option) => ({ id: uuidv4(), text: option.text, isCorrect: !!option.isCorrect })),
                    },
                    explanation: question.explanation ?? '',
                    tags: ['grammar', content.conceptName.toLowerCase().replace(/\s+/g, '_')],
                };
            }

            if (question.type === 'ERROR_CORRECTION') {
                return {
                    languageId,
                    testedConcept,
                    unitId,
                    type: EQuestionType.ERROR_CORRECTION,
                    difficultyLevel: 2,
                    stem: { text: question.stem },
                    content: {
                        errorWord: question.errorWord ?? null,
                        correction: question.correction ?? null,
                        isCorrect: !!question.isCorrect,
                    },
                    explanation: question.explanation ?? '',
                    tags: ['grammar', 'error_correction'],
                };
            }

            return {
                languageId,
                testedConcept,
                unitId,
                type: EQuestionType.FILL_IN_BLANK,
                difficultyLevel: 2,
                stem: { text: question.stem },
                content: {
                    correctAnswers: (question.correctAnswers ?? []).filter(Boolean),
                },
                explanation: question.explanation ?? '',
                tags: ['grammar', 'fill_in_blank'],
            };
        });
    }
}
