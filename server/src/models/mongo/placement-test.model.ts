import mongoose from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const EPlacementTestStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
} as const;

export const EModuleType = {
    MCQ: 'mcq',
    ESSAY: 'essay',
    SPEAKING: 'speaking',
} as const;

export const ECEFRLevel = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export const ETargetAudience = {
    NEW_USER: 'new_user',
    RETAKE: 'retake',
    INVITATION: 'invitation',
} as const;

export const ESamplingMode = {
    RANDOM: 'random',
    FIXED: 'fixed',
} as const;

export const EPromptSource = {
    AI_GENERATED: 'ai_generated',
    LIBRARY: 'library',
} as const;

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    difficultyDistribution?: Partial<Record<keyof typeof ECEFRLevel, number>>;
    excludeRecentDays?: number;
    topicFilter?: string[];
    manualContent?: {
        passageText?: string;
        groupPattern?: number[];
        questions?: string[];
        questionItems?: Array<{
            question: string;
            options: {
                A: string;
                B: string;
                C: string;
                D: string;
            };
            correctOption: 'A' | 'B' | 'C' | 'D';
            explanation?: string;
            transcript?: string;
            mediaUrl?: string;
            imageUrl?: string;
            imageUrls?: string[];
            audioUrl?: string;
        }>;
        media?: {
            imageUrl?: string;
            audioUrl?: string;
            videoUrl?: string;
        };
    };
}

export interface IModuleMCQ {
    order: number;
    type: 'mcq';
    name: string;
    timeLimitMinutes: number;
    parts: IPartConfig[];
}

export interface IModuleEssay {
    order: number;
    type: 'essay';
    name: string;
    timeLimitMinutes: number;
    wordLimits: { low: number; mid: number; high: number };
    topicsByLevel: { low: string[]; mid: string[]; high: string[] };
    promptImageUrl?: string;
}

export interface ISpeakingQuestion {
    text: string;
    audioKey?: string;
}

export interface ISpeakingParts {
    warmupMinutes?: number;
    part1: { minutes?: number; questionsRange?: [number, number]; topics: ISpeakingQuestion[] };
    part2: {
        minutes?: number;
        prepSeconds?: number;
        cueCards: { level: 'low' | 'mid' | 'high'; text: string; audioKey?: string; shouldSay?: string[] }[];
    };
    part3: { minutes?: number; questionsRange?: [number, number]; topics: ISpeakingQuestion[] };
}

export interface IModuleSpeaking {
    order: number;
    type: 'speaking';
    name: string;
    totalMinutes?: number;
    conversationModel?: string;
    ttsModel?: string;
    ttsVoice?: string;
    gradingModel?: string;
    speechAnalytics?: string;
    silenceThresholdSeconds?: number;
    criteria?: string[];
    parts: ISpeakingParts;
}

export type IPlacementTestModule = IModuleMCQ | IModuleEssay | IModuleSpeaking;

export interface ICEFRThreshold {
    level: keyof typeof ECEFRLevel;
    mcqMin: number;
    mcqMax: number;
    writingMin: number;
    writingMax: number;
    speakingMin: number;
    speakingMax: number;
}

