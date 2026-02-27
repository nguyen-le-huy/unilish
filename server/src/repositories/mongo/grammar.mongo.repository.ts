import { Lesson } from '../../models/mongo/lesson.model.js';
import { AppError } from '../../utils/app-error.js';
import { HttpStatus } from '../../constants/http-status.js';
import type { GrammarContent } from '../../types/lesson-content.types.js';

// ─── Repository ───────────────────────────────────────────────────────────────
// Direct Mongoose access to Lesson.content for the GRAMMAR type.
// Follows the same lean() + select() rule as all other read paths.

export class GrammarMongoRepository {

    /**
     * Read the grammar content block from a lesson.
     * Throws AppError if the lesson doesn't exist or isn't a GRAMMAR type.
     */
    async getContent(lessonId: string): Promise<GrammarContent> {
        const lesson = await Lesson
            .findById(lessonId)
            .select('type content')
            .lean()
            .exec();

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (lesson.type !== 'GRAMMAR') {
            throw new AppError(
                `Bài học này không phải loại GRAMMAR (loại hiện tại: ${lesson.type})`,
                HttpStatus.BAD_REQUEST,
            );
        }

        // If content hasn't been created yet, return a safe empty structure
        if (!lesson.content) {
            return this._emptyContent();
        }

        return lesson.content as GrammarContent;
    }

    /**
     * Persist the grammar content block. Performs an atomic update on Lesson.content.
     */
    async saveContent(lessonId: string, content: GrammarContent): Promise<GrammarContent> {
        const updated = await Lesson
            .findByIdAndUpdate(
                lessonId,
                { $set: { content } },
                { new: true, runValidators: false },
            )
            .select('content')
            .lean()
            .exec();

        if (!updated) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        return updated.content as GrammarContent;
    }

    /**
     * Patch only the practiceConfig.questionIds after question generation.
     */
    async setQuestionIds(lessonId: string, questionIds: string[]): Promise<void> {
        await Lesson
            .findByIdAndUpdate(
                lessonId,
                { $set: { 'content.practiceConfig.questionIds': questionIds } },
                { new: false },
            )
            .lean()
            .exec();
    }

    /**
     * Patch only the hero audio URL after TTS generation.
     */
    async setAudioUrl(lessonId: string, audioUrl: string): Promise<void> {
        await Lesson
            .findByIdAndUpdate(
                lessonId,
                { $set: { 'content.heroAudioUrl': audioUrl } },
                { new: false },
            )
            .lean()
            .exec();
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private _emptyContent(): GrammarContent {
        return {
            type: 'GRAMMAR',
            level: 'A2',
            readingTime: 3,
            conceptName: '',
            hero: {
                hook: '',
                contextSentences: [],
            },
            blocks: [],
            summaryTable: {
                columns: ['Giới từ', 'Dùng khi nào', 'Ví dụ'],
                rows: [],
            },
            practiceConfig: {
                mode: 'FIXED',
                questionIds: [],
                passingScore: 80,
            },
            taughtConcepts: [],
        };
    }
}

export const grammarRepo = new GrammarMongoRepository();
