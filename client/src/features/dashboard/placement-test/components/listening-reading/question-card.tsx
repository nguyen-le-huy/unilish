import flagIcon from '@/assets/icons/solar_flag.svg';
import styles from './question-card.module.css';
import type { AnswerOption, ToeicQuestion } from './types';

const ALL_OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D'];

interface Props {
    question: ToeicQuestion;
    onAnswer: (questionId: string, answer: AnswerOption) => void;
    onFlag: (questionId: string) => void;
    layout?: 'default' | 'part5' | 'grouped';
    divider?: boolean;
    hideImage?: boolean;
}

export const QuestionCard = ({ question, onAnswer, onFlag, layout = 'default', divider = true, hideImage = false }: Props) => {
    const options = ALL_OPTIONS.slice(0, question.optionCount ?? 4);
    const images = question.imageUrls && question.imageUrls.length > 0
        ? question.imageUrls
        : (question.imageUrl ? [question.imageUrl] : []);
    const hasImage = !hideImage && images.length > 0;
    const hasMultipleImages = images.length > 1;
    const rawQuestionText = question.questionText?.trim() ?? '';
    const isPlaceholderQuestionText = /^part\s*\d+\s*question\s*\d+$/i.test(rawQuestionText)
        || /^question\s*\d+$/i.test(rawQuestionText);
    const questionText = isPlaceholderQuestionText ? '' : rawQuestionText;
    const isPart5 = layout === 'part5';
    const isGrouped = layout === 'grouped';

    const getOptionLabel = (opt: AnswerOption, optionText?: string): string => {
        const text = optionText?.trim();
        if (!text) {
            return `${opt}.`;
        }

        const normalized = text.toUpperCase();
        if (normalized === opt) {
            return `${opt}.`;
        }

        if (normalized.startsWith(`${opt}.`) || normalized.startsWith(`${opt})`)) {
            return text;
        }

        return `${opt}. ${text}`;
    };

    return (
        <div className={`${styles.card} ${!hasImage ? styles.cardNoImage : ''} ${isPart5 ? styles.cardPart5 : ''} ${isGrouped ? styles.cardGrouped : ''} ${!divider ? styles.cardNoDivider : ''}`}>
            {/* Image — only for Part 1 */}
            {hasImage && (
                <div className={`${styles.imageWrapper} ${hasMultipleImages ? styles.imageStack : ''}`}>
                    {images.map((imageUrl, idx) => (
                        <img
                            key={`${question.id}-image-${idx}`}
                            src={imageUrl}
                            alt={`Question ${question.questionNumber} image ${idx + 1}`}
                            className={styles.image}
                            draggable={false}
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.questionLabel}>
                        Câu {question.questionNumber}
                    </span>
                    <button
                        type="button"
                        className={`${styles.flagBtn} ${question.flagged ? styles.flagged : ''}`}
                    aria-label={question.flagged ? 'Bỏ đánh dấu câu hỏi' : 'Đánh dấu câu hỏi'}
                        aria-pressed={question.flagged}
                        onClick={() => onFlag(question.id)}
                    >
                        <img src={flagIcon} width={20} height={20} alt="" aria-hidden="true" className={styles.flagIcon} />
                    </button>
                </div>
                {questionText && <p className={`${styles.questionText} ${isPart5 ? styles.questionTextPart5 : ''} ${isGrouped ? styles.questionTextGrouped : ''}`}>{questionText}</p>}

                <div className={styles.options} role="radiogroup" aria-label={`Đáp án cho câu ${question.questionNumber}`}>
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
                                <span className={styles.optionLabel}>{getOptionLabel(opt, optionText)}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
