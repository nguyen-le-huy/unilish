import type { IModuleMCQ } from '@/features/placement-test/types';
import { createDefaultExamModules } from '../../../constants';
import type { IExamModule, IExamQuestionItem } from '../../../types';

type PlacementPart = IModuleMCQ['parts'][number];
type PlacementQuestionItem = NonNullable<
    NonNullable<PlacementPart['manualContent']>['questionItems']
>[number];

const mapExamQuestionItemToPlacement = (item: IExamQuestionItem): PlacementQuestionItem => ({
    question: item.question,
    options: item.options,
    correctOption: item.correctOption,
    explanation: item.explanation,
    transcript: item.transcript,
    audioUrl: item.audioUrl,
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls,
});

const mapPlacementQuestionItemToExam = (item: PlacementQuestionItem): IExamQuestionItem => ({
    question: item.question,
    options: item.options,
    correctOption: item.correctOption,
    explanation: item.explanation,
    transcript: item.transcript,
    audioUrl: item.audioUrl,
    imageUrl: item.imageUrl,
    imageUrls: item.imageUrls,
});

export const toPlacementMcqModule = (examModules: IExamModule[]): IModuleMCQ => {
    const parts: PlacementPart[] = [];

    examModules.forEach((module) => {
        if (module.type !== 'listening' && module.type !== 'reading') {
            return;
        }

        module.parts.forEach((part) => {
            parts.push({
                part: part.part,
                name: part.name,
                questionsCount: part.questionsCount,
                poolTag: part.poolTag,
                difficultyDistribution: {},
                excludeRecentDays: 30,
                topicFilter: [],
                ...(part.manualContent
                    ? {
                        manualContent: {
                            questionItems: part.manualContent.questionItems?.map(
                                mapExamQuestionItemToPlacement,
                            ),
                            questions: part.manualContent.questionItems?.map((item) => item.question) ?? [],
                            groupPattern: part.manualContent.groupPattern,
                            media: part.manualContent.audioUrl
                                ? { audioUrl: part.manualContent.audioUrl }
                                : undefined,
                        },
                    }
                    : {}),
            });
        });
    });

    return {
        order: 1,
        type: 'mcq',
        name: 'TOEIC Compact (Listening + Reading)',
        timeLimitMinutes: 45,
        showCountdown: true,
        allowBackNavigation: false,
        adaptive: true,
        samplingMode: 'random',
        parts: parts.sort((a, b) => a.part - b.part),
    };
};

export const toExamModulesFromPlacementMcq = (module: IModuleMCQ): IExamModule[] => {
    const defaultModules = createDefaultExamModules('toeic_lr');
    const defaultListening = defaultModules.find((item) => item.type === 'listening');
    const defaultReading = defaultModules.find((item) => item.type === 'reading');

    const mappedParts = module.parts
        .sort((a, b) => a.part - b.part)
        .map((part) => ({
            part: part.part,
            name: part.name,
            questionsCount: part.questionsCount,
            poolTag: part.poolTag,
            ...(part.manualContent
                ? {
                    manualContent: {
                        questionItems: part.manualContent.questionItems?.map(
                            mapPlacementQuestionItemToExam,
                        ),
                        audioUrl: part.manualContent.media?.audioUrl,
                        groupPattern: part.manualContent.groupPattern,
                    },
                }
                : {}),
        }));

    const listeningParts = mappedParts.filter((part) => part.part <= 4);
    const readingParts = mappedParts.filter((part) => part.part >= 5);

    return [
        {
            type: 'listening',
            name: 'Listening',
            timeLimitMinutes: 45,
            parts: listeningParts.length > 0
                ? listeningParts
                : (defaultListening?.parts ?? []),
        },
        {
            type: 'reading',
            name: 'Reading',
            timeLimitMinutes: 75,
            parts: readingParts.length > 0
                ? readingParts
                : (defaultReading?.parts ?? []),
        },
    ];
};
