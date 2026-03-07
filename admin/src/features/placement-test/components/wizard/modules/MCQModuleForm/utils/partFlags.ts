// ─── Part Flags ───────────────────────────────────────────────────────────────
// Derive all boolean flags for a TOEIC part from partNumber + poolTag.
// Centralises the detection logic that was previously duplicated 3+ times in JSX.

export interface PartFlags {
    isPart1: boolean;
    isPart2: boolean;
    isPart3: boolean;
    isPart4: boolean;
    isPart5: boolean;
    isPart6: boolean;
    isPart7: boolean;
    /** Any listening part (1–4) */
    isListeningPart: boolean;
    /** Parts whose questions are authored in groups (3, 4, 6, 7) */
    isGroupedPart: boolean;
    /** Parts with individual grouped clusters: Part 6 (4 q) or Part 7 (N q) */
    isReadingGroupedPart: boolean;
    /** Listening grouped parts (3 or 4) */
    isListeningGroupedPart: boolean;
    /** Parts for which we show shared part-level audio (1–4) */
    hasSharedAudio: boolean;
}

export function getPartFlags(partNumber: number, poolTag: string): PartFlags {
    const tag = poolTag.toLowerCase();

    const isPart1 = partNumber === 1 || tag.includes('toeic-listening-part1');
    const isPart2 = partNumber === 2 || tag.includes('toeic-listening-part2');
    const isPart3 = partNumber === 3 || tag.includes('toeic-listening-part3');
    const isPart4 = partNumber === 4 || tag.includes('toeic-listening-part4');
    const isPart5 = partNumber === 5 || tag.includes('toeic-reading-part5');
    const isPart6 = partNumber === 6 || tag.includes('toeic-reading-part6');
    const isPart7 = partNumber === 7 || tag.includes('toeic-reading-part7');

    const isListeningPart = isPart1 || isPart2 || isPart3 || isPart4;
    const isListeningGroupedPart = isPart3 || isPart4;
    const isReadingGroupedPart = isPart6 || isPart7;
    const isGroupedPart = isListeningGroupedPart || isReadingGroupedPart;
    const hasSharedAudio = isListeningPart;

    return {
        isPart1,
        isPart2,
        isPart3,
        isPart4,
        isPart5,
        isPart6,
        isPart7,
        isListeningPart,
        isGroupedPart,
        isReadingGroupedPart,
        isListeningGroupedPart,
        hasSharedAudio,
    };
}
