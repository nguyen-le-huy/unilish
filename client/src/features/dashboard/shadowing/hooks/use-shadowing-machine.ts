import { useCallback, useMemo, useReducer } from 'react';
import type { PronunciationResult, Cue } from '../types/shadowing.types';

export type ShadowingState = 'idle' | 'playing' | 'waiting' | 'recording' | 'scoring' | 'result' | 'done';

interface MachineContext {
    state: ShadowingState;
    currentCueIndex: number;
    audioBlob: Blob | null;
    pronunciationResult: PronunciationResult | null;
}

type MachineAction =
    | { type: 'PLAY_CURRENT' }
    | { type: 'ON_CUE_END' }
    | { type: 'START_RECORDING' }
    | { type: 'STOP_RECORDING'; blob: Blob }
    | { type: 'SCORE_COMPLETE'; result: PronunciationResult }
    | { type: 'SCORE_FAILED' }
    | { type: 'RETRY' }
    | { type: 'NEXT'; cueCount: number }
    | { type: 'JUMP_TO_CUE'; index: number; cueCount: number }
    | { type: 'RESTART' };

interface UseShadowingMachineOptions {
    cues: Cue[];
    playCue: (cue: Cue) => void;
    replayCue: (cue: Cue) => void;
}

interface UseShadowingMachineResult {
    state: ShadowingState;
    currentCueIndex: number;
    currentCue: Cue | null;
    audioBlob: Blob | null;
    pronunciationResult: PronunciationResult | null;
    playCurrent: () => void;
    onCueEnd: () => void;
    startRecording: () => void;
    stopRecording: (blob: Blob) => void;
    onScoreComplete: (result: PronunciationResult) => void;
    onScoreFailed: () => void;
    retry: () => void;
    next: () => void;
    jumpToCue: (index: number) => void;
    restart: () => void;
}

const INITIAL_CONTEXT: MachineContext = {
    state: 'idle',
    currentCueIndex: 0,
    audioBlob: null,
    pronunciationResult: null,
};

const reducer = (context: MachineContext, action: MachineAction): MachineContext => {
    switch (action.type) {
        case 'PLAY_CURRENT': {
            if (context.state !== 'idle') {
                return context;
            }
            return { ...context, state: 'playing' };
        }
        case 'ON_CUE_END': {
            if (context.state !== 'playing') {
                return context;
            }
            return { ...context, state: 'waiting' };
        }
        case 'START_RECORDING': {
            if (context.state !== 'waiting') {
                return context;
            }
            return { ...context, state: 'recording' };
        }
        case 'STOP_RECORDING': {
            if (context.state !== 'recording') {
                return context;
            }
            return {
                ...context,
                state: 'scoring',
                audioBlob: action.blob,
                pronunciationResult: null,
            };
        }
        case 'SCORE_COMPLETE': {
            if (context.state !== 'scoring') {
                return context;
            }
            return {
                ...context,
                state: 'result',
                pronunciationResult: action.result,
            };
        }
        case 'SCORE_FAILED': {
            if (context.state !== 'scoring') {
                return context;
            }

            return {
                ...context,
                state: 'waiting',
                audioBlob: null,
                pronunciationResult: null,
            };
        }
        case 'RETRY': {
            if (context.state !== 'waiting' && context.state !== 'result') {
                return context;
            }
            return {
                ...context,
                state: 'playing',
                audioBlob: null,
                pronunciationResult: null,
            };
        }
        case 'NEXT': {
            if (context.state !== 'result') {
                return context;
            }

            if (action.cueCount <= 0 || context.currentCueIndex >= action.cueCount - 1) {
                return {
                    ...context,
                    state: 'done',
                    audioBlob: null,
                    pronunciationResult: null,
                };
            }

            return {
                state: 'idle',
                currentCueIndex: context.currentCueIndex + 1,
                audioBlob: null,
                pronunciationResult: null,
            };
        }
        case 'JUMP_TO_CUE': {
            if (action.index < 0 || action.index >= action.cueCount) {
                return context;
            }

            if (context.state === 'recording' || context.state === 'scoring') {
                return context;
            }

            return {
                state: 'idle',
                currentCueIndex: action.index,
                audioBlob: null,
                pronunciationResult: null,
            };
        }
        case 'RESTART': {
            return INITIAL_CONTEXT;
        }
        default: {
            return context;
        }
    }
};

export const useShadowingMachine = ({
    cues,
    playCue,
    replayCue,
}: UseShadowingMachineOptions): UseShadowingMachineResult => {
    const [context, dispatch] = useReducer(reducer, INITIAL_CONTEXT);

    const currentCue = useMemo(() => cues[context.currentCueIndex] ?? null, [context.currentCueIndex, cues]);

    const playCurrent = useCallback(() => {
        if (!currentCue) {
            return;
        }

        playCue(currentCue);
        dispatch({ type: 'PLAY_CURRENT' });
    }, [currentCue, playCue]);

    const onCueEnd = useCallback(() => {
        dispatch({ type: 'ON_CUE_END' });
    }, []);

    const startRecording = useCallback(() => {
        dispatch({ type: 'START_RECORDING' });
    }, []);

    const stopRecording = useCallback((blob: Blob) => {
        dispatch({ type: 'STOP_RECORDING', blob });
    }, []);

    const onScoreComplete = useCallback((result: PronunciationResult) => {
        dispatch({ type: 'SCORE_COMPLETE', result });
    }, []);

    const onScoreFailed = useCallback(() => {
        dispatch({ type: 'SCORE_FAILED' });
    }, []);

    const retry = useCallback(() => {
        if (!currentCue) {
            return;
        }

        replayCue(currentCue);
        dispatch({ type: 'RETRY' });
    }, [currentCue, replayCue]);

    const next = useCallback(() => {
        dispatch({ type: 'NEXT', cueCount: cues.length });
    }, [cues.length]);

    const jumpToCue = useCallback((index: number) => {
        dispatch({ type: 'JUMP_TO_CUE', index, cueCount: cues.length });
    }, [cues.length]);

    const restart = useCallback(() => {
        dispatch({ type: 'RESTART' });
    }, []);

    return useMemo(() => ({
        state: context.state,
        currentCueIndex: context.currentCueIndex,
        currentCue,
        audioBlob: context.audioBlob,
        pronunciationResult: context.pronunciationResult,
        playCurrent,
        onCueEnd,
        startRecording,
        stopRecording,
        onScoreComplete,
        onScoreFailed,
        retry,
        next,
        jumpToCue,
        restart,
    }), [
        context.audioBlob,
        context.currentCueIndex,
        context.pronunciationResult,
        context.state,
        currentCue,
        jumpToCue,
        next,
        onCueEnd,
        onScoreComplete,
        onScoreFailed,
        playCurrent,
        restart,
        retry,
        startRecording,
        stopRecording,
    ]);
};
