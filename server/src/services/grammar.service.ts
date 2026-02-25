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
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { Question, EQuestionType } from '../models/mongo/question.model.js';
import { Concept, EConceptType } from '../models/mongo/concept.model.js';
import { grammarTtsQueue } from '../jobs/queues/grammar-tts.queue.js';
import { ContextAlignmentService } from './context-alignment.service.js';
import type {
    GrammarContent,
    ContextStory,
    GrammarRule,
    HighlightInfo,
    GrammarFormula,
    IrregularVerb,
} from '../types/lesson-content.types.js';
import type {
    SaveGrammarContentBody,
    GenerateGrammarStoryBody,
    GenerateGrammarQuestionsBody,
} from '../validations/grammar.validation.js';

// ─── Singleton Clients ─────────────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

// ─── Internal Types ────────────────────────────────────────────────────────────

interface LessonLanguageContext {
    languageCode: string;
    languageId: string;  // ObjectId string of the Language document
    scenario: string;
    keywords: string[];
}

interface GPTStoryResponse {
    story_en: string;
    story_vi: string;
    highlights: Array<{
        word: string;
        root: string;
        type: 'regular_verb' | 'irregular_verb' | 'grammar_particle' | 'other';
    }>;
    rule: {
        name: string;
        usage: string;
        formulas: Array<{
            type: 'positive' | 'negative' | 'question' | 'other';
            structure: string;
            example: string;
        }>;
        irregular_verbs: Array<{ base: string; past: string }>;
    };
}

interface AIQuestionOption {
    text: string;
    isCorrect: boolean;
}

interface AIQuestion {
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK';
    stem: string;
    options?: AIQuestionOption[];      // MULTIPLE_CHOICE only
    correctAnswers?: string[];          // FILL_IN_BLANK only
    explanation?: string;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class GrammarService {

    // ── READ ──────────────────────────────────────────────────────────────────

    static async getContent(lessonId: string): Promise<GrammarContent> {
        return grammarRepo.getContent(lessonId);
    }

    // ── SAVE ──────────────────────────────────────────────────────────────────

    static async saveContent(
        lessonId: string,
        body: SaveGrammarContentBody,
    ): Promise<GrammarContent> {
        const context = await this._resolveLessonContext(lessonId);

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                context.scenario,
                body.context_story.text,
                body.context_story.translation,
                body.grammar_rule.name,
                body.grammar_rule.usage,
                ...body.grammar_rule.formulas.map((formula) => `${formula.structure} ${formula.example}`),
            ],
            'GRAMMAR',
        );

        const content: GrammarContent = {
            type: 'GRAMMAR',
            context_story: body.context_story,
            grammar_rule: body.grammar_rule,
            practiceConfig: {
                mode: 'FIXED',
                questionIds: (await grammarRepo.getContent(lessonId)).practiceConfig.questionIds,
                passingScore: body.practiceConfig.passingScore,
            },
            taughtConcepts: body.taughtConcepts,
        };

