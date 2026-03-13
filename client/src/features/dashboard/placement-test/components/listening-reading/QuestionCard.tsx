import flagIcon from '@/assets/icons/solar_flag.svg';
import styles from './QuestionCard.module.css';
import type { AnswerOption, ToeicQuestion } from './types';

const ALL_OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D'];

interface Props {
    question: ToeicQuestion;
    onAnswer: (questionId: string, answer: AnswerOption) => void;
    onFlag: (questionId: string) => void;
    layout?: 'default' | 'part5' | 'grouped';
    divider?: boolean;
}

export const QuestionCard = ({ question, onAnswer, onFlag, layout = 'default', divider = true }: Props) => {
    const options = ALL_OPTIONS.slice(0, question.optionCount ?? 4);
    const hasImage = !!question.imageUrl;
    const questionText = question.questionText ?? '';
    const isPart5 = layout === 'part5';
    const isGrouped = layout === 'grouped';

    return (
        <div className={`${styles.card} ${!hasImage ? styles.cardNoImage : ''} ${isPart5 ? styles.cardPart5 : ''} ${isGrouped ? styles.cardGrouped : ''} ${!divider ? styles.cardNoDivider : ''}`}>
            {/* Image — only for Part 1 */}
            {hasImage && (
                <div className={styles.imageWrapper}>
                    <img
                        src={question.imageUrl}
                        alt={`Question ${question.questionNumber} image`}
                        className={styles.image}
                        draggable={false}
                    />
                </div>
            )}

            {/* Content */}
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.questionLabel}>
                        Question {question.questionNumber}
                    </span>
                    <button
                        type="button"
                        className={`${styles.flagBtn} ${question.flagged ? styles.flagged : ''}`}
                        aria-label={question.flagged ? 'Unflag question' : 'Flag question'}
                        aria-pressed={question.flagged}
                        onClick={() => onFlag(question.id)}
                    >
                        <img src={flagIcon} width={20} height={20} alt="" aria-hidden="true" className={styles.flagIcon} />
                    </button>
                </div>
                {questionText && <p className={`${styles.questionText} ${isPart5 ? styles.questionTextPart5 : ''} ${isGrouped ? styles.questionTextGrouped : ''}`}>{questionText}</p>}

                <div className={styles.options} role="radiogroup" aria-label={`Options for question ${question.questionNumber}`}>
                    {options.map((opt, idx) => {
                        const isSelected = question.selectedAnswer === opt;
                        const optionText = question.optionsText?.[idx];
                        return (
                            <label
                                key={opt}
                                className={`${styles.optionRow} ${isSelected ? styles.optionSelected : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={opt}
                                    checked={isSelected}
                                    onChange={() => onAnswer(question.id, opt)}
                                    className={styles.radioInput}
                                    aria-label={`Option ${opt}`}
                                />
                                <span className={`${styles.radioCircle} ${isSelected ? styles.radioCircleSelected : ''}`} aria-hidden="true" />
                                <span className={styles.optionLabel}>{optionText ? `${opt}. ${optionText}` : `${opt}.`}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
