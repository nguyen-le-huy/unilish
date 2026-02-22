// ─── Vocab Content Types ──────────────────────────────────────────────────────
// Stored in Lesson.content (Schema.Types.Mixed)
// Every module type follows the same discriminated union pattern.

export interface VocabItem {
    id: string; // nanoid() — stable client-side key
    word: string;
    partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';
    ipa: string; // /ˈlʌɡ.ɪdʒ/
    definitionNative: string; // Mother-tongue definition — lang from Language.code
    definitionEn: string; // English definition
    exampleSentence: string; // MUST match Unit.contextSeed.scenario
    exampleTranslation: string;
    audioWordUrl: string | null; // R2 URL — TTS of the word
    audioSentenceUrl: string | null; // R2 URL — TTS of exampleSentence
    imageUrl: string | null; // Cloudinary or R2
    conceptId: string | null; // ObjectId → Concept collection (auto-mapped)
}

export type VocabGenerationStatus =
    | 'IDLE'
    | 'GENERATING' // GPT-5.1 generating JSON vocab
    | 'GENERATING_AUDIO' // BullMQ TTS processing audio files
    | 'DONE'
    | 'ERROR';

export interface VocabContent {
    type: 'VOCAB';
    scenario: string; // Copied from Unit.contextSeed.scenario at generation time
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

// ─── Union Type — extend as new lesson types are built ────────────────────────
export type LessonContent = VocabContent;
