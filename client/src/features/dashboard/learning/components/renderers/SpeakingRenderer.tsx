import { useState } from 'react';
import type { LearnerSpeakingContent } from './renderer.types';
import styles from './Renderer.module.css';

interface SpeakingRendererProps {
    content: LearnerSpeakingContent;
}

const SpeakingRenderer = ({ content }: SpeakingRendererProps) => {
    const [recording, setRecording] = useState(false);

    const handleStartRecording = () => {
        // In production: request microphone, start recording via existing useAudioRecorder
        setRecording(true);
    };

    const handleStopRecording = () => {
        setRecording(false);
    };

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
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <circle cx="12" cy="12" r="6" />
                        </svg>
                        Bắt đầu ghi âm
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
