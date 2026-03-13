import type { ToeicQuestionGroup } from '../components/listening-reading/types';

export const PART7_MOCK_GROUPS: ToeicQuestionGroup[] = [
    {
        id: 'p7-g1',
        imageUrls: [
            'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=900&q=80',
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80',
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
        imageUrl: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=900&q=80',
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
        imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=900&q=80',
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
