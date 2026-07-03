import { useCallback, useState } from 'react';
import type { LearnerSpeakingContent } from './renderer.types';
import type { LearnerExerciseDto } from '../../types/learning.types';
import styles from './Renderer.module.css';

interface SpeakingRendererProps {
    content: LearnerSpeakingContent;
    /** Current speaking session ID (controlled by parent). */
    sessionId?: string | null;
    /** Called when the session state changes. */
    onSessionChange?: (sessionId: string | null) => void;
    /** Exercise DTO for submission config. */
    exercise?: LearnerExerciseDto;
}

const SpeakingRenderer = ({
    content,
    sessionId,
    onSessionChange,
}: SpeakingRendererProps) => {
    const [recording, setRecording] = useState(false);

    const handleStartRecording = useCallback(() => {
        // In production: request microphone, start recording via existing useAudioRecorder
        setRecording(true);
        // Simulate a session being created; actual implementation will get a real sessionId
        // from the server via startLesson or a dedicated session endpoint
        onSessionChange?.('speaking-session-pending');
    }, [onSessionChange]);

    const handleStopRecording = useCallback(() => {
        setRecording(false);
        // In production: finalize the session and get a real sessionId from the server
        onSessionChange?.('speaking-session-completed');
    }, [onSessionChange]);

    return (
        <div className={styles.renderer}>
            {/* Mission */}
            <div className={styles.mission}>
                <h3 className={styles.missionTitle}>{content.missionTitle}</h3>
                {content.missionDescription && (
                    <p className={styles.missionDesc}>{content.missionDescription}</p>
                )}
            </div>

            {/* Recording controls */}
            <div className={styles.recordingArea}>
                {!recording ? (
                    <button
                        type="button"
                        className={styles.recordButton}
                        onClick={handleStartRecording}
                        disabled={!!sessionId && sessionId !== 'speaking-session-pending'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <circle cx="12" cy="12" r="6" />
                        </svg>
                        {sessionId && sessionId !== 'speaking-session-pending'
                            ? 'Đã ghi âm'
                            : 'Bắt đầu ghi âm'}
                    </button>
                ) : (
                    <button
                        type="button"
                        className={styles.recordButtonStop}
                        onClick={handleStopRecording}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                        Dừng ghi âm
                    </button>
                )}

                {/* Session status */}
                {sessionId && sessionId === 'speaking-session-pending' && (
                    <p className={styles.recordingHint}>Đang ghi âm...</p>
                )}
                {sessionId && sessionId !== 'speaking-session-pending' && (
                    <p className={styles.recordingDone}>Đã hoàn thành ghi âm</p>
                )}
            </div>

            {/* Hints */}
            {content.hints && content.hints.length > 0 && (
                <div className={styles.hints}>
                    <h4 className={styles.hintsTitle}>Gợi ý</h4>
                    {content.hints.map((hint, i) => (
                        <div key={i} className={styles.hint}>
                            {hint.vi && <p className={styles.hintVi}>{hint.vi}</p>}
                            {hint.en && <p className={styles.hintEn}>{hint.en}</p>}
                            {hint.structure && (
                                <code className={styles.hintStructure}>{hint.structure}</code>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Privacy note */}
            <p className={styles.privacyNote}>
                Microphone access is required. Your recording will be sent to the server for evaluation.
            </p>
        </div>
    );
};

export default SpeakingRenderer;