        return grammarRepo.saveContent(lessonId, content);
    }

    // ── AI STORY GENERATION ───────────────────────────────────────────────────

    static async generateStory(
        lessonId: string,
        body: GenerateGrammarStoryBody,
    ): Promise<{ context_story: ContextStory; grammar_rule: GrammarRule }> {
        const ctx = await this._resolveLessonContext(lessonId);

        logger.info('[GrammarService] generateStory', {
            lessonId,
            grammarName: body.grammarName,
            vocabCount: body.selectedVocab.length,
        });

        const prompt = this._buildStoryPrompt(ctx, body.grammarName, body.selectedVocab);

        let storyData: GPTStoryResponse;
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                temperature: 0.7,
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are an expert EFL content creator. Return ONLY valid JSON matching the schema provided.',
                    },
                    { role: 'user', content: prompt },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            storyData = JSON.parse(raw) as GPTStoryResponse;
        } catch (err) {
            logger.error('[GrammarService] OpenAI error', { err });
            throw new AppError(
                'Không thể tạo câu chuyện ngữ pháp. Vui lòng thử lại sau.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // Map GPT response → typed structures
        const contextStory: ContextStory = {
            text: storyData.story_en ?? '',
            translation: storyData.story_vi ?? '',
            audioUrl: null, // Will be filled by generate-audio endpoint
            highlights: (storyData.highlights ?? []).map(
                (h): HighlightInfo => ({
                    id: uuidv4(),
                    word: h.word,
                    type: h.type,
                    root: h.root,
                }),
            ),
        };

        const grammarRule: GrammarRule = {
            name: storyData.rule?.name ?? body.grammarName,
            usage: storyData.rule?.usage ?? '',
            formulas: (storyData.rule?.formulas ?? []).map(
                (f): GrammarFormula => ({
                    id: uuidv4(),
                    type: f.type,
                    structure: f.structure,
                    example: f.example,
                }),
            ),
            irregular_verbs: (storyData.rule?.irregular_verbs ?? []).map(
                (v): IrregularVerb => ({
                    id: uuidv4(),
                    base: v.base,
                    past: v.past,
                }),
            ),
        };

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                ctx.scenario,
                contextStory.text,
                contextStory.translation,
                grammarRule.name,
                grammarRule.usage,
                ...grammarRule.formulas.map((formula) => `${formula.structure} ${formula.example}`),
            ],
            'GRAMMAR',
        );

        return { context_story: contextStory, grammar_rule: grammarRule };
    }

    // ── QUESTION GENERATION ───────────────────────────────────────────────────

    static async generateQuestions(
        lessonId: string,
        body: GenerateGrammarQuestionsBody,
    ): Promise<{ questionIds: string[]; count: number }> {
        const content = await grammarRepo.getContent(lessonId);

        if (!content.context_story.text) {
            throw new AppError(
                'Bài học chưa có câu chuyện ngữ pháp. Tạo câu chuyện trước.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const lesson = await lessonRepo.findByIdFull(lessonId);
        if (!lesson) throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);

        // Resolve language context to get the real languageId ObjectId
        const ctx = await this._resolveLessonContext(lessonId);
        const langObjectId = new mongoose.Types.ObjectId(ctx.languageId);

        // Upsert a GRAMMAR Concept for this rule (key = grammar_<slug>)
        const conceptKey = `grammar_${content.grammar_rule.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        const concept = await Concept.findOneAndUpdate(
            { languageId: langObjectId, key: conceptKey },
            {
                $setOnInsert: {
                    languageId: langObjectId,
                    key: conceptKey,
                    name: content.grammar_rule.name,
                    type: EConceptType.GRAMMAR,
                    description: content.grammar_rule.usage,
                    metaData: {
                        formulas: content.grammar_rule.formulas.map((f) => f.structure),
                    },
                },
            },
            { upsert: true, new: true, lean: true },
        ).exec();

        if (!concept) throw new AppError('Không thể tạo Concept cho ngữ pháp', HttpStatus.INTERNAL_SERVER_ERROR);

        const count = body.count ?? 5;

        // Bulk-delete any previously generated questions for this lesson
        const existingContent = await grammarRepo.getContent(lessonId);
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

        logger.info('[GrammarService] generateQuestions', { lessonId, count: questions.length });

        // Bulk insert → get ObjectIds
        const inserted = await Question.insertMany(questions);
        const questionIds = inserted.map((q) => q._id.toString());

        // Persist question IDs into lesson content
        await grammarRepo.setQuestionIds(lessonId, questionIds);

        return { questionIds, count: questionIds.length };
    }

    // ── AUDIO GENERATION ──────────────────────────────────────────────────────

    static async generateAudio(lessonId: string): Promise<void> {
        const content = await grammarRepo.getContent(lessonId);

        if (!content.context_story.text) {
            throw new AppError(
                'Bài học chưa có nội dung câu chuyện để tạo âm thanh.',
                HttpStatus.BAD_REQUEST,
            );
        }

        await grammarTtsQueue.add(
            'grammar-story-tts',
            { lessonId, text: content.context_story.text, type: 'grammar_story' },
            { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        );

        logger.info('[GrammarService] generateAudio queued', { lessonId });
    }

    // ── QUESTION CRUD (delegate to QuestionGenerationService) ────────────────────

    static async getQuestions(lessonId: string) {
        // Grammar question IDs live in lesson.content.practiceConfig.questionIds,
        // NOT in lesson.practiceConfig.questionIds — use grammarRepo to read the right path.
        const content = await grammarRepo.getContent(lessonId);
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
                'Không có câu hỏi thay thế trong ngân hàng đề cho concept này.',
                HttpStatus.NOT_FOUND,
            );
        }

        const replacement = alternatives[0]!;

        // Grammar stores IDs at content.practiceConfig.questionIds, NOT at practiceConfig.questionIds
        const content = await grammarRepo.getContent(lessonId);
        const updated = content.practiceConfig.questionIds
            .filter((id) => id.toString() !== questionId)
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

    private static _buildStoryPrompt(
        ctx: LessonLanguageContext,
        grammarName: string,
        vocab: string[],
    ): string {
        return `
You are an expert EFL (English as a Foreign Language) content creator.

Task: Create a short contextual story (4-6 sentences) that:
- Is set in this scenario: "${ctx.scenario}"
- Demonstrates the grammar concept: "${grammarName}"
- Naturally incorporates these vocabulary words: ${vocab.join(', ')}
- Uses the target grammar at least 3 times

Return ONLY a JSON object with this exact structure:
{
  "story_en": "<English story text>",
  "story_vi": "<Vietnamese translation>",
  "highlights": [
    { "word": "<inflected form in story>", "root": "<base infinitive form>", "type": "regular_verb|irregular_verb|grammar_particle|other" }
  ],
  "rule": {
    "name": "${grammarName}",
    "usage": "<1-2 sentences explaining when/why to use this grammar>",
    "formulas": [
      { "type": "positive|negative|question|other", "structure": "<formula>", "example": "<example sentence>" }
    ],
    "irregular_verbs": [
      { "base": "<base form>", "past": "<past form>" }
    ]
  }
}

Only include irregular_verbs if the grammar concept actually involves irregular forms.
Highlights must only include words that appear verbatim in story_en.
`.trim();
    }

    // ── AI QUESTION GENERATION ────────────────────────────────────────────────

    private static async _generateQuestionsWithAI(
        content: GrammarContent,
        count: number,
        unitId: string,
        languageId: mongoose.Types.ObjectId,
        testedConcept: mongoose.Types.ObjectId,
        types?: string[],
    ): Promise<object[]> {
        const rule  = content.grammar_rule;
        const story = content.context_story;
        const tag   = rule.name.toLowerCase().replace(/\s+/g, '_');

        const wantFill = !types || types.includes('FILL_IN_BLANK');
        const wantMC   = !types || types.includes('MULTIPLE_CHOICE');

        let fillCount = 0;
        let mcCount   = 0;
        if (wantFill && wantMC) {
            fillCount = Math.ceil(count / 2);
            mcCount   = Math.floor(count / 2);
        } else if (wantFill) {
            fillCount = count;
        } else if (wantMC) {
            mcCount = count;
        }

        // ── Build prompt ──────────────────────────────────────────────────────
        const typeInstructions: string[] = [];
        if (fillCount > 0) {
            typeInstructions.push(
                `- ${fillCount} questions of type "FILL_IN_BLANK": write a NEW original sentence (do NOT copy sentences from the story) that uses the target grammar. Replace exactly ONE word or phrase with "_____". Provide 1-2 correct answers. FILL_IN_BLANK must NOT have an "options" field.`,
            );
        }
        if (mcCount > 0) {
            typeInstructions.push(
                `- ${mcCount} questions of type "MULTIPLE_CHOICE": write a fresh question stem, then provide EXACTLY 4 options. Exactly 1 option must have "isCorrect": true. MULTIPLE_CHOICE must NOT have a "correctAnswers" field.`,
            );
        }

        const prompt = `
You are an expert EFL content creator. Generate practice questions for the grammar concept below.

GRAMMAR RULE
Name: ${rule.name}
Usage: ${rule.usage}
Formulas: ${rule.formulas.map((f) => `${f.type}: ${f.structure} (e.g. "${f.example}")`).join(' | ')}

CONTEXT STORY (for reference only — do NOT copy its sentences verbatim into questions):
"${story.text}"

TASK
Generate exactly ${count} questions following these rules:
${typeInstructions.join('\n')}

IMPORTANT RULES:
- Do NOT copy any sentence from the story word-for-word.
- Every MULTIPLE_CHOICE question MUST have EXACTLY 4 options — no more, no less.
- Exactly 1 option per MULTIPLE_CHOICE must be "isCorrect": true.
- Make distractors plausible but clearly wrong (e.g. wrong verb form, wrong auxiliary).
- Each question must have a concise "explanation" field (1 sentence, in Vietnamese).
- Return ONLY a valid JSON object with this exact shape — no markdown, no extra text:

{
  "questions": [
    {
      "type": "FILL_IN_BLANK",
      "stem": "She _____ very happy today.",
      "correctAnswers": ["is"],
      "explanation": "Dùng 'is' với chủ ngữ ngôi thứ ba số ít."
    },
    {
      "type": "MULTIPLE_CHOICE",
      "stem": "Which sentence is correct?",
      "options": [
        { "text": "I am a student.", "isCorrect": true },
        { "text": "I are a student.", "isCorrect": false },
        { "text": "I is a student.", "isCorrect": false },
        { "text": "I be a student.", "isCorrect": false }
      ],
      "explanation": "Với chủ ngữ 'I', động từ to be ở dạng 'am'."
    }
  ]
}
`.trim();

        // ── Call OpenAI ───────────────────────────────────────────────────────
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
            logger.error('[GrammarService] AI question generation failed', { err });
            throw new AppError(
                'Không thể tạo câu hỏi bằng AI. Vui lòng thử lại.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const aiQuestions = parsed.questions ?? [];

        // ── Map to Question documents ─────────────────────────────────────────
        return aiQuestions.map((q) => {
            if (q.type === 'MULTIPLE_CHOICE') {
                // Guarantee exactly 4 options with IDs
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
                    tags: ['grammar', tag],
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
                tags: ['grammar', tag],
            };
        });
    }
}
