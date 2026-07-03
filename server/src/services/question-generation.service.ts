import { Types } from 'mongoose';
import {
    Question,
    EQuestionType,
    EQuestionSkill,
    EQuestionStatus,
} from '../models/mongo/question.model.js';
import { Lesson } from '../models/mongo/lesson.model.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { logger } from '../utils/logger.js';
import type { VocabContent, VocabItem } from '../types/lesson-content.types.js';

// ─── Content Shape Interfaces ─────────────────────────────────────────────────

interface MCOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface MCContent {
    options: MCOption[];
}

interface FillContent {
    correctAnswers: string[];
}

interface MatchPair {
    id: string;
    word: string;
    definition: string;
}

interface MatchContent {
    pairs: MatchPair[];
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle — returns a new array.
 */
function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
}

/**
 * Split array into chunks of `size`.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Escape special regex characters from a string.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class QuestionGenerationService {
    // ── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Resolves the languageId by traversing the ownership chain:
     * Lesson → Unit → Course → CourseSeries → languageId
     */
    private static async resolveLanguageId(lessonId: string): Promise<string> {
        const lesson = await Lesson.findById(lessonId)
            .select('unitId')
            .lean()
            .exec() as { unitId: Types.ObjectId } | null;

        if (!lesson) {
            throw new AppError('Lesson not found', HttpStatus.NOT_FOUND);
        }

        const unit = await Unit.findById(lesson.unitId)
            .select('courseId')
            .lean()
            .exec() as { courseId: Types.ObjectId } | null;

        if (!unit) {
            throw new AppError('Unit not found for this lesson', HttpStatus.NOT_FOUND);
        }

        const course = await Course.findById(unit.courseId)
            .select('languageId')
            .lean()
            .exec() as { languageId: Types.ObjectId } | null;

        if (!course) {
            throw new AppError('Course not found for this unit', HttpStatus.NOT_FOUND);
        }

        return course.languageId.toString();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Retrieve all questions currently associated with a lesson.
     */
    static async getQuestionsForLesson(lessonId: string) {
        const lesson = await Lesson.findById(lessonId)
            .select('practiceConfig.questionIds')
            .lean()
            .exec() as { practiceConfig: { questionIds: Types.ObjectId[] } } | null;

        if (!lesson) {
            throw new AppError('Lesson not found', HttpStatus.NOT_FOUND);
        }

        const questionIds = lesson.practiceConfig?.questionIds ?? [];
        if (questionIds.length === 0) return [];

        return Question.find({ _id: { $in: questionIds } })
            .lean()
            .exec();
    }

    /**
     * Programmatically generate questions from vocab items:
     * - MULTIPLE_CHOICE  (audio → pick the correct word from 4)
     * - FILL_IN_BLANK    (example sentence with target word blanked out)
     * - MATCHING         (groups of words ↔ native definitions)
     *
     * Old questions for the lesson are deleted before creating new ones.
     */
    static async generateQuestionsFromVocab(
        lessonId: string,
        distribution: { mc: number; fill: number; match: number },
    ) {
        // ── 1. Fetch lesson with vocab content ────────────────────────────────
        const lessonDoc = await Lesson.findById(lessonId)
            .select('content practiceConfig')
            .lean()
            .exec() as {
                content: VocabContent | null;
                practiceConfig: { questionIds: Types.ObjectId[] };
            } | null;

        if (!lessonDoc) {
            throw new AppError('Lesson not found', HttpStatus.NOT_FOUND);
        }

        const vocabContent = lessonDoc.content as VocabContent | null;

        if (!vocabContent || vocabContent.type !== 'VOCAB' || vocabContent.items.length === 0) {
            throw new AppError(
                'Lesson chưa có nội dung từ vựng. Hãy tạo vocabulary trước.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // Only use items that have been concept-mapped (conceptId is available)
        const mappedItems: VocabItem[] = vocabContent.items.filter(
            (i) => i.conceptId !== null,
        );

        if (mappedItems.length === 0) {
            throw new AppError(
                'Các từ vựng chưa được liên kết Concept. Hãy lưu vocabulary sau khi generate.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // ── 2. Resolve language ───────────────────────────────────────────────
        const languageId = await QuestionGenerationService.resolveLanguageId(lessonId);
        const langObjectId = new Types.ObjectId(languageId);

        // ── 3. Delete existing questions for this lesson ──────────────────────
        const existingIds = lessonDoc.practiceConfig?.questionIds ?? [];
        if (existingIds.length > 0) {
            await Question.deleteMany({ _id: { $in: existingIds } }).exec();
        }

        // ── 4. Use caller-supplied distribution ───────────────────────────────
        const matchGroupSize = Math.min(5, Math.max(2, mappedItems.length));
        const effectiveMatchGroupSize = mappedItems.length >= 6 ? 3 : matchGroupSize;
        const mcCount = distribution.mc;
        const fillCount = distribution.fill;
        const matchCount = distribution.match;

        const allWords = mappedItems.map((i) => i.word);
        const createdIds: Types.ObjectId[] = [];

        // ── 5. MULTIPLE_CHOICE ────────────────────────────────────────────────
        // Requires at least 4 items for meaningful distractors
        if (mappedItems.length >= 4 && mcCount > 0) {
            const repeats = Math.ceil(mcCount / mappedItems.length);
            const mcPool = Array.from({ length: repeats }, () => shuffleArray(mappedItems)).flat();
            const mcItems = mcPool.slice(0, mcCount);
            for (const item of mcItems) {
                const distractors = shuffleArray(allWords.filter((w) => w !== item.word)).slice(0, 3);
                const options: MCOption[] = shuffleArray([
                    { id: 'opt_correct', text: item.word, isCorrect: true },
                    { id: 'opt_1', text: distractors[0]!, isCorrect: false },
                    { id: 'opt_2', text: distractors[1]!, isCorrect: false },
                    { id: 'opt_3', text: distractors[2]!, isCorrect: false },
                ]);

                const q = await Question.create({
                    languageId: langObjectId,
                    testedConcept: new Types.ObjectId(item.conceptId!),
                    skill: EQuestionSkill.VOCABULARY,
                    type: EQuestionType.MULTIPLE_CHOICE,
                    difficultyLevel: 1,
                    stem: {
                        ...(item.audioWordUrl !== null && { audioUrl: item.audioWordUrl }),
                        text: 'Nghe và chọn từ đúng:',
                    },
                    content: { options },
                    explanation: `"${item.word}" − ${item.definitionNative || item.definitionEn}`,
                    tags: ['vocab', 'audio-matching'],
                    status: EQuestionStatus.PUBLISHED,
                });
                createdIds.push((q._id as Types.ObjectId));
            }
        }

        // ── 6. FILL_IN_BLANK ──────────────────────────────────────────────────
        if (fillCount > 0) {
        const repeats = Math.ceil(fillCount / mappedItems.length);
        const fillPool = Array.from({ length: repeats }, () => shuffleArray(mappedItems)).flat();
        const fillItems = fillPool.slice(0, fillCount);
        for (const item of fillItems) {
            const wordRegex = new RegExp(`\\b(${escapeRegex(item.word)})\\b`, 'gi');
            const blankSentence = wordRegex.test(item.exampleSentence)
                ? item.exampleSentence.replace(wordRegex, '_____')
                : `${item.exampleSentence} [từ: ${item.word}]`;

            const q = await Question.create({
                languageId: langObjectId,
                testedConcept: new Types.ObjectId(item.conceptId!),
                skill: EQuestionSkill.VOCABULARY,
                type: EQuestionType.FILL_IN_BLANK,
                difficultyLevel: 2,
                stem: { text: blankSentence },
                content: {
                    correctAnswers: [item.word.toLowerCase(), item.word],
                },
                explanation: `"${item.word}" nghĩa là: ${item.definitionNative || item.definitionEn}. Dịch: ${item.exampleTranslation}`,
                tags: ['vocab', 'fill-in-blank'],
                status: EQuestionStatus.PUBLISHED,
            });
            createdIds.push(q._id as Types.ObjectId);
        }
        } // end fillCount > 0

        // ── 7. MATCHING ───────────────────────────────────────────────────────
        // Cycle through shuffled items to fill the requested matchCount.
        if (matchCount > 0) {
        // Build a long-enough repeated pool so slice always has enough items
        const repeatsNeeded = Math.ceil((matchCount * effectiveMatchGroupSize) / mappedItems.length);
        const pool = Array.from({ length: repeatsNeeded }, () => shuffleArray(mappedItems)).flat();
        const matchGroups = chunkArray(pool, effectiveMatchGroupSize).slice(0, matchCount);

        for (const group of matchGroups) {
            const anchor = group[0];
            if (!anchor) continue;

            const pairs: MatchPair[] = group.map((i) => ({
                id: i.id,
                word: i.word,
                definition: i.definitionNative || i.definitionEn,
            }));

            const q = await Question.create({
                languageId: langObjectId,
                testedConcept: new Types.ObjectId(anchor.conceptId!),
                skill: EQuestionSkill.VOCABULARY,
                type: EQuestionType.MATCHING,
                difficultyLevel: 3,
                stem: { text: 'Nối mỗi từ với định nghĩa đúng của nó:' },
                content: { pairs },
                explanation: 'Kiểm tra khả năng nhận biết từ vựng và định nghĩa.',
                tags: ['vocab', 'matching'],
                status: EQuestionStatus.PUBLISHED,
            });
            createdIds.push(q._id as Types.ObjectId);
        }
        } // end matchCount > 0

        // ── 8. Persist questionIds on the lesson ──────────────────────────────
        await Lesson.findByIdAndUpdate(lessonId, {
            $set: { 'practiceConfig.questionIds': createdIds },
        }).exec();

        logger.info(
            `[QuestionGen] Generated ${createdIds.length} questions for lesson ${lessonId}`,
        );

        // Re-fetch the saved questions with their full data
        return Question.find({ _id: { $in: createdIds } }).lean().exec();
    }

    /**
     * Find a random alternative question for the same concept + type from the bank.
     * Replaces the old question ID in lesson.practiceConfig.questionIds.
     */
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
                    status: EQuestionStatus.PUBLISHED,
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

        // Atomically swap the ID in the lesson's questionIds list
        await Lesson.findByIdAndUpdate(lessonId, {
            $pull: { 'practiceConfig.questionIds': existing._id },
        }).exec();
        await Lesson.findByIdAndUpdate(lessonId, {
            $addToSet: { 'practiceConfig.questionIds': replacement._id },
        }).exec();

        return replacement;
    }

    /**
     * Partial-update a question's stem, explanation, or content.
     */
    static async updateQuestion(
        questionId: string,
        updates: Record<string, unknown>,
    ) {
        const updated = await Question.findByIdAndUpdate(
            questionId,
            { $set: updates },
            { new: true, runValidators: false },
        )
            .lean()
            .exec();

        if (!updated) {
            throw new AppError('Câu hỏi không tồn tại', HttpStatus.NOT_FOUND);
        }

        return updated;
    }
}
