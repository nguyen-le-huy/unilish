import { Lesson } from '../../models/mongo/lesson.model.js';

interface SpeakingLessonContext {
    lessonId: string;
    lessonTitle: string;
    missionTitle: string;
    missionDescription: string;
    /** BCP-47 target language for the lesson (defaults to 'en') */
    targetLanguage: string;
    preferredVoiceId?: string;
    aiConfig: {
        roleName: string;
        firstMessage: string;
        systemInstruction: string;
        voiceId?: string;
    };
    requiredKeywords: string[];
}

interface SpeakingLessonContentShape {
    missionTitle?: string;
    missionDescription?: string;
    aiConfig?: {
        roleName?: string;
        firstMessage?: string;
        systemInstruction?: string;
        voiceId?: string;
    };
    gradingConfig?: {
        requiredKeywords?: string[];
    };
}

interface PopulatedLanguageShape {
    code?: string;
    ttsConfig?: {
        provider?: string;
        voiceId?: string | null;
    };
}

interface PopulatedSeriesShape {
    languageId?: PopulatedLanguageShape | string;
}

interface PopulatedCourseShape {
    seriesId?: PopulatedSeriesShape | string;
}

interface PopulatedUnitShape {
    courseId?: PopulatedCourseShape | string;
}

interface PopulatedSpeakingLesson {
    _id: { toString(): string };
    title?: string;
    content?: unknown;
    unitId?: PopulatedUnitShape | string;
}

const normalizeLanguageCode = (languageCode: string | undefined): string => {
    const raw = languageCode?.trim();
    if (!raw) {
        return 'en';
    }

    const segments = raw
        .replace(/_/g, '-')
        .split('-')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
        return 'en';
    }

    const primary = segments[0] || 'en';
    const rest = segments.slice(1);
    const normalizedPrimary = primary.toLowerCase();
    const normalizedRest = rest.map((segment) => {
        if (segment.length === 2 || segment.length === 3) {
            return segment.toUpperCase();
        }
        if (segment.length === 4) {
            const firstChar = segment.charAt(0).toUpperCase();
            return `${firstChar}${segment.slice(1).toLowerCase()}`;
        }
        return segment;
    });

    return [normalizedPrimary, ...normalizedRest].join('-');
};

export class SpeakingLessonMongoRepository {
    async findLessonContext(lessonId: string): Promise<SpeakingLessonContext | null> {
        const lesson = await Lesson.findOne({ _id: lessonId, type: 'SPEAKING' })
            .select('title content unitId')
            .populate({
                path: 'unitId',
                select: 'courseId',
                populate: {
                    path: 'courseId',
                    select: 'seriesId',
                    populate: {
                        path: 'seriesId',
                        select: 'languageId',
                        populate: {
                            path: 'languageId',
                            select: 'code ttsConfig.provider ttsConfig.voiceId',
                        },
                    },
                },
            })
            .lean()
            .exec() as PopulatedSpeakingLesson | null;

        if (!lesson) {
            return null;
        }

        const content = (lesson.content ?? {}) as SpeakingLessonContentShape;

        const unit = lesson.unitId && typeof lesson.unitId !== 'string' ? lesson.unitId : undefined;
        const course = unit?.courseId && typeof unit.courseId !== 'string' ? unit.courseId : undefined;
        const series = course?.seriesId && typeof course.seriesId !== 'string' ? course.seriesId : undefined;
        const language = series?.languageId && typeof series.languageId !== 'string' ? series.languageId : undefined;

        const targetLanguage = normalizeLanguageCode(language?.code);
        const preferredVoiceId =
            language?.ttsConfig?.provider === 'OPENAI'
            && typeof language.ttsConfig.voiceId === 'string'
            && language.ttsConfig.voiceId.trim().length > 0
                ? language.ttsConfig.voiceId.trim()
                : undefined;

        const requiredKeywordsRaw = content.gradingConfig?.requiredKeywords ?? [];
        const requiredKeywords = requiredKeywordsRaw
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 0);

        const aiConfig: SpeakingLessonContext['aiConfig'] = {
            roleName: content.aiConfig?.roleName?.trim() || 'Friendly speaking partner',
            firstMessage: content.aiConfig?.firstMessage?.trim() || '',
            systemInstruction: content.aiConfig?.systemInstruction?.trim() || '',
        };

        const lessonVoiceId = content.aiConfig?.voiceId?.trim();
        if (lessonVoiceId) {
            aiConfig.voiceId = lessonVoiceId;
        }

        const context: SpeakingLessonContext = {
            lessonId: lesson._id.toString(),
            lessonTitle: lesson.title?.trim() || 'Speaking Lesson',
            missionTitle: content.missionTitle?.trim() || lesson.title?.trim() || 'Speaking Mission',
            missionDescription: content.missionDescription?.trim() || '',
            targetLanguage,
            aiConfig,
            requiredKeywords,
        };

        if (preferredVoiceId) {
            context.preferredVoiceId = preferredVoiceId;
        }

        return context;
    }
}

export type { SpeakingLessonContext };
