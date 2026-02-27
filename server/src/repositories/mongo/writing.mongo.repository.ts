import { Lesson } from '../../models/mongo/lesson.model.js';
import { AppError } from '../../utils/app-error.js';
import { HttpStatus } from '../../constants/http-status.js';
import type { WritingContent } from '../../types/lesson-content.types.js';

// ─── Repository ───────────────────────────────────────────────────────────────
// Direct Mongoose access to Lesson.content for the WRITING type.
// All reads use .lean() + .select() — mandatory project performance standard.

export class WritingMongoRepository {

    /**
     * Read the writing content block from a lesson.
     * Returns a safe empty structure when content has not been created yet.
     */
    async getContent(lessonId: string): Promise<WritingContent> {
        const lesson = await Lesson
            .findById(lessonId)
            .select('type content')
            .lean()
            .exec();

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (lesson.type !== 'WRITING') {
            throw new AppError(
                `Bài học này không phải loại WRITING (loại hiện tại: ${lesson.type})`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!lesson.content) {
            return this._emptyContent();
        }

        const empty = this._emptyContent();
        const stored = lesson.content as Partial<WritingContent>;
        return {
            ...empty,
            ...stored,
        };
    }

    /**
     * Atomically persist the full writing content block.
     */
    async saveContent(lessonId: string, content: WritingContent): Promise<WritingContent> {
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

        return updated.content as WritingContent;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private _emptyContent(): WritingContent {
        return {
            type: 'WRITING',
            prompt: '',
            promptTranslation: '',
            config: {
                minWords: 120,
                maxWords: 180,
                format: 'EMAIL',
                tone: 'FORMAL',
            },
            requiredConcepts: [],
            requiredGrammar: '',
            sentenceStarters: [],
            warmupTasks: [],
            taughtConcepts: [],
        };
    }
}

export const writingRepo = new WritingMongoRepository();
