import { useMemo } from 'react';

import type { CoachChatMessage } from '../types/speaking.types';

interface UseKeywordCoverageParams {
    requiredKeywords: string[];
    messages: CoachChatMessage[];
}

export const useKeywordCoverage = ({ requiredKeywords, messages }: UseKeywordCoverageParams) => {
    const keywordHitSet = useMemo(() => {
        const userText = messages
            .filter((message) => message.role === 'user')
            .map((message) => message.content.toLowerCase())
            .join(' ');

        const hit = new Set<string>();
        requiredKeywords.forEach((keyword) => {
            if (userText.includes(keyword.toLowerCase())) {
                hit.add(keyword);
            }
        });

        return hit;
    }, [messages, requiredKeywords]);

    const completionRatio = requiredKeywords.length === 0
        ? 1
        : keywordHitSet.size / requiredKeywords.length;

    return {
        keywordHitSet,
        completionRatio,
    };
};
