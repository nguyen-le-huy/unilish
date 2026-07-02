import { useState } from 'react';
import type { LearnerReadingContent } from './renderer.types';
import styles from './Renderer.module.css';

interface ReadingRendererProps {
    content: LearnerReadingContent;
}

const ReadingRenderer = ({ content }: ReadingRendererProps) => {
    const [showTranslation, setShowTranslation] = useState(false);
    const [showGlossary, setShowGlossary] = useState(false);

    return (
        <div className={styles.renderer}>
            {/* Audio */}
            {content.media.audioUrl && (
                <div className={styles.audioRow}>
                    <audio
                        src={content.media.audioUrl}
                        controls
                        className={styles.audioPlayer}
                        preload="none"
                        aria-label="Phát âm bài đọc"
                    />
                </div>
            )}

            {/* Text */}
            <div
                className={styles.readingText}
                dangerouslySetInnerHTML={{ __html: content.text }}
            />

            {/* Translation toggle */}
            {content.translation && (
                <div className={styles.toggleSection}>
                    <button
                        type="button"
                        className={styles.toggleButton}
                        onClick={() => setShowTranslation((v) => !v)}
                        aria-expanded={showTranslation}
                    >
                        {showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}
                    </button>
                    {showTranslation && (
                        <div className={styles.translation}>
                            {content.translation}
                        </div>
                    )}
                </div>
            )}

            {/* Glossary toggle */}
            {Object.keys(content.glossary).length > 0 && (
                <div className={styles.toggleSection}>
                    <button
                        type="button"
                        className={styles.toggleButton}
                        onClick={() => setShowGlossary((v) => !v)}
                        aria-expanded={showGlossary}
                    >
                        {showGlossary ? 'Ẩn từ vựng' : 'Hiện từ vựng'}
                    </button>
                    {showGlossary && (
                        <div className={styles.glossary}>
                            {Object.entries(content.glossary).map(([key, item]) => (
                                <div key={key} className={styles.glossaryItem}>
                                    <span className={styles.glossaryWord}>{item.word}</span>
                                    <span className={styles.glossaryIpa}>{item.ipa}</span>
                                    <span className={styles.glossaryDef}>{item.definition}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReadingRenderer;
