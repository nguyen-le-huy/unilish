import type { ToeicQuestionGroup } from '../components/listening-reading/types';

export const PART7_MOCK_GROUPS: ToeicQuestionGroup[] = [
    {
        id: 'p7-g1',
        imageUrls: [
            'https://picsum.photos/seed/p7g1a/900/500',
            'https://picsum.photos/seed/p7g1b/900/500',
        ],
        questions: [
            {
                id: 'p7-q147',
                questionNumber: 147,
                questionText: 'What is the purpose of this article?',
                optionsText: ['To compare two products', 'To announce a hiring event', 'To summarize a customer survey', 'To describe a new service'],
            },
            {
                id: 'p7-q148',
                questionNumber: 148,
                questionText: 'What is suggested about the company?',
                optionsText: ['It recently changed ownership', 'It expanded to a new city', 'It reduced staff this quarter', 'It plans to close a branch'],
            },
            {
                id: 'p7-q149',
                questionNumber: 149,
                questionText: 'Which feature is mentioned in paragraph 2?',
                optionsText: ['24-hour support', 'Free installation', 'Mobile tracking', 'Custom packaging'],
            },
            {
                id: 'p7-q150',
                questionNumber: 150,
                questionText: 'What will most likely happen next month?',
                optionsText: ['A promotional campaign will launch', 'A product line will be discontinued', 'A partnership will end', 'A new CEO will be appointed'],
            },
        ],
    },
    {
        id: 'p7-g2',
        imageUrl: 'https://picsum.photos/seed/p7g2/900/500',
        questions: [
            {
                id: 'p7-q151',
                questionNumber: 151,
                questionText: 'Who most likely wrote this email?',
                optionsText: ['A purchasing manager', 'A travel agent', 'A legal advisor', 'A restaurant owner'],
            },
            {
                id: 'p7-q152',
                questionNumber: 152,
                questionText: 'Why is the recipient contacted?',
                optionsText: ['To confirm a delivery date', 'To request a refund', 'To submit a complaint', 'To update payment details'],
            },
            {
                id: 'p7-q153',
                questionNumber: 153,
                questionText: 'What is attached to the message?',
                optionsText: ['A revised invoice', 'A floor plan', 'A meeting agenda', 'A maintenance checklist'],
            },
        ],
    },
    {
        id: 'p7-g3',
        imageUrl: 'https://picsum.photos/seed/p7g3/900/500',
        questions: [
            {
                id: 'p7-q154',
                questionNumber: 154,
                questionText: 'What can be inferred about the project?',
                optionsText: ['It is behind schedule', 'It needs additional approval', 'It exceeded expectations', 'It was canceled last week'],
            },
            {
                id: 'p7-q155',
                questionNumber: 155,
                questionText: 'What is indicated about the team?',
                optionsText: ['They work in multiple time zones', 'They recently merged departments', 'They were relocated to another office', 'They outsourced technical work'],
            },
        ],
    },
];
