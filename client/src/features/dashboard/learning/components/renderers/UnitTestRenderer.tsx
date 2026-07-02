import type { LearnerUnitTestContent } from './renderer.types';
import styles from './Renderer.module.css';

interface UnitTestRendererProps {
    content: LearnerUnitTestContent;
}

const UnitTestRenderer = ({ content }: UnitTestRendererProps) => {
    return (
        <div className={styles.renderer}>
            <div className={styles.unitTestHeader}>
                <h3 className={styles.unitTestTitle}>Bài kiểm tra</h3>
                <p className={styles.unitTestCount}>
                    {content.questions.length} câu hỏi
                </p>
            </div>
            <p className={styles.unitTestNote}>
                Bài kiểm tra sẽ được triển khai trong bản cập nhật sau.
            </p>
        </div>
    );
};

export default UnitTestRenderer;
