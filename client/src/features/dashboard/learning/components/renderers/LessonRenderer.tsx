import type { LearnerLessonDto } from '../../types/learning.types';
import type { LearnerContent } from './renderer.types';
import VocabRenderer from './VocabRenderer';
import GrammarRenderer from './GrammarRenderer';
import ReadingRenderer from './ReadingRenderer';
import ListeningRenderer from './ListeningRenderer';
import SpeakingRenderer from './SpeakingRenderer';
import WritingRenderer from './WritingRenderer';
import UnitTestRenderer from './UnitTestRenderer';
import styles from './Renderer.module.css';

interface LessonRendererProps {
    lesson: LearnerLessonDto;
}

const LessonRenderer = ({ lesson }: LessonRendererProps) => {
    const content = lesson.lesson.content as LearnerContent | null;

    if (!content) {
        return (
            <div className={styles.unsupported}>
                <p>Nội dung bài học không khả dụng.</p>
            </div>
        );
    }

    switch (content.type) {
        case 'VOCAB':
            return (
                <div className={styles.lessonContent}>
                    <VocabRenderer content={content} />
                </div>
            );

        case 'GRAMMAR':
            return (
                <div className={styles.lessonContent}>
                    <GrammarRenderer content={content} />
                </div>
            );

        case 'READING':
            return (
                <div className={styles.lessonContent}>
                    <ReadingRenderer content={content} />
                </div>
            );

        case 'LISTENING':
            return (
                <div className={styles.lessonContent}>
                    <ListeningRenderer content={content} />
                </div>
            );

        case 'SPEAKING':
            return (
                <div className={styles.lessonContent}>
                    <SpeakingRenderer content={content} />
                </div>
            );

        case 'WRITING':
            return (
                <div className={styles.lessonContent}>
                    <WritingRenderer content={content} />
                </div>
            );

        case 'UNIT_TEST':
            return (
                <div className={styles.lessonContent}>
                    <UnitTestRenderer content={content} />
                </div>
            );

        default:
            return (
                <div className={styles.unsupported}>
                    <p>Loại bài học này chưa được hỗ trợ.</p>
                </div>
            );
    }
};

export default LessonRenderer;
