import type { ToeicQuestion } from '../components/listening-reading/types';

export const PART2_MOCK_QUESTIONS: ToeicQuestion[] = Array.from({ length: 25 }, (_, i) => ({
    id: `p2-q${i + 1}`,
    questionNumber: i + 7, // Part 2 starts at Q7 in full TOEIC
    optionCount: 3,
}));
