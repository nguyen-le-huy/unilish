import { Lesson } from '../../models/mongo/lesson.model.js';
import { AppError } from '../../utils/app-error.js';
import { HttpStatus } from '../../constants/http-status.js';
import type { ReadingContent } from '../../types/lesson-content.types.js';

// ─── Repository ───────────────────────────────────────────────────────────────
// Direct Mongoose access to Lesson.content for the READING type.
// All reads use .lean() + .select() — mandatory project performance standard.

export class ReadingMongoRepository {

    /**
     * Read the reading content block from a lesson.
     * Returns a safe empty structure when content has not been created yet.
     */
    async getContent(lessonId: string): Promise<ReadingContent> {
        const lesson = await Lesson
            .findById(lessonId)
            .select('type content')
            .lean()
            .exec();

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (lesson.type !== 'READING') {
            throw new AppError(
                `Bài học này không phải loại READING (loại hiện tại: ${lesson.type})`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!lesson.content) {
            return this._emptyContent();
        }

        // Merge with empty template so partial documents (e.g. after a
        // patch-only write via setTextAndGlossary) always expose every field.
        const empty = this._emptyContent();
        const stored = lesson.content as Partial<ReadingContent>;
        return {
            ...empty,
            ...stored,
            practiceConfig: {
                ...empty.practiceConfig,
                ...(stored.practiceConfig ?? {}),
            },
            media: {
                ...empty.media,
                ...(stored.media ?? {}),
            },
        };
    }

    /**
     * Atomically persist the full reading content block.
     */
    async saveContent(lessonId: string, content: ReadingContent): Promise<ReadingContent> {
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

        return updated.content as ReadingContent;
    }

    /**
     * Patch only the text and glossary fields (after AI auto-write).
     */
    async setTextAndGlossary(
        lessonId: string,
        text: string,
        glossary: ReadingContent['glossary'],
        translation: string,
    ): Promise<void> {
        await Lesson
            .findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        'content.text': text,
                        'content.translation': translation,
                        'content.glossary': glossary,
                        'content.generationStatus': 'DONE',
                    },
                },
                { new: false },
            )
            .lean()
            .exec();
    }

    /**
     * Patch only the media.audioUrl after TTS generation completes.
     */
    async setMediaAudioUrl(lessonId: string, audioUrl: string): Promise<void> {
        await Lesson
            .findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        'content.media.audioUrl': audioUrl,
                        'content.generationStatus': 'DONE',
                    },
                },
                { new: false },
            )
            .lean()
            .exec();
    }

    /**
     * Patch generationStatus — used by the queue worker to signal in-progress states.
     */
    async setGenerationStatus(
        lessonId: string,
        status: ReadingContent['generationStatus'],
    ): Promise<void> {
        await Lesson
            .findByIdAndUpdate(
                lessonId,
                { $set: { 'content.generationStatus': status } },
                { new: false },
            )
            .lean()
            .exec();
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

    // ─── Private helpers ──────────────────────────────────────────────────────

    private _emptyContent(): ReadingContent {
        return {
            type: 'READING',
            text: '',
            translation: '',
            glossary: {},
            media: {
                audioUrl: null,
                durationSec: 0,
                speed: 1.0,
            },
            practiceConfig: {
                mode: 'FIXED',
                questionIds: [],
                passingScore: 80,
            },
            generationStatus: 'IDLE',
        };
    }
}

export const readingRepo = new ReadingMongoRepository();
