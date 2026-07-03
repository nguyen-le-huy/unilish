import { Lesson } from '../../models/mongo/lesson.model.js';
import { AppError } from '../../utils/app-error.js';
import { HttpStatus } from '../../constants/http-status.js';
import type { ListeningContent } from '../../types/lesson-content.types.js';

// ─── Repository ───────────────────────────────────────────────────────────────
// Direct Mongoose access to Lesson.content for the LISTENING type.
// All reads use .lean() + .select() — mandatory project performance standard.

export class ListeningMongoRepository {

    /**
     * Read the listening content block from a lesson.
     * Returns a safe empty structure when content has not been initialised yet.
     */
    async getContent(lessonId: string): Promise<ListeningContent> {
        const lesson = await Lesson
            .findById(lessonId)
            .select('type content')
            .lean()
            .exec();

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (lesson.type !== 'LISTENING') {
            throw new AppError(
                `Bài học này không phải loại LISTENING (loại hiện tại: ${lesson.type})`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (!lesson.content) {
            return this._emptyContent();
        }

        // Merge stored document with the safe empty template so every field
        // is always present even on partially-written legacy records.
        const empty = this._emptyContent();
        const stored = lesson.content as Partial<ListeningContent>;
        return {
            ...empty,
            ...stored,
            media: { ...empty.media, ...(stored.media ?? {}) },
            interactiveConfig: { ...empty.interactiveConfig, ...(stored.interactiveConfig ?? {}) },
            practiceConfig: { ...empty.practiceConfig, ...(stored.practiceConfig ?? {}) },
            transcript: stored.transcript ?? empty.transcript,
        };
    }

    /**
     * Atomically persist the full listening content block.
     */
    async saveContent(lessonId: string, content: ListeningContent): Promise<ListeningContent> {
        const updated = await Lesson
            .findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        content,
                        'practiceConfig.mode': content.practiceConfig.mode,
                        'practiceConfig.questionIds': content.practiceConfig.questionIds,
                        'practiceConfig.passingScore': content.practiceConfig.passingScore,
                    },
                },
                { new: true, runValidators: false },
            )
            .select('content')
            .lean()
            .exec();

        if (!updated) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        return updated.content as ListeningContent;
    }

    /**
     * Patch only the transcript lines (after AI script generation).
     * Does NOT overwrite media/interactiveConfig.
     */
    async setTranscript(lessonId: string, transcript: ListeningContent['transcript']): Promise<void> {
        const result = await Lesson
            .findByIdAndUpdate(
                lessonId,
                { $set: { 'content.transcript': transcript, 'content.generationStatus': 'IDLE' } },
                { new: false },
            )
            .select('_id')
            .lean()
            .exec();

        if (!result) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Patch media url + transcript words after the Mix & Sync AI pipeline completes.
     */
    async setAudioAndWords(
        lessonId: string,
        audioUrl: string,
        duration: number,
        transcript: ListeningContent['transcript'],
    ): Promise<void> {
        const result = await Lesson
            .findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        'content.media.audioUrl': audioUrl,
                        'content.media.duration': duration,
                        'content.transcript': transcript,
                        'content.generationStatus': 'DONE',
                    },
                },
                { new: false },
            )
            .select('_id')
            .lean()
            .exec();

        if (!result) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Update only the generationStatus field (used by BullMQ worker in Phase 3).
     */
    async setGenerationStatus(
        lessonId: string,
        status: ListeningContent['generationStatus'],
    ): Promise<void> {
        await Lesson
            .findByIdAndUpdate(lessonId, { $set: { 'content.generationStatus': status } })
            .select('_id')
            .lean()
            .exec();
    }

    /**
     * Update only practice question IDs for listening lesson.
     */
    async setQuestionIds(lessonId: string, questionIds: string[]): Promise<void> {
        const result = await Lesson
            .findByIdAndUpdate(
                lessonId,
                {
                    $set: {
                        'content.practiceConfig.questionIds': questionIds,
                        'practiceConfig.mode': 'FIXED',
                        'practiceConfig.questionIds': questionIds,
                    },
                },
                { new: false },
            )
            .select('_id')
            .lean()
            .exec();

        if (!result) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private _emptyContent(): ListeningContent {
        return {
            type: 'LISTENING',
            media: {
                audioUrl: null,
                duration: 0,
                accent: 'en-US',
                noiseLevel: 'none',
                speed: 1.0,
            },
            transcript: [],
            interactiveConfig: {
                mode: 'GAP_FILL',
                hidePercentage: 20,
                allowSlowSpeed: true,
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

export const listeningRepo = new ListeningMongoRepository();
