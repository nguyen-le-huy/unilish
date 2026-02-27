import { useState } from 'react';

import type { CoachState, PhonemeDebugItem } from '../types/speaking.types';

export const useSpeakingTelemetry = () => {
    const [coachState, setCoachState] = useState<CoachState>('Listening');
    const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
    const [lastTokenUsage, setLastTokenUsage] = useState<number | null>(null);
    const [lastModelName, setLastModelName] = useState<string>('—');
    const [lastRequestedModelName, setLastRequestedModelName] = useState<string>('—');
    const [lastUsedFallback, setLastUsedFallback] = useState(false);
    const [lastMicError, setLastMicError] = useState('');
    const [latestPhonemeDebug, setLatestPhonemeDebug] = useState<PhonemeDebugItem[]>([]);

    return {
        coachState,
        setCoachState,
        lastLatencyMs,
        setLastLatencyMs,
        lastTokenUsage,
        setLastTokenUsage,
        lastModelName,
        setLastModelName,
        lastRequestedModelName,
        setLastRequestedModelName,
        lastUsedFallback,
        setLastUsedFallback,
        lastMicError,
        setLastMicError,
        latestPhonemeDebug,
        setLatestPhonemeDebug,
    };
};
