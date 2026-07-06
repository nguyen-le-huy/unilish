import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ShadowingPlayer.module.css';
import CueDisplay from '../CueDisplay/CueDisplay';
import TranscriptPanel from '../TranscriptPanel/TranscriptPanel';
import { useAzurePronunciation } from '../../hooks/use-azure-pronunciation';
import { useShadowingMachine } from '../../hooks/use-shadowing-machine';
import { useShadowingRecorder } from '../../hooks/use-shadowing-recorder';
import { useYtPlayer } from '../../hooks/use-yt-player';
import type { ShadowingVideo } from '../../types/shadowing.types';
import micIcon from '@/assets/icons/mic.svg';
import retryIcon from '@/assets/icons/retry.svg';

interface ShadowingPlayerProps {
    video: ShadowingVideo;
    mode: 'with-transcript' | 'without-transcript';
    onModeChange: (mode: 'with-transcript' | 'without-transcript') => void;
    onSaveCues: (cues: ShadowingVideo['cues']) => Promise<ShadowingVideo['cues']>;
    isSavingCues: boolean;
    saveError: string | null;
}

type CueVocabularyItem = NonNullable<ShadowingVideo['cues'][number]['vocabulary']>[number];

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

const STATE_LABELS: Record<string, string> = {
    idle: 'Sẵn sàng',
    playing: 'Đang phát câu mẫu',
    waiting: 'Đến lượt bạn nói',
    recording: 'Đang ghi âm',
    scoring: 'Đang chấm phát âm',
    result: 'Đã có kết quả',
    done: 'Hoàn thành',
};

const mergeVocabulary = (cues: ShadowingVideo['cues']): CueVocabularyItem[] => {
    const uniqueByKey = new Map<string, CueVocabularyItem>();
    cues.forEach((cue) => {
        (cue.vocabulary ?? []).forEach((item) => {
            const key = `${item.word.toLowerCase()}::${item.pos.toLowerCase()}`;
            if (!uniqueByKey.has(key)) {
                uniqueByKey.set(key, item);
            }
        });
    });

    return Array.from(uniqueByKey.values());
};

const mergeTranslation = (cues: ShadowingVideo['cues']): string | null => {
    const merged = cues
        .map((cue) => cue.translationVi?.trim() ?? '')
        .filter(Boolean)
        .join(' ');

    return merged.length > 0 ? merged : null;
};

