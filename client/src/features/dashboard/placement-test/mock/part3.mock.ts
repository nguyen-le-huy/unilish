import type { ToeicQuestionGroup } from '../components/listening-reading/types';

export const PART3_MOCK_GROUPS: ToeicQuestionGroup[] = [
    {
        id: 'p3-g1',
        questions: [
            {
                id: 'p3-q32',
                questionNumber: 32,
                questionText: 'What is the woman requesting?',
                optionsText: ['Time off from work', 'A recommendation letter', 'A schedule change', 'A pay raise'],
            },
            {
                id: 'p3-q33',
                questionNumber: 33,
                questionText: 'What does the man suggest?',
                optionsText: ['Speaking to HR', 'Sending an email', 'Working overtime', 'Submitting a report'],
            },
            {
                id: 'p3-q34',
                questionNumber: 34,
                questionText: 'What will the woman probably do next?',
                optionsText: ['Take a vacation', 'Call a client', 'Meet the manager', 'Attend training'],
            },
        ],
    },
    {
        id: 'p3-g2',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80',
        questions: [
            {
                id: 'p3-q35',
                questionNumber: 35,
                questionText: 'What is the woman requesting?',
                optionsText: ['Time off from work', 'A recommendation letter', 'A schedule change', 'A pay raise'],
            },
            {
                id: 'p3-q36',
                questionNumber: 36,
                questionText: 'Where most likely are the speakers?',
                optionsText: ['At a bank', 'In a clothing store', 'At a hospital', 'In a school office'],
            },
            {
                id: 'p3-q37',
                questionNumber: 37,
                questionText: 'What does the man mean when he says, "We can adjust it"?',
                optionsText: ['The delivery date can change', 'The color cannot change', 'The refund is unavailable', 'The order is canceled'],
            },
        ],
    },
];
