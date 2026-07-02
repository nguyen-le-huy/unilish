import type { LearnerMatchingQuestion } from './practice.types';
import styles from './Practice.module.css';

interface MatchingProps {
    question: LearnerMatchingQuestion;
    selections: Record<string, string>;
    onSelect: (itemId: string, targetId: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
}

const Matching = ({ question, selections, onSelect, feedback }: MatchingProps) => {
    return (
        <div className={styles.practiceQuestion}>
            {question.stem.text && <p className={styles.stem}>{question.stem.text}</p>}
            <div className={styles.matchingGrid}>
                <div className={styles.matchingColumn}>
                    {question.items.map((item) => (
                        <div key={item.id} className={styles.matchingItem}>
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>
                <div className={styles.matchingColumn}>
                    {question.targets.map((target) => (
                        <button
                            key={target.id}
                            type="button"
                            className={`${styles.matchingTarget} ${selections[target.id] ? styles.matchingTargetSelected : ''}`}
                            onClick={() => {
                                const itemId = question.items.find((i) => !Object.values(selections).includes(i.id))?.id;
                                if (itemId && !feedback) onSelect(itemId, target.id);
                            }}
                            disabled={!!feedback}
                        >
                            {target.text}
                        </button>
                    ))}
                </div>
            </div>
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default Matching;