const ShadowingPlayer = ({ video, mode, onModeChange, onSaveCues, isSavingCues, saveError }: ShadowingPlayerProps) => {
    const playerRootRef = useRef<HTMLElement | null>(null);
    const onCueEndRef = useRef<(() => void) | null>(null);
    const hasAutoPlayedRef = useRef(false);
    const lastScoringRef = useRef<{ cueId: string; blobSize: number; blobType: string } | null>(null);

    const [recorderError, setRecorderError] = useState<string | null>(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [editableCues, setEditableCues] = useState(video.cues);
    const [selectedCueIds, setSelectedCueIds] = useState<Set<string>>(new Set());
    const [editingCueId, setEditingCueId] = useState<string | null>(null);
    const [draftText, setDraftText] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [editorError, setEditorError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const ytPlayer = useYtPlayer('yt-player-container', video.videoId, () => {
        onCueEndRef.current?.();
    });

    const machine = useShadowingMachine({
        cues: editableCues,
        playCue: ytPlayer.playCue,
        replayCue: ytPlayer.replayCue,
    });

    useEffect(() => {
        onCueEndRef.current = machine.onCueEnd;
    }, [machine.onCueEnd]);

    const { startRecording, stopRecording, isRecording } = useShadowingRecorder();
    const { scoreBlob, isScoring, error: scoringError, clearError } = useAzurePronunciation();

    const currentCue = machine.currentCue;
    const {
        audioBlob: machineAudioBlob,
        onScoreComplete,
        onScoreFailed,
        state: machineState,
    } = machine;

    const cueCounterLabel = useMemo(() => {
        return `Câu ${Math.min(machine.currentCueIndex + 1, editableCues.length)} / ${editableCues.length}`;
    }, [machine.currentCueIndex, editableCues.length]);

    const cueProgressPercent = useMemo(() => {
        if (editableCues.length === 0) {
            return 0;
        }

        return Math.round(((machine.currentCueIndex + 1) / editableCues.length) * 100);
    }, [editableCues.length, machine.currentCueIndex]);

    useEffect(() => {
        hasAutoPlayedRef.current = false;
    }, [video.videoId]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === playerRootRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

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
        const audioBlob = machineAudioBlob;

        if (machineState !== 'scoring' || !audioBlob || !currentCue) {
            return;
        }

        const scoringKey = {
            cueId: currentCue.id,
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
        };

        if (
            lastScoringRef.current
            && lastScoringRef.current.cueId === scoringKey.cueId
            && lastScoringRef.current.blobSize === scoringKey.blobSize
            && lastScoringRef.current.blobType === scoringKey.blobType
        ) {
            return;
        }

        lastScoringRef.current = scoringKey;

        let isCancelled = false;

        const runScoring = async () => {
            try {
                const result = await scoreBlob(audioBlob, currentCue.text);
                if (isCancelled) {
                    return;
                }

                onScoreComplete(result);
            } catch {
                if (isCancelled) {
                    return;
                }

                onScoreFailed();
            }
        };

        void runScoring();

        return () => {
            isCancelled = true;
        };
    }, [currentCue, machineAudioBlob, machineState, onScoreComplete, onScoreFailed, scoreBlob]);

    useEffect(() => {
        if (machineState !== 'scoring') {
            lastScoringRef.current = null;
        }
    }, [machineState]);

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
        const nextIndex = Math.min(machine.currentCueIndex + 1, editableCues.length - 1);
        if (nextIndex === machine.currentCueIndex) {
            return;
        }

        machine.jumpAndPlay(nextIndex);
    }, [clearError, editableCues.length, machine]);


    const handleRestart = useCallback(() => {
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.restart();
    }, [clearError, machine]);

    const handleToggleFullscreen = useCallback(async () => {
        try {
            if (document.fullscreenElement === playerRootRef.current) {
                await document.exitFullscreen();
                return;
            }

            await playerRootRef.current?.requestFullscreen();
        } catch {
            setRecorderError('Trình duyệt không thể mở chế độ toàn màn hình.');
        }
    }, []);

    const handleCueClick = useCallback((index: number) => {
        ytPlayer.pausePlayer();
        clearError();
        setRecorderError(null);
        setRecordingSeconds(0);
        machine.jumpAndPlay(index);
    }, [clearError, machine, ytPlayer]);


    const isEditable = useMemo(() => {
        return ['idle', 'waiting', 'result', 'done'].includes(machine.state) && !isSavingCues;
    }, [isSavingCues, machine.state]);

    const selectedIndices = useMemo(() => {
        const indexMap = new Map(editableCues.map((cue, index) => [cue.id, index] as const));
        return Array.from(selectedCueIds)
            .map((id) => indexMap.get(id))
            .filter((value): value is number => value !== undefined)
            .sort((a, b) => a - b);
    }, [editableCues, selectedCueIds]);

    const isMergeable = useMemo(() => {
        if (selectedIndices.length < 2) {
            return false;
        }

        return selectedIndices.every((index, i) => (i === 0 ? true : index === selectedIndices[i - 1]! + 1));
    }, [selectedIndices]);

    const updateCues = useCallback((nextCues: ShadowingVideo['cues']) => {
        setEditableCues(nextCues);
        setIsDirty(true);
    }, []);

    const handleToggleSelect = useCallback((cueId: string) => {
        setEditorError(null);
        setSelectedCueIds((prev) => {
            const next = new Set(prev);
            if (next.has(cueId)) {
                next.delete(cueId);
            } else {
                next.add(cueId);
            }
            return next;
        });
    }, []);

    const handleStartEdit = useCallback((cueId: string) => {
        const cue = editableCues.find((item) => item.id === cueId);
        if (!cue) {
            return;
        }

        setEditorError(null);
        setEditingCueId(cueId);
        setDraftText(cue.text);
    }, [editableCues]);

    const handleCancelEdit = useCallback(() => {
        setEditingCueId(null);
        setDraftText('');
        setEditorError(null);
    }, []);

    const handleSaveEdit = useCallback((cueId: string, text: string) => {
        const nextText = text.trim();
        if (!nextText) {
            setEditorError('Cue text cannot be empty.');
            return;
        }

        const nextCues = editableCues.map((cue) => (
            cue.id === cueId
                ? { ...cue, text: nextText }
                : cue
        ));

        updateCues(nextCues);
        setEditingCueId(null);
        setDraftText('');
        setEditorError(null);
    }, [editableCues, updateCues]);

    const createCueId = useCallback(() => {
        return `cue-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }, []);

    const handleSplitCue = useCallback((cueId: string, text: string, splitIndex: number) => {
        const cueIndex = editableCues.findIndex((item) => item.id === cueId);
        if (cueIndex < 0) {
            return;
        }

        const cue = editableCues[cueIndex];
        if (!cue) {
            return;
        }

        const totalDuration = cue.endMs - cue.startMs;
        if (totalDuration < 2) {
            setEditorError('Cue is too short to split.');
            return;
        }

        const leftText = text.slice(0, splitIndex).trim();
        const rightText = text.slice(splitIndex).trim();

        if (!leftText || !rightText) {
            setEditorError('Split position must leave text on both sides.');
            return;
        }

        const leftRatio = leftText.length / (leftText.length + rightText.length);
        const leftEnd = Math.min(
            cue.endMs - 1,
            cue.startMs + Math.max(1, Math.round(totalDuration * leftRatio)),
        );

        const leftCue = {
            ...cue,
            text: leftText,
            endMs: leftEnd,
        };

        const rightCue = {
            id: createCueId(),
            text: rightText,
            startMs: leftEnd,
            endMs: cue.endMs,
        };

        const nextCues = [
            ...editableCues.slice(0, cueIndex),
            leftCue,
            rightCue,
            ...editableCues.slice(cueIndex + 1),
        ];

        updateCues(nextCues);
        setSelectedCueIds(new Set([leftCue.id, rightCue.id]));
        setEditingCueId(null);
        setDraftText('');
        setEditorError(null);
    }, [createCueId, editableCues, updateCues]);

    const handleMergeSelected = useCallback(async () => {
        if (!isMergeable) {
            setEditorError('Select consecutive cues to merge.');
            return;
        }

        const firstIndex = selectedIndices[0];
        const lastIndex = selectedIndices[selectedIndices.length - 1];

        if (firstIndex === undefined || lastIndex === undefined) {
            return;
        }

        const mergedCues = editableCues.slice(firstIndex, lastIndex + 1);
        const mergedText = mergedCues.map((cue) => cue.text.trim()).filter(Boolean).join(' ');
        const mergedTranslation = mergeTranslation(mergedCues);
        const mergedVocabulary = mergeVocabulary(mergedCues);
        const mergedCue = {
            ...mergedCues[0]!,
            text: mergedText,
            translationVi: mergedTranslation,
            startMs: mergedCues[0]!.startMs,
            endMs: mergedCues[mergedCues.length - 1]!.endMs,
            vocabulary: mergedVocabulary,
            commonPhrases: [],
        };

        const nextCues = [
            ...editableCues.slice(0, firstIndex),
            mergedCue,
            ...editableCues.slice(lastIndex + 1),
        ];

        setEditorError(null);
        try {
            const savedCues = await onSaveCues(nextCues);
            setEditableCues(savedCues);
            setIsDirty(false);
            setSelectedCueIds(new Set([mergedCue.id]));
            setEditingCueId(null);
            setDraftText('');
        } catch {
            setEditorError('Unable to merge cues.');
        }
    }, [editableCues, isMergeable, onSaveCues, selectedIndices]);

    const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
            return;
        }

        const nextCues = [...editableCues];
        const [moved] = nextCues.splice(fromIndex, 1);
        if (!moved) {
            return;
        }

        nextCues.splice(toIndex, 0, moved);
        updateCues(nextCues);
    }, [editableCues, updateCues]);

    const handleResetEdits = useCallback(() => {
        setEditableCues(video.cues);
        setSelectedCueIds(new Set());
        setEditingCueId(null);
        setDraftText('');
        setIsDirty(false);
        setEditorError(null);
    }, [video.cues]);

    const handleSaveAll = useCallback(async () => {
        setEditorError(null);
        try {
            const savedCues = await onSaveCues(editableCues);
            setEditableCues(savedCues);
            setIsDirty(false);
        } catch {
            setEditorError('Unable to save cue edits.');
        }
    }, [editableCues, onSaveCues]);

    if (!currentCue) {
        return (
            <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>Video này chưa có câu luyện tập.</p>
            </div>
        );
    }

    return (
        <section ref={playerRootRef} className={styles.playerRoot}>
            <div className={styles.playerHeader}>
                <div className={styles.modeSection}>
                    <span className={styles.modeLabel}>Chế độ luyện</span>
                    <div className={styles.modeToggle}>
                    <button
                        className={`${styles.modeButton} ${mode === 'with-transcript' ? styles.modeButtonActive : ''}`.trim()}
                        type="button"
                        onClick={() => onModeChange('with-transcript')}
                        aria-label="Hiện transcript khi luyện"
                    >
                        Có transcript
                    </button>
                    <button
                        className={`${styles.modeButton} ${mode === 'without-transcript' ? styles.modeButtonActive : ''}`.trim()}
                        type="button"
                        onClick={() => onModeChange('without-transcript')}
                        aria-label="Ẩn transcript khi nghe"
                    >
                        Thử thách nghe
                    </button>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.cueProgress}>
                        <div className={styles.cueProgressMeta}>
                            <p className={styles.cueCounter}>{cueCounterLabel}</p>
                            <span>{cueProgressPercent}%</span>
                        </div>
                        <div className={styles.progressTrack}>
                            <span style={{ width: `${cueProgressPercent}%` }} />
                        </div>
                    </div>
                    <button
                        className={styles.fullscreenButton}
                        type="button"
                        onClick={() => void handleToggleFullscreen()}
                        aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
                    >
                        <span aria-hidden="true">{isFullscreen ? '↙' : '↗'}</span>
                        {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                    </button>
                </div>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.leftColumn}>
                    <div className={styles.playerFrame}>
                        <div id="yt-player-container" className={styles.youtubeMount} aria-label={`YouTube player: ${video.title}`} />
                        <div className={styles.playerInteractionBlocker} aria-hidden="true" />
                    </div>

                    <div className={styles.statusRow}>
                        <span className={styles.statusDot} aria-hidden="true" />
                        <span className={styles.statusText}>{STATE_LABELS[machine.state] ?? machine.state}</span>
                    </div>

                    {machine.state === 'result' && (
                        <div className={styles.statusActionRow}>
                            <button
                                className={styles.ghostButton + ' ' + styles.retryButton}
                                type="button"
                                onClick={handleRetry}
                                aria-label="Luyện lại câu hiện tại"
                            >
                                <img src={retryIcon} alt="" className={styles.buttonIcon} />
                                <span>Luyện lại</span>
                            </button>
                            <button
                                className={styles.ghostButton}
                                type="button"
                                onClick={handleNext}
                                aria-label="Chuyển đến câu tiếp theo"
                            >
                                <span>Câu tiếp theo →</span>
                            </button>
                        </div>
                    )}

                    {machine.state !== 'result' && machine.state !== 'done' && (
                        <div className={styles.controlsRow}>
                            {machine.state === 'idle' && (
                                <button className={styles.primaryButton} type="button" onClick={handlePlayCurrent} aria-label="Phát câu hiện tại">
                                    ▶ Nghe câu mẫu
                                </button>
                            )}

                            {machine.state === 'waiting' && (
                                <>
                                    <button className={styles.primaryButton} type="button" onClick={() => void handleStartRecording()} aria-label="Bắt đầu ghi âm">
                                        <img src={micIcon} alt="" className={styles.buttonIcon} />
                                        <span>Bắt đầu nói</span>
                                    </button>
                                    <button className={styles.ghostButton} type="button" onClick={handleRetry} aria-label="Nghe lại câu hiện tại">
                                        <img src={retryIcon} alt="" className={styles.buttonIcon} />
                                        <span>Nghe lại</span>
                                    </button>
                                </>
                            )}

                            {machine.state === 'recording' && (
                                <>
                                    <button className={styles.dangerButton} type="button" onClick={() => void handleStopRecording()} aria-label="Dừng ghi âm">
                                        ⏹ Hoàn tất
                                    </button>
                                    <span className={styles.timerText}>{formatRecordingTime(recordingSeconds)}</span>
                                </>
                            )}

                            {machine.state === 'scoring' && (
                                <p className={styles.statusText}>{isScoring ? 'Đang phân tích phát âm...' : 'Đang chuẩn bị kết quả...'}</p>
                            )}

                            {machine.state === 'playing' && (
                                <p className={styles.statusText}>Hãy nghe kỹ và ghi nhớ cách phát âm.</p>
                            )}
                        </div>
                    )}

                    <CueDisplay
                        cue={currentCue}
                        mode={mode}
                        state={machine.state}
                        pronunciationResult={machine.pronunciationResult}
                    />

                    {machine.state === 'done' && (
                        <div className={styles.donePanel}>
                            <p className={styles.doneText}>Bạn đã hoàn thành toàn bộ bài luyện.</p>
                            <button className={styles.primaryButton} type="button" onClick={handleRestart} aria-label="Luyện lại từ câu đầu tiên">
                                Luyện lại từ đầu
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
                        cues={editableCues}
                        activeCueIndex={machine.currentCueIndex}
                        mode={mode}
                        onCueClick={handleCueClick}
                        isEditable={isEditable}
                        selectedCueIds={selectedCueIds}
                        editingCueId={editingCueId}
                        draftText={draftText}
                        isDirty={isDirty}
                        isSaving={isSavingCues}
                        isMergeable={isMergeable}
                        editorError={editorError ?? saveError}
                        onToggleSelect={handleToggleSelect}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={handleCancelEdit}
                        onDraftChange={setDraftText}
                        onSaveEdit={handleSaveEdit}
                        onSplitCue={handleSplitCue}
                        onMergeSelected={handleMergeSelected}
                        onReorder={handleReorder}
                        onResetEdits={handleResetEdits}
                        onSaveAll={handleSaveAll}
                    />
                </div>
            </div>

            <div className={styles.playerReadyText}>
                <span className={ytPlayer.isReady ? styles.readyDot : styles.loadingDot} />
                {ytPlayer.isReady ? 'Trình phát đã sẵn sàng' : 'Đang tải trình phát...'}
                {isRecording ? ' · Đang ghi âm' : ''}
            </div>
        </section>
    );
};

export default ShadowingPlayer;