export interface ICEFRMapping {
    weights: { mcq: number; writing: number; speaking: number };
    thresholds: ICEFRThreshold[];
}

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IPlacementTest extends mongoose.Document {
    languageId: mongoose.Types.ObjectId;
    language: string;
    name: string;
    standard: string;
    outputFramework: string;
    description?: string;

    status: typeof EPlacementTestStatus[keyof typeof EPlacementTestStatus];
    version: number;

    settings: {
        targetAudience: (typeof ETargetAudience[keyof typeof ETargetAudience])[];
        allowRetake: boolean;
        retakeCooldownDays: number;
    };

    modules: IPlacementTestModule[];
    cefrMapping: ICEFRMapping;

    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const PartConfigSchema = new mongoose.Schema<IPartConfig>(
    {
        part: { type: Number, required: true },
        name: { type: String, required: true, trim: true },
        questionsCount: { type: Number, required: true, min: 1 },
        poolTag: { type: String, required: true, trim: true },
        difficultyDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
        excludeRecentDays: { type: Number, default: 30, min: 0 },
        topicFilter: { type: [String], default: [] },
        manualContent: {
            passageText: { type: String, default: null },
            groupPattern: { type: [Number], default: [] },
            questions: { type: [String], default: [] },
            questionItems: {
                type: [
                    {
                        question: { type: String, required: true, trim: true },
                        options: {
                            A: { type: String, required: true, trim: true },
                            B: { type: String, required: true, trim: true },
                            C: { type: String, required: true, trim: true },
                            D: { type: String, required: true, trim: true },
                        },
                        correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
                        explanation: { type: String, default: null },
                        transcript: { type: String, default: null },
                        mediaUrl: { type: String, default: null },
                        imageUrl: { type: String, default: null },
                        imageUrls: { type: [String], default: [] },
                        audioUrl: { type: String, default: null },
                    },
                ],
                default: [],
            },
            media: {
                imageUrl: { type: String, default: null },
                audioUrl: { type: String, default: null },
                videoUrl: { type: String, default: null },
            },
        },
    },
    { _id: false },
);

const ModuleMCQSchema = new mongoose.Schema<IModuleMCQ>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['mcq'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        parts: { type: [PartConfigSchema], default: [] },
    },
    { _id: false },
);

const ModuleEssaySchema = new mongoose.Schema<IModuleEssay>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['essay'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        wordLimits: {
            low: { type: Number, default: 150 },
            mid: { type: Number, default: 200 },
            high: { type: Number, default: 250 },
        },
        topicsByLevel: {
            low: { type: [String], default: [] },
            mid: { type: [String], default: [] },
            high: { type: [String], default: [] },
        },
        promptImageUrl: { type: String, default: null },
    },
    { _id: false },
);

const SpeakingPartsSchema = new mongoose.Schema(
    {
        part1: {
            topics: {
                type: [
                    {
                        text: { type: String, required: true },
                        audioKey: { type: String, default: null },
                    },
                ],
                default: [],
            },
        },
        part2: {
            cueCards: {
                type: [
                    {
                        level: { type: String, enum: ['low', 'mid', 'high'] },
                        text: { type: String },
                        audioKey: { type: String, default: null },
                        shouldSay: { type: [String], default: [] },
                    },
                ],
                default: [],
            },
        },
        part3: {
            topics: {
                type: [
                    {
                        text: { type: String, required: true },
                        audioKey: { type: String, default: null },
                    },
                ],
                default: [],
            },
        },
    },
    { _id: false },
);

const ModuleSpeakingSchema = new mongoose.Schema<IModuleSpeaking>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['speaking'], required: true },
        name: { type: String, required: true, trim: true },
        parts: { type: SpeakingPartsSchema, default: () => ({}) },
    },
    { _id: false },
);

const CEFRThresholdSchema = new mongoose.Schema(
    {
        level: { type: String, enum: Object.values(ECEFRLevel), required: true },
        mcqMin: { type: Number, required: true },
        mcqMax: { type: Number, required: true },
        writingMin: { type: Number, default: 0 },
        writingMax: { type: Number, default: 1 },
        speakingMin: { type: Number, default: 0 },
        speakingMax: { type: Number, default: 1 },
    },
    { _id: false },
);

