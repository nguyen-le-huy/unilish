import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ShadowingPlayer.module.css';
import ScorePanel from '../ScorePanel/ScorePanel';
import CueDisplay from '../CueDisplay/CueDisplay';
import TranscriptPanel from '../TranscriptPanel/TranscriptPanel';
import { useAzurePronunciation } from '../../hooks/use-azure-pronunciation';
import { useShadowingMachine } from '../../hooks/use-shadowing-machine';
import { useShadowingRecorder } from '../../hooks/use-shadowing-recorder';
import { useYtPlayer } from '../../hooks/use-yt-player';
import type { ShadowingVideo } from '../../types/shadowing.types';

interface ShadowingPlayerProps {
    video: ShadowingVideo;
    mode: 'with-transcript' | 'without-transcript';
    onModeChange: (mode: 'with-transcript' | 'without-transcript') => void;
}

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'An error occurred while recording.';
};

const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const ShadowingPlayer = ({ video, mode, onModeChange }: ShadowingPlayerProps) => {
    const onCueEndRef = useRef<(() => void) | null>(null);
    const hasAutoPlayedRef = useRef(false);

    const [recorderError, setRecorderError] = useState<string | null>(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);

    const ytPlayer = useYtPlayer('yt-player-container', video.videoId, () => {
        onCueEndRef.current?.();
    });

    const machine = useShadowingMachine({
        cues: video.cues,
        playCue: ytPlayer.playCue,
        replayCue: ytPlayer.replayCue,
    });

    useEffect(() => {
        onCueEndRef.current = machine.onCueEnd;
    }, [machine.onCueEnd]);

    const { startRecording, stopRecording, isRecording } = useShadowingRecorder();
    const { scoreBlob, isScoring, error: scoringError, clearError } = useAzurePronunciation();

    const currentCue = machine.currentCue;

    const cueCounterLabel = useMemo(() => {
        return `Cue ${Math.min(machine.currentCueIndex + 1, video.cues.length)}/${video.cues.length}`;
    }, [machine.currentCueIndex, video.cues.length]);

    useEffect(() => {
        hasAutoPlayedRef.current = false;
    }, [video.videoId]);

    useEffect(() => {
        if (!ytPlayer.isReady || machine.state !== 'idle' || machine.currentCueIndex !== 0 || hasAutoPlayedRef.current) {
            return;
        }

        hasAutoPlayedRef.current = true;
        machine.playCurrent();
    }, [machine, ytPlayer.isReady]);

    useEffect(() => {
        if (machine.state !== 'recording') {
            return;
        }

        const intervalId = window.setInterval(() => {
            setRecordingSeconds((seconds) => seconds + 1);
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [machine.state]);

    useEffect(() => {
        const audioBlob = machine.audioBlob;

        if (machine.state !== 'scoring' || !audioBlob || !currentCue) {
            return;
        }

        let isCancelled = false;

        const runScoring = async () => {
            try {
                const result = await scoreBlob(audioBlob, currentCue.text);
                if (isCancelled) {
                    return;
                }

                machine.onScoreComplete(result);
            } catch {
                if (isCancelled) {
                    return;
                }

                machine.onScoreFailed();
            }
        };

        void runScoring();

        return () => {
            isCancelled = true;
        };
    }, [currentCue, machine, scoreBlob]);

    const handlePlayCurrent = useCallback(() => {
        clearError();
        machine.playCurrent();
    }, [clearError, machine]);

    const handleStartRecording = useCallback(async () => {
        setRecorderError(null);

        try {
            await startRecording();
            setRecordingSeconds(0);
            machine.startRecording();
        } catch (error) {
            setRecorderError(getErrorMessage(error));
        }
    }, [machine, startRecording]);

    const handleStopRecording = useCallback(async () => {
        setRecorderError(null);

        try {
            const blob = await stopRecording();
            setRecordingSeconds(0);
            machine.stopRecording(blob);
        } catch (error) {
            setRecorderError(getErrorMessage(error));
        }
    }, [machine, stopRecording]);

    const handleRetry = useCallback(() => {
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.retry();
    }, [clearError, machine]);

    const handleNext = useCallback(() => {
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.next();
    }, [clearError, machine]);

    const handleRestart = useCallback(() => {
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.restart();
    }, [clearError, machine]);

    const handleCueClick = useCallback((index: number) => {
        ytPlayer.pausePlayer();
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.jumpToCue(index);
    }, [clearError, machine, ytPlayer]);

    if (!currentCue) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>No cues available for this video.</p>
            </div>
        );
    }

    return (
        <section className={styles.playerRoot}>
            <div className={styles.playerHeader}>
                <div className={styles.modeToggle}>
                    <button
                        className={`${styles.modeButton} ${mode === 'with-transcript' ? styles.modeButtonActive : ''}`.trim()}
                        onClick={() => onModeChange('with-transcript')}
                        aria-label="Show transcript mode"
                    >
                        With Transcript
                    </button>
                    <button
                        className={`${styles.modeButton} ${mode === 'without-transcript' ? styles.modeButtonActive : ''}`.trim()}
                        onClick={() => onModeChange('without-transcript')}
                        aria-label="Hide transcript while playing"
                    >
                        Without Transcript
                    </button>
                </div>
                <p className={styles.cueCounter}>{cueCounterLabel}</p>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.leftColumn}>
                    <div className={styles.playerFrame}>
                        <div id="yt-player-container" className={styles.youtubeMount} aria-label={`YouTube player: ${video.title}`} />
                    </div>

                    <div className={styles.statusRow}>
                        <span className={styles.statusDot} aria-hidden="true" />
                        <span className={styles.statusText}>State: {machine.state}</span>
                    </div>

                    <div className={styles.controlsRow}>
                        {machine.state === 'idle' && (
                            <button className={styles.primaryButton} onClick={handlePlayCurrent} aria-label="Play current cue">
                                ▶ Play cue
                            </button>
                        )}

                        {machine.state === 'waiting' && (
                            <>
                                <button className={styles.primaryButton} onClick={() => void handleStartRecording()} aria-label="Start recording">
                                    🎙 Ready to record
                                </button>
                                <button className={styles.ghostButton} onClick={handleRetry} aria-label="Replay current cue">
                                    ↩ Replay
                                </button>
                            </>
                        )}

                        {machine.state === 'recording' && (
                            <>
                                <button className={styles.dangerButton} onClick={() => void handleStopRecording()} aria-label="Stop recording">
                                    ⏹ Finish
                                </button>
                                <span className={styles.timerText}>{formatRecordingTime(recordingSeconds)}</span>
                            </>
                        )}

                        {machine.state === 'scoring' && (
                            <p className={styles.statusText}>{isScoring ? 'Scoring pronunciation...' : 'Preparing score...'}</p>
                        )}

                        {machine.state === 'playing' && (
                            <p className={styles.statusText}>Playing cue...</p>
                        )}
                    </div>

                    <CueDisplay cue={currentCue} mode={mode} state={machine.state} />

                    {machine.state === 'result' && machine.pronunciationResult && (
                        <ScorePanel result={machine.pronunciationResult} onRetry={handleRetry} onNext={handleNext} />
                    )}

                    {machine.state === 'done' && (
                        <div className={styles.donePanel}>
                            <p className={styles.doneText}>Exercise complete.</p>
                            <button className={styles.primaryButton} onClick={handleRestart} aria-label="Restart from first cue">
                                Review from start
                            </button>
                        </div>
                    )}

                    {(recorderError || scoringError) && (
                        <p className={styles.errorText} role="alert">
                            {recorderError ?? scoringError}
                        </p>
                    )}
                </div>

                <div className={styles.rightColumn}>
                    <TranscriptPanel
                        cues={video.cues}
                        activeCueIndex={machine.currentCueIndex}
                        mode={mode}
                        state={machine.state}
                        onCueClick={handleCueClick}
                    />
                </div>
            </div>

            <div className={styles.playerReadyText}>
                {ytPlayer.isReady ? 'Player ready' : 'Loading player...'}
                {isRecording ? ' · Recording' : ''}
            </div>
        </section>
    );
};

export default ShadowingPlayer;
