import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseSeries } from '../models/mongo/course-series.model.js';
import { Concept, EConceptType } from '../models/mongo/concept.model.js';
import { ttsQueue } from '../jobs/queues/tts.queue.js';
import { ContextAlignmentService } from './context-alignment.service.js';
import type {
    VocabContent,
    VocabGenerationStatus,
    VocabItem,
} from '../types/lesson-content.types.js';
import type {
    GenerateVocabBody,
    SaveVocabContentBody,
    RegenerateAudioBody,
} from '../validations/vocab-content.validation.js';

// ─── Internal Types ────────────────────────────────────────────────────────────

interface LessonLanguageContext {
    languageId: string;
    languageCode: string;
    nativeName: string;
    learnerNativeLanguage: string; // Language of the learner (e.g., "Vietnamese")
    scenario: string;
    keywords: string[];
}

interface GPTVocabItem {
    word: string;
    partOfSpeech: string;
    ipa: string;
    definitionNative: string;
    definitionEn: string;
    exampleSentence: string;
    exampleTranslation: string;
}

// ─── Singleton Clients ─────────────────────────────────────────────────────────

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const lessonRepo = new LessonMongoRepository();

// ─── Service ───────────────────────────────────────────────────────────────────

export class VocabGenerationService {
    // ── Language Context Resolution ────────────────────────────────────────────

    /**
     * Resolves the full language context from a lesson ID.
     * Chain: Lesson → Unit → Course → CourseSeries → Language
     */
    private static async resolveLessonContext(
        lessonId: string,
    ): Promise<LessonLanguageContext> {
        const lesson = await lessonRepo.findById(lessonId);
        if (!lesson) {
            throw new AppError('Lesson not found', HttpStatus.NOT_FOUND);
        }

        const unit = await Unit.findById(lesson.unitId)
            .select('courseId contextSeed')
            .lean()
            .exec();
        if (!unit) {
            throw new AppError('Unit not found for this lesson', HttpStatus.NOT_FOUND);
        }

        const course = await Course.findById(unit.courseId)
            .select('seriesId')
            .lean()
            .exec();
        if (!course) {
            throw new AppError('Course not found for this unit', HttpStatus.NOT_FOUND);
        }

        const series = await CourseSeries.findById(course.seriesId)
            .select('languageId')
            .lean()
            .exec();
        if (!series) {
            throw new AppError('Course series not found', HttpStatus.NOT_FOUND);
        }

        const language = await mongoose.model('Language')
            .findById(series.languageId)
            .select('code nativeName')
            .lean()
            .exec() as { _id: mongoose.Types.ObjectId; code: string; nativeName: string } | null;
        if (!language) {
            throw new AppError('Language not found', HttpStatus.NOT_FOUND);
        }

        return {
            languageId: series.languageId.toString(),
            languageCode: language.code,
            nativeName: language.nativeName,
            learnerNativeLanguage: 'Vietnamese',
            scenario: unit.contextSeed?.scenario ?? 'General vocabulary',
            keywords: unit.contextSeed?.keywords ?? [],
        };
    }

    // ── GPT-5.1 Vocabulary Generation ──────────────────────────────────────────

