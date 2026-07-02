import { useState, useCallback, useEffect, useRef } from 'react';
import type { LearnerPracticeQuestion } from './practice.types';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import Matching from './Matching';
import TrueFalse from './TrueFalse';
import ErrorCorrection from './ErrorCorrection';
import styles from './Practice.module.css';

interface PracticeAreaProps {
    questions: LearnerPracticeQuestion[];
    onCheckpointChange: (checkpoint: Record<string, unknown>) => void;
}

const PracticeArea = ({ questions, onCheckpointChange }: PracticeAreaProps) => {
    const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
    const answersRef = useRef(answers);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    useEffect(() => {
        onCheckpointChange(answersRef.current);
    }, [answers, onCheckpointChange]);

    const recordAnswer = useCallback((questionId: string, response: Record<string, unknown>) => {
        setAnswers((prev) => ({ ...prev, [questionId]: response }));
    }, []);

    const handleMCSelect = useCallback((questionId: string, optionId: string) => {
        recordAnswer(questionId, { selectedOptionId: optionId });
    }, [recordAnswer]);

    const handleFillChange = useCallback((questionId: string, value: string) => {
        recordAnswer(questionId, { text: value });
    }, [recordAnswer]);

    const handleTFChange = useCallback((questionId: string, value: boolean) => {
        recordAnswer(questionId, { value });
    }, [recordAnswer]);

    const handleMatchSelect = useCallback((questionId: string, itemId: string, targetId: string) => {
        recordAnswer(questionId, { itemId, targetId });
    }, [recordAnswer]);

    const renderQuestion = (question: LearnerPracticeQuestion) => {
        switch (question.type) {
            case 'MULTIPLE_CHOICE':
                return (
                    <MultipleChoice
                        question={question}
                        selectedId={(answers[question._id] as { selectedOptionId?: string })?.selectedOptionId ?? null}
                        onSelect={(id) => handleMCSelect(question._id, id)}
                        feedback={null}
                    />
                );

            case 'FILL_IN_BLANK':
                return (
                    <FillInBlank
                        question={question}
                        value={(answers[question._id] as { text?: string })?.text ?? ''}
                        onChange={(v) => handleFillChange(question._id, v)}
                        feedback={null}
                    />
                );

            case 'MATCHING':
                return (
                    <Matching
                        question={question}
                        selections={(answers[question._id] as Record<string, string>) ?? {}}
                        onSelect={(itemId, targetId) => handleMatchSelect(question._id, itemId, targetId)}
                        feedback={null}
                    />
                );

            case 'TRUE_FALSE':
                return (
                    <TrueFalse
                        question={question}
                        value={(answers[question._id] as { value?: boolean })?.value ?? null}
                        onChange={(v) => handleTFChange(question._id, v)}
                        feedback={null}
                    />
                );

            case 'ERROR_CORRECTION':
                return (
                    <ErrorCorrection
                        question={question}
                        value={(answers[question._id] as { text?: string })?.text ?? ''}
                        onChange={(v) => handleFillChange(question._id, v)}
                        feedback={null}
                    />
                );

            default:
                return (
                    <div className={styles.practiceQuestion}>
                        <p className={styles.stem}>Loại câu hỏi chưa được hỗ trợ</p>
                    </div>
                );
        }
    };

    if (questions.length === 0) {
        return null;
    }

    return (
        <div className={styles.practiceArea}>
            <h3 className={styles.practiceTitle}>Luyện tập</h3>
            {questions.map((question) => (
                <div key={question._id}>
                    {renderQuestion(question)}
                </div>
            ))}
        </div>
    );
};

export default PracticeArea;
