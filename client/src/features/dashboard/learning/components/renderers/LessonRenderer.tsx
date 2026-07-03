import type { LearnerLessonDto } from '../../types/learning.types';
import type { LearnerContent } from './renderer.types';
import { adaptLessonToProps } from './renderer.types';
import type { PracticeAnswer, LearnerPracticeQuestion } from './practice/practice.types';
import VocabRenderer from './VocabRenderer';
import GrammarRenderer from './GrammarRenderer';
import ReadingRenderer from './ReadingRenderer';
import ListeningRenderer from './ListeningRenderer';
import SpeakingRenderer from './SpeakingRenderer';
import WritingRenderer from './WritingRenderer';
import UnitTestRenderer from './UnitTestRenderer';
import PracticeArea from './practice/PracticeArea';
import styles from './Renderer.module.css';

interface LessonRendererProps {
    lesson: LearnerLessonDto;
    exerciseAnswers?: ReadonlyMap<string, PracticeAnswer>;
    onExerciseAnswerChange?: (questionId: string, answer: PracticeAnswer) => void;
    onRemoveMatchingPair?: (questionId: string, itemId: string) => void;
    showExerciseFeedback?: boolean;
    exerciseFeedback?: ReadonlyMap<string, { correct: boolean; explanation?: string }>;
    focusedQuestionId?: string | null;
    exerciseAnsweredCount?: number;
    exerciseTotalQuestions?: number;
    /** Current question index for single-question mode. Undefined = show all. */
    currentQuestionIndex?: number;
    /** Called when learner wants to proceed to next question. */
    onNextQuestion?: () => void;
    /** Whether current question answer is complete. */
    isCurrentComplete?: boolean;
    writingText?: string;
    onWritingTextChange?: (text: string) => void;
    speakingSessionId?: string | null;
    onSpeakingSessionChange?: (sessionId: string | null) => void;
}

const LessonRenderer = ({
    lesson,
    exerciseAnswers,
    onExerciseAnswerChange,
    onRemoveMatchingPair,
    showExerciseFeedback = false,
    exerciseFeedback,
    focusedQuestionId,
    exerciseAnsweredCount,
    exerciseTotalQuestions,
    currentQuestionIndex,
    onNextQuestion,
    isCurrentComplete,
    writingText,
    onWritingTextChange,
    speakingSessionId,
    onSpeakingSessionChange,
}: LessonRendererProps) => {
    const { content, exercise } = adaptLessonToProps(lesson);

    const renderContent = (contentData: LearnerContent | null) => {
        if (!contentData) return null;

        switch (contentData.type) {
            case 'VOCAB':
                return <VocabRenderer content={contentData} />;
            case 'GRAMMAR':
                return <GrammarRenderer content={contentData} />;
            case 'READING':
                return <ReadingRenderer content={contentData} />;
            case 'LISTENING':
                return <ListeningRenderer content={contentData} />;
            case 'SPEAKING':
                return (
                    <SpeakingRenderer
                        content={contentData}
                        sessionId={speakingSessionId}
                        onSessionChange={onSpeakingSessionChange}
                        exercise={lesson.lesson.exercise}
                    />
                );
            case 'WRITING':
                return (
                    <WritingRenderer
                        content={contentData}
                        text={writingText ?? ''}
                        onTextChange={onWritingTextChange}
                        exercise={lesson.lesson.exercise}
                    />
                );
            case 'UNIT_TEST':
                return <UnitTestRenderer content={contentData} />;
            default:
                return null;
        }
    };

    if (!content && !exercise) {
        return (
            <div className={styles.unsupported}>
                <p>Nội dung bài học không khả dụng.</p>
            </div>
        );
    }

    return (
        <div className={styles.lessonContent}>
            {/* Learning content */}
            {content && renderContent(content)}

            {/* Unavailable exercise state */}
            {exercise?.state === 'UNAVAILABLE' && (
                <div className={styles.unsupported}>
                    <p>Phần luyện tập của bài học này hiện không khả dụng.</p>
                    <p className={styles.unsupportedHint}>
                        Nội dung bài học có thể chưa được cập nhật.
                    </p>
                </div>
            )}

            {/* Unsupported exercise state */}
            {exercise?.state === 'UNSUPPORTED' && (
                <div className={styles.unsupported}>
                    <p>Loại bài luyện tập này chưa được hỗ trợ.</p>
                    <p className={styles.unsupportedHint}>
                        Vui lòng quay lại sau.
                    </p>
                </div>
            )}

            {/* PracticeArea for OBJECTIVE exercises */}
            {exercise?.state === 'AVAILABLE' &&
                exercise.kind === 'OBJECTIVE' &&
                exercise.questions &&
                exerciseAnswers !== undefined &&
                onExerciseAnswerChange && (
                    <div className={styles.practiceSection}>
                        <PracticeArea
                            questions={exercise.questions as LearnerPracticeQuestion[]}
                            answers={exerciseAnswers}
                            onAnswerChange={onExerciseAnswerChange}
                            onRemoveMatchingPair={onRemoveMatchingPair}
                            showFeedback={showExerciseFeedback}
                            feedback={exerciseFeedback}
                            focusedQuestionId={focusedQuestionId}
                            answeredCount={exerciseAnsweredCount}
                            totalQuestions={exerciseTotalQuestions}
                            currentQuestionIndex={currentQuestionIndex}
                            onNext={onNextQuestion}
                            isCurrentComplete={isCurrentComplete}
                        />
                    </div>
                )}
        </div>
    );
};

export default LessonRenderer;