    /**
     * Generate vocabulary items using GPT with contextual constraints.
     */
    private static async callGPT(
        ctx: LessonLanguageContext,
        wordCount: number,
        wordList?: string[],
    ): Promise<GPTVocabItem[]> {
        const systemPrompt = `You are an expert language teacher specializing in ${ctx.nativeName} vocabulary for learners.
You generate structured vocabulary items that are contextually relevant and pedagogically sound.
Always respond with valid JSON only — no markdown, no extra text.`;

        const userPrompt = wordList?.length
            ? `Generate vocabulary entries for these specific ${ctx.nativeName} words: [${wordList.join(', ')}].
Context scenario: "${ctx.scenario}".
For each word, provide a JSON object in this exact shape:
{
  "word": "<${ctx.nativeName} word>",
  "partOfSpeech": "<noun|verb|adjective|adverb|phrase>",
  "ipa": "<IPA transcription>",
  "definitionNative": "<clear definition in ${ctx.nativeName}>",
  "definitionEn": "<definition in ${ctx.learnerNativeLanguage}>",
  "exampleSentence": "<short, simple example sentence (max 12 words) using the word in context: ${ctx.scenario}>",
  "exampleTranslation": "<${ctx.learnerNativeLanguage} translation of the example sentence>"
}
IMPORTANT: exampleSentence must be SHORT (8–12 words). Do NOT write complex or compound sentences.
Return a JSON array of ${wordList.length} items.`
            : `Generate ${wordCount} ${ctx.nativeName} vocabulary words relevant to the scenario: "${ctx.scenario}".
${ctx.keywords.length ? `Related keywords for context: ${ctx.keywords.join(', ')}.` : ''}
For each word, provide a JSON object in this exact shape:
{
  "word": "<${ctx.nativeName} word>",
  "partOfSpeech": "<noun|verb|adjective|adverb|phrase>",
  "ipa": "<IPA transcription>",
  "definitionNative": "<clear definition in ${ctx.nativeName}>",
  "definitionEn": "<definition in ${ctx.learnerNativeLanguage}>",
  "exampleSentence": "<short, simple example sentence (max 12 words) using the word in context: ${ctx.scenario}>",
  "exampleTranslation": "<${ctx.learnerNativeLanguage} translation of the example sentence>"
}
IMPORTANT: exampleSentence must be SHORT (8–12 words). Do NOT write complex or compound sentences.
Return a JSON array of exactly ${wordCount} items. Words must be diverse and appropriate difficulty for the scenario.`;

        const response = await openaiClient.chat.completions.create({
            model: env.OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
        });

        const raw = response.choices[0]?.message?.content ?? '{}';

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new AppError('GPT returned invalid JSON', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // GPT may wrap the array in an object key
        const items = Array.isArray(parsed)
            ? parsed
            : (parsed as Record<string, unknown>).items ?? (parsed as Record<string, unknown>).vocabulary ?? [];

        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError(
                'GPT returned no vocabulary items',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        return items as GPTVocabItem[];
    }

    // ── Concept Auto-Mapping ───────────────────────────────────────────────────

    /**
     * Upsert one Concept document per vocab item (key = lowercased word).
     * Returns array of concept ObjectIds.
     */
    private static async autoMapTaughtConcepts(
        items: GPTVocabItem[],
        languageId: string,
    ): Promise<mongoose.Types.ObjectId[]> {
        const langObjectId = new mongoose.Types.ObjectId(languageId);
        const conceptIds: mongoose.Types.ObjectId[] = [];

        for (const item of items) {
            const key = `vocab_${item.word.toLowerCase().replace(/\s+/g, '_')}`;
            const concept = await Concept.findOneAndUpdate(
                { languageId: langObjectId, key },
                {
                    $setOnInsert: {
                        languageId: langObjectId,
                        key,
                        name: item.word,
                        type: EConceptType.VOCAB,
                        description: item.definitionEn,
                        metaData: { ipa: item.ipa, partOfSpeech: item.partOfSpeech },
                    },
                },
                { upsert: true, new: true, lean: true },
            ).exec();

            if (concept) {
                conceptIds.push(concept._id as mongoose.Types.ObjectId);
            }
        }

        return conceptIds;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Main entry point: generate vocab content for a lesson with GPT,
     * persist it, map concepts, then enqueue TTS audio generation.
     */
    static async generateVocabContent(
        lessonId: string,
        body: GenerateVocabBody,
    ): Promise<VocabContent> {
        const ctx = await VocabGenerationService.resolveLessonContext(lessonId);

        // Mark as GENERATING immediately so the UI can show progress
        await lessonRepo.updateVocabGenerationStatus(lessonId, 'GENERATING');

        let gptItems: GPTVocabItem[];
        try {
            gptItems = await VocabGenerationService.callGPT(
                ctx,
                body.wordCount ?? 10,
                body.wordList,
            );
        } catch (err) {
            await lessonRepo.updateVocabGenerationStatus(lessonId, 'ERROR');
            throw err;
        }

        // Build VocabContent with GENERATING_AUDIO status (TTS will flip to DONE)
        const vocabItems: VocabItem[] = gptItems.map((g) => ({
            id: uuidv4(),
            word: g.word,
            partOfSpeech: (['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'].includes(g.partOfSpeech)
                ? g.partOfSpeech
                : 'other') as VocabItem['partOfSpeech'],
            ipa: g.ipa,
            definitionNative: g.definitionNative,
            definitionEn: g.definitionEn,
            exampleSentence: g.exampleSentence,
            exampleTranslation: g.exampleTranslation,
            audioWordUrl: null,
            audioSentenceUrl: null,
            imageUrl: null,
            conceptId: null,
        }));

        const content: VocabContent = {
            type: 'VOCAB',
            scenario: ctx.scenario,
            generationStatus: 'GENERATING_AUDIO',
            items: vocabItems,
        };

        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                ctx.scenario,
                ...vocabItems.flatMap((item) => [item.word, item.exampleSentence, item.exampleTranslation]),
            ],
            'VOCAB',
        );

        // Persist content
        await lessonRepo.saveVocabContent(lessonId, content);

        // Auto-map & persist taught concepts
        const conceptIds = await VocabGenerationService.autoMapTaughtConcepts(
            gptItems,
            ctx.languageId,
        );
        await lessonRepo.setTaughtConcepts(lessonId, conceptIds);

        // Attach conceptId to each item and re-persist
        const itemsWithConcepts = vocabItems.map((item, i) => ({
            ...item,
            conceptId: conceptIds[i]?.toString() ?? null,
        }));
        const finalContent: VocabContent = { ...content, items: itemsWithConcepts };
        await lessonRepo.saveVocabContent(lessonId, finalContent);

        // Enqueue TTS generation (async — worker handles status updates)
        await ttsQueue.add(
            `tts-lesson-${lessonId}`,
            {
                lessonId,
                languageId: ctx.languageId,
                items: itemsWithConcepts.map((item) => ({
                    itemId: item.id,
                    word: item.word,
                    sentence: item.exampleSentence,
                })),
            },
        );

        logger.info(`[VocabGenService] Enqueued TTS for lesson ${lessonId} (${vocabItems.length} items)`);

        return finalContent;
    }

    /**
     * Get the current vocab content for a lesson.
     */
    static async getVocabContent(lessonId: string): Promise<VocabContent> {
        const lesson = await lessonRepo.findById(lessonId);
        if (!lesson) {
            throw new AppError('Lesson not found', HttpStatus.NOT_FOUND);
        }

        const content = await lessonRepo.findVocabContent(lessonId);

        // Return empty scaffold for lessons that haven't been generated yet
        return content ?? {
            type: 'VOCAB',
            scenario: '',
            generationStatus: 'IDLE',
            items: [],
        };
    }

    /**
     * Get the current generation status.
     */
    static async getGenerationStatus(
        lessonId: string,
    ): Promise<{ status: VocabGenerationStatus; itemCount: number }> {
        const content = await lessonRepo.findVocabContent(lessonId);
        return {
            status: content?.generationStatus ?? 'IDLE',
            itemCount: content?.items?.length ?? 0,
        };
    }

    /**
     * Manually save/overwrite vocab content (used by the editor).
     */
    static async saveVocabContent(
        lessonId: string,
        body: SaveVocabContentBody,
    ): Promise<VocabContent> {
        await ContextAlignmentService.assertLessonAligned(
            lessonId,
            [
                body.scenario,
                ...body.items.flatMap((item) => [item.word, item.exampleSentence, item.exampleTranslation]),
            ],
            'VOCAB',
        );

        const content: VocabContent = {
            type: 'VOCAB',
            scenario: body.scenario,
            generationStatus: body.generationStatus as VocabGenerationStatus,
            items: body.items as unknown as VocabItem[],
        };

        await lessonRepo.saveVocabContent(lessonId, content);
        return content;
    }

    /**
     * Regenerate TTS audio for a single vocab item.
     */
    static async regenerateItemAudio(
        lessonId: string,
        itemId: string,
        body: RegenerateAudioBody,
    ): Promise<void> {
        const content = await lessonRepo.findVocabContent(lessonId);
        if (!content) {
            throw new AppError('Vocab content not found', HttpStatus.NOT_FOUND);
        }

        const item = content.items.find((i) => i.id === itemId);
        if (!item) {
            throw new AppError('Vocab item not found', HttpStatus.NOT_FOUND);
        }

        const ctx = await VocabGenerationService.resolveLessonContext(lessonId);

        await ttsQueue.add(
            `tts-regen-${lessonId}-${itemId}`,
            {
                lessonId,
                languageId: ctx.languageId,
                items: [
                    {
                        itemId: item.id,
                        word: item.word,
                        sentence: item.exampleSentence,
                    },
                ],
            },
        );

        logger.info(
            `[VocabGenService] Enqueued audio regen for item ${itemId} (target: ${body.target})`,
        );
    }

    /**
     * Enqueue TTS audio generation for ALL items in a lesson.
     * Used when vocab exists but audio is missing.
     */
    static async generateAllAudio(lessonId: string): Promise<void> {
        const content = await lessonRepo.findVocabContent(lessonId);
        if (!content || content.items.length === 0) {
            throw new AppError('Không có từ vựng để tạo âm thanh', HttpStatus.NOT_FOUND);
        }

        const ctx = await VocabGenerationService.resolveLessonContext(lessonId);

        await lessonRepo.updateVocabGenerationStatus(lessonId, 'GENERATING_AUDIO');

        await ttsQueue.add(
            `tts-all-${lessonId}`,
            {
                lessonId,
                languageId: ctx.languageId,
                items: content.items.map((item) => ({
                    itemId: item.id,
                    word: item.word,
                    sentence: item.exampleSentence,
                })),
            },
        );

        logger.info(
            `[VocabGenService] Enqueued full TTS for lesson ${lessonId} (${content.items.length} items)`,
        );
    }
}
