import type { LearnerListeningContent } from './renderer.types';
import styles from './Renderer.module.css';

interface ListeningRendererProps {
    content: LearnerListeningContent;
}

const ListeningRenderer = ({ content }: ListeningRendererProps) => {
    return (
        <div className={styles.renderer}>
            {/* Audio player */}
            {content.media.audioUrl && (
                <div className={styles.audioRow}>
                    <audio
                        src={content.media.audioUrl}
                        controls
                        className={styles.audioPlayer}
                        preload="metadata"
                        aria-label="Phát âm thanh bài nghe"
                    />
                    <span className={styles.accent}>{content.media.accent}</span>
                </div>
            )}

            {/* Transcript */}
            {content.transcript.length > 0 && (
                <div className={styles.transcript}>
                    <h3 className={styles.sectionTitle}>Transcript</h3>
                    {content.transcript.map((line) => (
                        <div key={line.id} className={styles.transcriptLine}>
                            <span className={styles.speaker}>{line.speaker}</span>
                            <span className={styles.transcriptText}>{line.text}</span>
                            {line.translation && (
                                <span className={styles.transcriptTranslation}>
                                    {line.translation}
                                </span>
                            )}
                        </div>
                    ))}
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
