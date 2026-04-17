import type {
    ExamFormat,
    ExamScoringFw,
    ExamTestStatus,
    IExamBandThreshold,
    IExamModule,
} from '../types';

const deepClone = <T,>(value: T): T => {
    return JSON.parse(JSON.stringify(value)) as T;
};

export const EXAM_FORMAT_LABELS: Record<ExamFormat | 'all', string> = {
    all: 'Tất cả',
    toeic_lr: 'TOEIC L&R',
    ielts: 'IELTS',
};

export const EXAM_STATUS_LABELS: Record<ExamTestStatus, string> = {
    draft: 'Nháp',
    active: 'Đang hoạt động',
    paused: 'Tạm dừng',
    archived: 'Đã lưu trữ',
};

export const EXAM_FORMAT_BADGE_CLASSES: Record<ExamFormat, string> = {
    toeic_lr: 'bg-amber-100 text-amber-800 border-amber-200',
    ielts: 'bg-purple-100 text-purple-800 border-purple-200',
};

export const EXAM_STATUS_BADGE_CLASSES: Record<ExamTestStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    archived: 'bg-red-100 text-red-700 border-red-200',
};

export const DEFAULT_EXAM_MODULES: Record<ExamFormat, IExamModule[]> = {
    toeic_lr: [
        {
            type: 'listening',
            name: 'Listening',
            timeLimitMinutes: 45,
            parts: [
                {
                    part: 1,
                    name: 'Part 1 — Photographs',
                    questionsCount: 6,
                    poolTag: 'toeic-listening-part1',
                },
                {
                    part: 2,
                    name: 'Part 2 — Q-Response',
                    questionsCount: 25,
                    poolTag: 'toeic-listening-part2',
                },
                {
                    part: 3,
                    name: 'Part 3 — Conversations',
                    questionsCount: 39,
                    poolTag: 'toeic-listening-part3',
                },
                {
                    part: 4,
                    name: 'Part 4 — Short Talks',
                    questionsCount: 30,
                    poolTag: 'toeic-listening-part4',
                },
            ],
        },
        {
            type: 'reading',
            name: 'Reading',
            timeLimitMinutes: 75,
            parts: [
                {
                    part: 5,
                    name: 'Part 5 — Incomplete Sentences',
                    questionsCount: 30,
                    poolTag: 'toeic-reading-part5',
                },
                {
                    part: 6,
                    name: 'Part 6 — Text Completion',
                    questionsCount: 16,
                    poolTag: 'toeic-reading-part6',
                },
                {
                    part: 7,
                    name: 'Part 7 — Comprehension',
                    questionsCount: 54,
                    poolTag: 'toeic-reading-part7',
                },
            ],
        },
    ],
    ielts: [
        {
            type: 'listening',
            name: 'Listening',
            timeLimitMinutes: 30,
            parts: [
                {
                    part: 1,
                    name: 'Section 1',
                    questionsCount: 10,
                    poolTag: 'ielts-listening-section1',
                },
                {
                    part: 2,
                    name: 'Section 2',
                    questionsCount: 10,
                    poolTag: 'ielts-listening-section2',
                },
                {
                    part: 3,
                    name: 'Section 3',
                    questionsCount: 10,
                    poolTag: 'ielts-listening-section3',
                },
                {
                    part: 4,
                    name: 'Section 4',
                    questionsCount: 10,
                    poolTag: 'ielts-listening-section4',
                },
            ],
        },
        {
            type: 'reading',
            name: 'Reading',
            timeLimitMinutes: 60,
            parts: [
                {
                    part: 1,
                    name: 'Passage 1',
                    questionsCount: 14,
                    poolTag: 'ielts-reading-passage1',
                },
                {
                    part: 2,
                    name: 'Passage 2',
                    questionsCount: 13,
                    poolTag: 'ielts-reading-passage2',
                },
                {
                    part: 3,
                    name: 'Passage 3',
                    questionsCount: 13,
                    poolTag: 'ielts-reading-passage3',
                },
            ],
        },
        {
            type: 'writing',
            name: 'Writing',
            timeLimitMinutes: 60,
            tasks: [
                { task: 1, minWords: 150, topics: [] },
                { task: 2, minWords: 250, topics: [] },
            ],
        },
        {
            type: 'speaking',
            name: 'Speaking',
            part1Topics: [],
            part2CueCards: [],
            part3Topics: [],
        },
    ],
};

export const DEFAULT_TOEIC_BANDS: IExamBandThreshold[] = [
    { band: '10–250', minScore: 0, maxScore: 0.25 },
    { band: '255–400', minScore: 0.25, maxScore: 0.4 },
    { band: '405–600', minScore: 0.4, maxScore: 0.6 },
    { band: '605–780', minScore: 0.6, maxScore: 0.79 },
    { band: '785–900', minScore: 0.79, maxScore: 0.91 },
    { band: '905–990', minScore: 0.91, maxScore: 1 },
];

export const DEFAULT_IELTS_BANDS: IExamBandThreshold[] = [
    { band: 'Band 1–3', minScore: 0, maxScore: 0.35 },
    { band: 'Band 4', minScore: 0.35, maxScore: 0.45 },
    { band: 'Band 4.5', minScore: 0.45, maxScore: 0.5 },
    { band: 'Band 5', minScore: 0.5, maxScore: 0.55 },
    { band: 'Band 5.5', minScore: 0.55, maxScore: 0.6 },
    { band: 'Band 6', minScore: 0.6, maxScore: 0.65 },
    { band: 'Band 6.5', minScore: 0.65, maxScore: 0.7 },
    { band: 'Band 7', minScore: 0.7, maxScore: 0.78 },
    { band: 'Band 7.5+', minScore: 0.78, maxScore: 1 },
];

export const getDefaultScoringFramework = (format: ExamFormat): ExamScoringFw => {
    return format === 'toeic_lr' ? 'toeic_score' : 'ielts_band';
};

export const createDefaultExamModules = (format: ExamFormat): IExamModule[] => {
    return deepClone(DEFAULT_EXAM_MODULES[format]);
};

export const createDefaultBandThresholds = (format: ExamFormat): IExamBandThreshold[] => {
    return deepClone(format === 'toeic_lr' ? DEFAULT_TOEIC_BANDS : DEFAULT_IELTS_BANDS);
};
