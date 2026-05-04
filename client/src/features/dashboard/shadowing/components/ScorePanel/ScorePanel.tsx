import styles from './ScorePanel.module.css';
import type { PronunciationResult, PronunciationWordResult } from '../../types/shadowing.types';

interface Props {
    result: PronunciationResult;
    onRetry: () => void;
    onNext: () => void;
}

const getScoreColorClass = (score: number): string => {
    if (score >= 80) {
        return styles.scoreGood;
    }

    if (score >= 60) {
        return styles.scoreMedium;
    }

    return styles.scoreLow;
};

const getWordClassName = (word: PronunciationWordResult): string => {
    const colorClass = getScoreColorClass(word.accuracyScore);
    const omissionClass = word.errorType === 'Omission' ? styles.wordOmission : '';
    return `${styles.wordItem} ${colorClass} ${omissionClass}`.trim();
};

const ScorePanel = ({ result, onRetry, onNext }: Props) => {
    const scoreColorClass = getScoreColorClass(result.overallScore);

    return (
        <section className={styles.panelContainer} aria-label="Pronunciation score panel">
            <div className={styles.overallBlock}>
                <div className={`${styles.scoreRing} ${scoreColorClass}`}>
                    <span className={styles.scoreValue}>{Math.round(result.overallScore)}</span>
                </div>
                <p className={styles.scoreLabel}>Overall Score</p>
            </div>

            <div className={styles.wordsBlock}>
                {result.words.map((word, index) => (
                    <div key={`${word.word}-${index}`} className={getWordClassName(word)}>
                        <span className={styles.wordText}>{word.word}</span>
                        <span className={styles.wordScore}>{Math.round(word.accuracyScore)}</span>
                    </div>
                ))}
            </div>

            <div className={styles.actionRow}>
                <button className={styles.retryButton} onClick={onRetry} aria-label="Retry current cue">
                    Retry
                </button>
                <button className={styles.nextButton} onClick={onNext} aria-label="Go to next cue">
                    Next
                </button>
            </div>
        </section>
    );
};

export default ScorePanel;
