export type ToeicPart = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PartInfo {
    part: ToeicPart;
    label: string;
    questionCount: number;
}

export type AnswerOption = 'A' | 'B' | 'C' | 'D';

export interface ToeicQuestion {
    id: string;
    questionNumber: number;
    imageUrl?: string;
    optionCount?: 3 | 4;
    questionText?: string;
    optionsText?: string[];
    selectedAnswer?: AnswerOption;
    flagged?: boolean;
}

export interface ToeicQuestionGroup {
    id: string;
    imageUrl?: string;
    imageUrls?: string[];
    questions: ToeicQuestion[];
}

/** @deprecated use ToeicQuestion */
export type Part1Question = ToeicQuestion;
