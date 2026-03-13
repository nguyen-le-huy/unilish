import { useState } from 'react';
import styles from './ListeningReading.module.css';
import { Button } from '@/components/core/Button';
import { LeftPanel } from '../../components/listening-reading/left-panel';
import { RightPanel } from '../../components/listening-reading/right-panel';
import type { PartInfo, ToeicPart, ToeicQuestion, ToeicQuestionGroup } from '../../components/listening-reading/types';
import { PART1_MOCK_QUESTIONS } from '../../mock/part1.mock';
import { PART2_MOCK_QUESTIONS } from '../../mock/part2.mock';
import { PART3_MOCK_GROUPS } from '../../mock/part3.mock';
import { PART4_MOCK_GROUPS } from '../../mock/part4.mock';
import { PART5_MOCK_QUESTIONS } from '../../mock/part5.mock';
import { PART6_MOCK_GROUPS } from '../../mock/part6.mock';
import { PART7_MOCK_GROUPS } from '../../mock/part7.mock';

const PART_QUESTIONS: Partial<Record<ToeicPart, ToeicQuestion[]>> = {
    1: PART1_MOCK_QUESTIONS,
    2: PART2_MOCK_QUESTIONS,
    5: PART5_MOCK_QUESTIONS,
};

const PART_GROUPS: Partial<Record<ToeicPart, ToeicQuestionGroup[]>> = {
    3: PART3_MOCK_GROUPS,
    4: PART4_MOCK_GROUPS,
    6: PART6_MOCK_GROUPS,
    7: PART7_MOCK_GROUPS,
};

const NEXT_PART: Partial<Record<ToeicPart, ToeicPart>> = {
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 7,
};

const PARTS: PartInfo[] = [
    { part: 1, label: 'Part 1', questionCount: 6 },
    { part: 2, label: 'Part 2', questionCount: 25 },
    { part: 3, label: 'Part 3', questionCount: 39 },
    { part: 4, label: 'Part 4', questionCount: 30 },
    { part: 5, label: 'Part 5', questionCount: 30 },
    { part: 6, label: 'Part 6', questionCount: 16 },
    { part: 7, label: 'Part 7', questionCount: 54 },
];

const ListeningReading = () => {
    const [activePart, setActivePart] = useState<ToeicPart>(1);

    const questions = PART_QUESTIONS[activePart] ?? [];
    const questionGroups = PART_GROUPS[activePart] ?? [];
    const nextPart = NEXT_PART[activePart];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h3 className={styles.title}>Bài thi đầu vào  - Phần Kỹ Năng Nghe & Đọc</h3>
                <Button
                    type="button"
                    padding="B"
                    variant="outline"
                >
                    Thoát
                </Button>
            </header>
            <div className={styles.main}>
                <LeftPanel
                    activePart={activePart}
                    questions={questions}
                    questionGroups={questionGroups}
                    nextPart={nextPart}
                    onPartSelect={setActivePart}
                />
                <RightPanel parts={PARTS} />
            </div>
        </div>
    );
};

export default ListeningReading;