const PlacementModuleSchema = new mongoose.Schema<Record<string, unknown>>(
    {},
    {
        _id: false,
        strict: false,
    },
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const trimString = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

const toFiniteNumber = (value: unknown): number | undefined => {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
};

const normalizeStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.map((item) => trimString(item)).filter((item) => item.length > 0)
        : [];

const sanitizeModulesForStorage = (modules: unknown): unknown[] => {
    if (!Array.isArray(modules)) {
        return [];
    }

    return modules
        .map((module) => {
            if (!isRecord(module)) return null;

            const type = trimString(module.type);
            const order = toFiniteNumber(module.order);
            const name = trimString(module.name);

            if (!type || order === undefined || !name) return null;

            if (type === EModuleType.MCQ) {
                const timeLimitMinutes = toFiniteNumber(module.timeLimitMinutes);
                if (timeLimitMinutes === undefined) return null;

                const partsRaw = Array.isArray(module.parts) ? module.parts : [];
                const parts = partsRaw
                    .map((part) => {
                        if (!isRecord(part)) return null;

                        const partNumber = toFiniteNumber(part.part);
                        const partName = trimString(part.name);
                        const questionsCount = toFiniteNumber(part.questionsCount);
                        const poolTag = trimString(part.poolTag);
                        if (partNumber === undefined || !partName || questionsCount === undefined || !poolTag) {
                            return null;
                        }

                        const manualContentRaw = isRecord(part.manualContent) ? part.manualContent : undefined;
                        const questions = normalizeStringArray(manualContentRaw?.questions);
                        const groupPattern = Array.isArray(manualContentRaw?.groupPattern)
                            ? (manualContentRaw?.groupPattern as unknown[])
                                .map((item) => toFiniteNumber(item))
                                .filter((item): item is number => item !== undefined)
                            : [];

                        const questionItemsRaw = Array.isArray(manualContentRaw?.questionItems)
                            ? manualContentRaw?.questionItems
                            : [];
                        const questionItems = questionItemsRaw
                            .map((questionItem) => {
                                if (!isRecord(questionItem)) return null;
                                const question = trimString(questionItem.question);
                                const optionsRaw = isRecord(questionItem.options) ? questionItem.options : null;
                                if (!question || !optionsRaw) return null;

                                const optionA = trimString(optionsRaw.A);
                                const optionB = trimString(optionsRaw.B);
                                const optionC = trimString(optionsRaw.C);
                                const optionD = trimString(optionsRaw.D);
                                const correctOption = trimString(questionItem.correctOption);

                                if (!optionA || !optionB || !optionC || !optionD) return null;
                                if (!['A', 'B', 'C', 'D'].includes(correctOption)) return null;

                                const explanation = trimString(questionItem.explanation);
                                const transcript = trimString(questionItem.transcript);
                                const mediaUrl = trimString(questionItem.mediaUrl);
                                const imageUrl = trimString(questionItem.imageUrl);
                                const imageUrls = normalizeStringArray(questionItem.imageUrls);
                                const audioUrl = trimString(questionItem.audioUrl);

                                return {
                                    question,
                                    options: {
                                        A: optionA,
                                        B: optionB,
                                        C: optionC,
                                        D: optionD,
                                    },
                                    correctOption: correctOption as 'A' | 'B' | 'C' | 'D',
                                    ...(explanation ? { explanation } : {}),
                                    ...(transcript ? { transcript } : {}),
                                    ...(mediaUrl ? { mediaUrl } : {}),
                                    ...(imageUrl ? { imageUrl } : {}),
                                    ...(imageUrls.length > 0 ? { imageUrls } : {}),
                                    ...(audioUrl ? { audioUrl } : {}),
                                };
                            })
                            .filter((item): item is NonNullable<typeof item> => item !== null);

                        const mediaRaw = isRecord(manualContentRaw?.media) ? manualContentRaw?.media : undefined;
                        const sharedAudioUrl = trimString(mediaRaw?.audioUrl);

                        const manualContent =
                            questions.length > 0 || groupPattern.length > 0 || questionItems.length > 0 || !!sharedAudioUrl
                                ? {
                                    ...(groupPattern.length > 0 ? { groupPattern } : {}),
                                    ...(questions.length > 0 ? { questions } : {}),
                                    ...(questionItems.length > 0 ? { questionItems } : {}),
                                    ...(sharedAudioUrl ? { media: { audioUrl: sharedAudioUrl } } : {}),
                                }
                                : undefined;

                        return {
                            part: partNumber,
                            name: partName,
                            questionsCount,
                            poolTag,
                            ...(manualContent ? { manualContent } : {}),
                        };
                    })
                    .filter((part): part is NonNullable<typeof part> => part !== null);

                return {
                    order,
                    type: EModuleType.MCQ,
                    name,
                    timeLimitMinutes,
                    parts,
                };
            }

            if (type === EModuleType.ESSAY) {
                const timeLimitMinutes = toFiniteNumber(module.timeLimitMinutes);
                const wordLimitsRaw = isRecord(module.wordLimits) ? module.wordLimits : null;
                const topicsByLevelRaw = isRecord(module.topicsByLevel) ? module.topicsByLevel : null;
                if (timeLimitMinutes === undefined || !wordLimitsRaw || !topicsByLevelRaw) return null;

                const low = toFiniteNumber(wordLimitsRaw.low);
                const mid = toFiniteNumber(wordLimitsRaw.mid);
                const high = toFiniteNumber(wordLimitsRaw.high);
                if (low === undefined || mid === undefined || high === undefined) return null;

                const promptImageUrl = trimString(module.promptImageUrl);

                return {
                    order,
                    type: EModuleType.ESSAY,
                    name,
                    timeLimitMinutes,
                    wordLimits: { low, mid, high },
                    topicsByLevel: {
                        low: normalizeStringArray(topicsByLevelRaw.low),
                        mid: normalizeStringArray(topicsByLevelRaw.mid),
                        high: normalizeStringArray(topicsByLevelRaw.high),
                    },
                    ...(promptImageUrl ? { promptImageUrl } : {}),
                };
            }

            if (type === EModuleType.SPEAKING) {
                const partsRaw = isRecord(module.parts) ? module.parts : null;
                if (!partsRaw) return null;

                const totalMinutes = toFiniteNumber(module.totalMinutes);
                const conversationModel = trimString(module.conversationModel);
                const ttsModel = trimString(module.ttsModel);
                const ttsVoice = trimString(module.ttsVoice);
                const gradingModel = trimString(module.gradingModel);
                const speechAnalytics = trimString(module.speechAnalytics);
                const silenceThresholdSeconds = toFiniteNumber(module.silenceThresholdSeconds);
                const criteria = normalizeStringArray(module.criteria);

                const part1Raw = isRecord(partsRaw.part1) ? partsRaw.part1 : null;
                const part2Raw = isRecord(partsRaw.part2) ? partsRaw.part2 : null;
                const part3Raw = isRecord(partsRaw.part3) ? partsRaw.part3 : null;
                if (!part1Raw || !part2Raw || !part3Raw) return null;

                const normalizeTopic = (topic: unknown): ISpeakingQuestion | null => {
                    if (!isRecord(topic)) return null;
                    const text = trimString(topic.text);
                    if (!text) return null;
                    const audioKey = trimString(topic.audioKey);
                    return { text, ...(audioKey ? { audioKey } : {}) };
                };

                const part1Topics = (Array.isArray(part1Raw.topics) ? part1Raw.topics : [])
                    .map(normalizeTopic)
                    .filter((topic): topic is ISpeakingQuestion => topic !== null);

                const part1Minutes = toFiniteNumber(part1Raw.minutes);
                const part1QuestionsRange = Array.isArray(part1Raw.questionsRange)
                    ? (part1Raw.questionsRange as unknown[])
                        .map((item) => toFiniteNumber(item))
                        .filter((item): item is number => item !== undefined)
                    : [];

                const part3Topics = (Array.isArray(part3Raw.topics) ? part3Raw.topics : [])
                    .map(normalizeTopic)
                    .filter((topic): topic is ISpeakingQuestion => topic !== null);

                const part3Minutes = toFiniteNumber(part3Raw.minutes);
                const part3QuestionsRange = Array.isArray(part3Raw.questionsRange)
                    ? (part3Raw.questionsRange as unknown[])
                        .map((item) => toFiniteNumber(item))
                        .filter((item): item is number => item !== undefined)
                    : [];

                const part2Minutes = toFiniteNumber(part2Raw.minutes);
                const part2PrepSeconds = toFiniteNumber(part2Raw.prepSeconds);

                const cueCards = (Array.isArray(part2Raw.cueCards) ? part2Raw.cueCards : [])
                    .map((cueCard) => {
                        if (!isRecord(cueCard)) return null;
                        const level = trimString(cueCard.level);
                        const text = trimString(cueCard.text);
                        if (!['low', 'mid', 'high'].includes(level) || !text) return null;
                        const audioKey = trimString(cueCard.audioKey);
                        const shouldSay = normalizeStringArray(cueCard.shouldSay);

                        return {
                            level: level as 'low' | 'mid' | 'high',
                            text,
                            ...(audioKey ? { audioKey } : {}),
                            ...(shouldSay.length > 0 ? { shouldSay } : {}),
                        };
                    })
                    .filter((cueCard): cueCard is NonNullable<typeof cueCard> => cueCard !== null);

                return {
                    order,
                    type: EModuleType.SPEAKING,
                    name,
                    ...(totalMinutes !== undefined ? { totalMinutes } : {}),
                    ...(conversationModel ? { conversationModel } : {}),
                    ...(ttsModel ? { ttsModel } : {}),
                    ...(ttsVoice ? { ttsVoice } : {}),
                    ...(gradingModel ? { gradingModel } : {}),
                    ...(speechAnalytics ? { speechAnalytics } : {}),
                    ...(silenceThresholdSeconds !== undefined ? { silenceThresholdSeconds } : {}),
                    ...(criteria.length > 0 ? { criteria } : {}),
                    parts: {
                        part1: {
                            ...(part1Minutes !== undefined ? { minutes: part1Minutes } : {}),
                            ...(part1QuestionsRange.length === 2
                                ? { questionsRange: [part1QuestionsRange[0], part1QuestionsRange[1]] }
                                : {}),
                            topics: part1Topics,
                        },
                        part2: {
                            ...(part2Minutes !== undefined ? { minutes: part2Minutes } : {}),
                            ...(part2PrepSeconds !== undefined ? { prepSeconds: part2PrepSeconds } : {}),
                            cueCards,
                        },
                        part3: {
                            ...(part3Minutes !== undefined ? { minutes: part3Minutes } : {}),
                            ...(part3QuestionsRange.length === 2
                                ? { questionsRange: [part3QuestionsRange[0], part3QuestionsRange[1]] }
                                : {}),
                            topics: part3Topics,
                        },
                    },
                };
            }

            return null;
        })
        .filter((module): module is NonNullable<typeof module> => module !== null);
};

// ─── Main Schema ──────────────────────────────────────────────────────────────

const PlacementTestSchema = new mongoose.Schema<IPlacementTest>(
    {
        // ─── Identity ──────────────────────────────────────────────────────────
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
            required: true,
            index: true,
        },
        language: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        standard: {
            type: String,
            required: true,
            trim: true,
        },
        outputFramework: {
            type: String,
            required: true,
            default: 'CEFR',
        },
        description: {
            type: String,
            default: null,
        },

        // ─── Config ────────────────────────────────────────────────────────────
        status: {
            type: String,
            enum: Object.values(EPlacementTestStatus),
            default: EPlacementTestStatus.DRAFT,
            index: true,
        },
        version: {
            type: Number,
            default: 1,
            min: 1,
        },
        settings: {
            targetAudience: {
                type: [String],
                enum: Object.values(ETargetAudience),
                default: [ETargetAudience.NEW_USER],
            },
            allowRetake: { type: Boolean, default: false },
            retakeCooldownDays: { type: Number, default: 30, min: 0 },
        },

        // ─── Modules (polymorphic, sanitized at model layer) ───────────────────
        modules: {
            type: [PlacementModuleSchema],
            default: [],
            set: sanitizeModulesForStorage,
        },

        // ─── CEFR Mapping ──────────────────────────────────────────────────────
        cefrMapping: {
            weights: {
                mcq: { type: Number, default: 0.4, min: 0, max: 1 },
                writing: { type: Number, default: 0.3, min: 0, max: 1 },
                speaking: { type: Number, default: 0.3, min: 0, max: 1 },
            },
            thresholds: { type: [CEFRThresholdSchema], default: [] },
        },

        // ─── Audit ─────────────────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

PlacementTestSchema.index({ languageId: 1, status: 1 });
PlacementTestSchema.index({ language: 1, status: 1 });
PlacementTestSchema.index({ version: -1 });
PlacementTestSchema.index({ language: 1, name: 1 });

PlacementTestSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    if (!update || typeof update !== 'object') {
        return;
    }

    const updateRecord = update as Record<string, unknown>;

    if (Array.isArray(updateRecord.modules)) {
        updateRecord.modules = sanitizeModulesForStorage(updateRecord.modules);
    }

    if (isRecord(updateRecord.$set) && Array.isArray(updateRecord.$set.modules)) {
        updateRecord.$set.modules = sanitizeModulesForStorage(updateRecord.$set.modules);
    }

    this.setUpdate(updateRecord);
});

// ─── Export ───────────────────────────────────────────────────────────────────

export const PlacementTest = mongoose.model<IPlacementTest>('PlacementTest', PlacementTestSchema);
