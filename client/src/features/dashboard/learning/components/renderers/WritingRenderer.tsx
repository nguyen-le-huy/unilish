import { useMemo } from 'react';
import type { LearnerWritingContent } from './renderer.types';
import type { LearnerExerciseDto } from '../../types/learning.types';
import styles from './Renderer.module.css';

interface WritingRendererProps {
    content: LearnerWritingContent;
    /** Current writing text (controlled by parent). */
    text: string;
    /** Called when the text changes. */
    onTextChange?: (text: string) => void;
    /** Exercise DTO for submission config. */
    exercise?: LearnerExerciseDto;
}

const WritingRenderer = ({ content, text, onTextChange }: WritingRendererProps) => {
    const wordCount = useMemo(() => {
        const trimmed = text.trim();
        return trimmed ? trimmed.split(/\s+/).length : 0;
    }, [text]);

    const isWithinRange =
        wordCount >= content.config.minWords && wordCount <= content.config.maxWords;

    return (
        <div className={styles.renderer}>
            {/* Prompt */}
            <div className={styles.writingPrompt}>
                <h3 className={styles.promptLabel}>Đề bài</h3>
                <p className={styles.promptText}>{content.prompt}</p>
                {content.promptTranslation && (
                    <p className={styles.promptTranslation}>{content.promptTranslation}</p>
                )}
            </div>

            {/* Config info */}
            <div className={styles.writingConfig}>
                <span className={styles.configTag}>{content.config.format}</span>
                <span className={styles.configTag}>{content.config.tone}</span>
                <span className={styles.configTag}>
                    {content.config.minWords}–{content.config.maxWords} từ
                </span>
            </div>

            {/* Sentence starters */}
            {content.sentenceStarters.length > 0 && (
                <div className={styles.sentenceStarters}>
                    <h4 className={styles.startersTitle}>Câu gợi ý</h4>
                    {content.sentenceStarters.map((starter, i) => (
                        <button
                            key={i}
                            type="button"
                            className={styles.starterChip}
                            onClick={() => onTextChange?.(text + starter + ' ')}
                        >
                            {starter}
                        </button>
                    ))}
                </div>
            )}

            {/* Editor */}
            <div className={styles.editorSection}>
                <textarea
                    className={styles.editor}
                    value={text}
                    onChange={(e) => onTextChange?.(e.target.value)}
                    placeholder="Viết câu trả lời của bạn..."
                    rows={10}
                    aria-label="Câu trả lời"
                />
                <div
                    className={`${styles.wordCount} ${!isWithinRange ? styles.wordCountWarning : ''}`}
                >
                    {wordCount} / {content.config.minWords}–{content.config.maxWords} từ
                </div>
            </div>
        </div>
    );
};

export default WritingRenderer;
