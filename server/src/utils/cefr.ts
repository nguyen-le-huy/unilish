import type { ICEFRThreshold } from '../models/mongo/placement-test.model.js';

export interface CEFRWeights {
    mcq: number;
    writing: number;
    speaking: number;
}

export interface ComputeFinalCEFRInput {
    lrPercent: number; // normalized 0..1
    writingBandNormalized: number; // normalized 0..1
    speakingBandNormalized: number; // normalized 0..1
    weights: CEFRWeights;
    thresholds: ICEFRThreshold[];
}

const clamp01 = (value: number): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
};

const DEFAULT_LEVEL_BY_WEIGHTED_SCORE = (weighted: number): string => {
    if (weighted >= 0.9) return 'C2';
    if (weighted >= 0.75) return 'C1';
    if (weighted >= 0.6) return 'B2';
    if (weighted >= 0.45) return 'B1';
    if (weighted >= 0.25) return 'A2';
    return 'A1';
};

/**
 * Computes final CEFR level based on weighted normalized scores.
 * Thresholds in existing schema are reused via mcqMin/mcqMax as weighted range bounds.
 */
export const computeFinalCEFR = (input: ComputeFinalCEFRInput): string => {
    const mcq = clamp01(input.lrPercent);
    const writing = clamp01(input.writingBandNormalized);
    const speaking = clamp01(input.speakingBandNormalized);

    const weighted =
        mcq * input.weights.mcq
        + writing * input.weights.writing
        + speaking * input.weights.speaking;

    const match = input.thresholds.find((threshold) => (
        weighted >= clamp01(threshold.mcqMin)
        && weighted < clamp01(threshold.mcqMax)
    ));

    if (match) {
        return match.level;
    }

    return DEFAULT_LEVEL_BY_WEIGHTED_SCORE(weighted);
};
