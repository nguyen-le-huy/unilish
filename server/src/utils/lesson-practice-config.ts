import mongoose from 'mongoose';

interface PracticeConfigShape {
    mode?: string;
    questionIds?: Array<string | mongoose.Types.ObjectId>;
    passingScore?: number;
}

interface ContentWithPracticeConfig {
    practiceConfig?: PracticeConfigShape;
}

export interface EffectivePracticeConfig {
    mode: string | undefined;
    questionIds: mongoose.Types.ObjectId[];
    passingScore: number | undefined;
}

function normalizeQuestionIds(
    questionIds: Array<string | mongoose.Types.ObjectId> | undefined,
): mongoose.Types.ObjectId[] {
    if (!questionIds || questionIds.length === 0) {
        return [];
    }

    return questionIds.flatMap((id) => {
        if (id instanceof mongoose.Types.ObjectId) {
            return [id];
        }

        if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
            return [new mongoose.Types.ObjectId(id)];
        }

        return [];
    });
}

export function resolveEffectivePracticeConfig(params: {
    practiceConfig?: PracticeConfigShape | null | undefined;
    content?: Record<string, unknown> | null | undefined;
}): EffectivePracticeConfig {
    const topLevel = params.practiceConfig ?? undefined;
    const nested = (params.content as ContentWithPracticeConfig | null | undefined)?.practiceConfig;

    const topLevelQuestionIds = normalizeQuestionIds(topLevel?.questionIds);
    const nestedQuestionIds = normalizeQuestionIds(nested?.questionIds);
    const shouldUseNestedConfig =
        topLevelQuestionIds.length === 0
        && nestedQuestionIds.length > 0;

    return {
        mode: shouldUseNestedConfig ? nested?.mode : (topLevel?.mode ?? nested?.mode),
        questionIds: shouldUseNestedConfig ? nestedQuestionIds : topLevelQuestionIds,
        passingScore: shouldUseNestedConfig
            ? nested?.passingScore
            : (topLevel?.passingScore ?? nested?.passingScore),
    };
}
