import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearnerListeningContent } from './renderer.types';
import { getPlayableAudioSources } from './audio-url';
import styles from './Renderer.module.css';

interface ListeningRendererProps {
    content: LearnerListeningContent;
}

const ListeningRenderer = ({ content }: ListeningRendererProps) => {
    const audioSrc = getPlayableAudioSources(content.media.audioUrl)[0];
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const lineRefs = useRef(new Map<string, HTMLDivElement>());

    const syncTranscript = useCallback((currentTime: number) => {
        const activeLine = content.transcript.find(
            (line) => currentTime >= line.startTime && currentTime < line.endTime,
        );
        setActiveLineId((current) => current === activeLine?.id ? current : activeLine?.id ?? null);
    }, [content.transcript]);

    useEffect(() => {
        if (!activeLineId) return;
        lineRefs.current.get(activeLineId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [activeLineId]);

    return (
        <div className={styles.renderer}>
            {/* Audio player */}
            {audioSrc && (
                <div className={styles.mediaPlayerRow}>
                    <audio
                        src={audioSrc}
                        controls
                        className={styles.audioPlayer}
                        preload="metadata"
                        aria-label="Phát âm thanh bài nghe"
                        onTimeUpdate={(event) => syncTranscript(event.currentTarget.currentTime)}
                        onSeeked={(event) => syncTranscript(event.currentTarget.currentTime)}
                        onEnded={() => setActiveLineId(null)}
                    />
                    <span className={styles.accent}>{content.media.accent}</span>
                </div>
            )}

            {/* Transcript */}
            {content.transcript.length > 0 && (
                <div className={styles.transcript}>
                    <h3 className={styles.sectionTitle}>Transcript</h3>
                    {content.transcript.map((line) => {
                        const isActive = activeLineId === line.id;
                        return (
                        <div
                            key={line.id}
                            ref={(node) => {
                                if (node) lineRefs.current.set(line.id, node);
                                else lineRefs.current.delete(line.id);
                            }}
                            className={`${styles.transcriptLine} ${isActive ? styles.transcriptLineActive : ''}`}
                            aria-current={isActive ? 'true' : undefined}
                        >
                            <span className={styles.speaker}>{line.speaker}</span>
                            <span className={styles.transcriptText}>{line.text}</span>
                            {line.translation && (
                                <span className={styles.transcriptTranslation}>
                                    {line.translation}
                                </span>
                            )}
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Interactive config info */}
            <div className={styles.interactiveInfo}>
                <p className={styles.interactiveMode}>
                    Chế độ: {content.interactiveConfig.mode === 'GAP_FILL' ? 'Điền vào chỗ trống' : 'Shadowing'}
                </p>
            </div>
        </div>
    );
};

export default ListeningRenderer;
