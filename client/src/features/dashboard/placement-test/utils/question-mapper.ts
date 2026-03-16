import type { PartInfo, ToeicQuestion, ToeicQuestionGroup, ToeicPart } from '../components/listening-reading/types';
import type { RuntimeAttempt, RuntimePart } from '../types/runtime.types';
import { env } from '@/config/env';

const PART_ORDER: ToeicPart[] = [1, 2, 3, 4, 5, 6, 7];

const isToeicPart = (value: number): value is ToeicPart => {
    return PART_ORDER.includes(value as ToeicPart);
};

const toProxiedAudioUrl = (rawAudioUrl?: string): string | undefined => {
    if (!rawAudioUrl) {
        return undefined;
    }

    const trimmed = rawAudioUrl.trim();
    if (!trimmed) {
        return undefined;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            const key = parsed.pathname.replace(/^\/+/, '');
            if (!key) {
                return trimmed;
            }

            // Use backend proxy for known R2 public domains to avoid CORS and custom-domain failures.
            if (parsed.hostname.endsWith('r2.dev') || parsed.hostname.includes('r2.cloudflarestorage.com')) {
                return `${env.API_URL}/audio/${key}`;
            }

            return trimmed;
        } catch {
            return trimmed;
        }
    }

    return `${env.API_URL}/audio/${trimmed.replace(/^\/+/, '')}`;
};

const toQuestion = (
    part: RuntimePart,
    question: RuntimePart['questions'][number],
    displayQuestionNumber: number,
): ToeicQuestion => {
    const normalizedOptions = part.part === 2
        ? question.options.slice(0, 3)
        : question.options;
    const normalizedImageUrls = (question.imageUrls ?? []).filter((imageUrl) => Boolean(imageUrl?.trim()));

    return {
        id: question.questionId,
        questionNumber: displayQuestionNumber,
        imageUrl: question.imageUrl,
        imageUrls: normalizedImageUrls.length > 0 ? normalizedImageUrls : undefined,
        optionCount: normalizedOptions.length === 3 ? 3 : 4,
        questionText: question.questionText,
        optionsText: normalizedOptions.map((option) => option.text),
        part: part.part as ToeicPart,
        groupId: question.groupId,
        audioUrl: toProxiedAudioUrl(question.audioUrl),
    };
};

const getGroupedQuestionKey = (part: ToeicPart, question: ToeicQuestion): string => {
    if (question.groupId) {
        return question.groupId;
    }

    // Part 6 should share one visual for a question cluster when media is shared.
    if (part === 6) {
        const mediaKey = (question.imageUrls && question.imageUrls[0]) || question.imageUrl;
        if (mediaKey) {
            return `p${part}-media-${mediaKey}`;
        }
    }

    return `p${part}-q${question.id}`;
};

export const mapAttemptToParts = (attempt: RuntimeAttempt) => {
    const runtimeParts = attempt.modules
        .flatMap((module) => module.parts)
        .filter((part) => isToeicPart(part.part))
        .sort((a, b) => a.part - b.part);

    const partQuestions: Partial<Record<ToeicPart, ToeicQuestion[]>> = {};
    const partGroups: Partial<Record<ToeicPart, ToeicQuestionGroup[]>> = {};
    const partInfos: PartInfo[] = [];
    const partAudio: Partial<Record<ToeicPart, string>> = {};
    let questionCursor = 1;

    for (const runtimePart of runtimeParts) {
        const part = runtimePart.part as ToeicPart;
        const normalizedPartAudio = toProxiedAudioUrl(runtimePart.audioUrl);
        const questions = runtimePart.questions.map((question) => {
            const mappedQuestion = toQuestion(runtimePart, question, questionCursor);
            questionCursor += 1;
            return mappedQuestion;
        });

        partQuestions[part] = questions;

        const grouped = new Map<string, ToeicQuestionGroup>();
        for (const question of questions) {
            const groupId = getGroupedQuestionKey(part, question);
            const existing = grouped.get(groupId);
            if (existing) {
                existing.questions.push(question);
                if (question.imageUrls && question.imageUrls.length > 0) {
                    const merged = Array.from(new Set([...(existing.imageUrls ?? []), ...question.imageUrls]));
                    existing.imageUrls = part === 6 ? merged.slice(0, 1) : merged;
                    existing.imageUrl = undefined;
                } else if (!existing.imageUrl && question.imageUrl) {
                    existing.imageUrl = question.imageUrl;
                }
            } else {
                const initialImageUrls = question.imageUrls && question.imageUrls.length > 0
                    ? (part === 6 ? question.imageUrls.slice(0, 1) : question.imageUrls)
                    : undefined;
                grouped.set(groupId, {
                    id: groupId,
                    imageUrl: initialImageUrls ? undefined : question.imageUrl,
                    imageUrls: initialImageUrls,
                    audioUrl: question.audioUrl,
                    questions: [question],
                });
            }

            if (!partAudio[part] && question.audioUrl) {
                partAudio[part] = question.audioUrl;
            }
        }

        if (!partAudio[part] && normalizedPartAudio) {
            partAudio[part] = normalizedPartAudio;
        }

        partGroups[part] = Array.from(grouped.values());
        partInfos.push({
            part,
            label: `Part ${part}`,
            questionCount: questions.length,
        });
    }

    partInfos.sort((a, b) => a.part - b.part);

    const availableParts = partInfos.map((item) => item.part);
    const nextPartMap: Partial<Record<ToeicPart, ToeicPart>> = {};
    availableParts.forEach((currentPart, index) => {
        const nextPart = availableParts[index + 1];
        if (nextPart) {
            nextPartMap[currentPart] = nextPart;
        }
    });

    return {
        partInfos,
        partQuestions,
        partGroups,
        partAudio,
        nextPartMap,
    };
};
