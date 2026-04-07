export interface PlacementResultResponse {
    status?: 'ready' | 'computing' | 'pending';
    sessionId: string;
    cefr: string;
    cefrDescription?: string;
    scores: {
        listening: { rawPercent: number; cefr?: string };
        reading: { rawPercent: number; cefr?: string };
        writing: {
            band: number;
            cefr?: string;
            criteria?: {
                TR?: number;
                CC?: number;
                LR?: number;
                GRA?: number;
            };
        };
        speaking: {
            band: number;
            cefr?: string;
            criteria?: {
                fluency?: number;
                lexical?: number;
                grammar?: number;
                pronunciation?: number;
            };
        };
    };
    feedback?: {
        writing?: {
            strengths?: string[];
            errors?: string[];
            tips?: string[];
        };
        speaking?: {
            strengths?: string[];
            errors?: string[];
            tips?: string[];
            transcriptHighlights?: string[];
        };
    };
}