import type { ToeicQuestionGroup } from '../components/listening-reading/types';

export const PART4_MOCK_GROUPS: ToeicQuestionGroup[] = [
    {
        id: 'p4-g1',
        questions: [
            {
                id: 'p4-q71',
                questionNumber: 71,
                questionText: 'What is the purpose of the announcement?',
                optionsText: ['To introduce a new manager', 'To announce a schedule change', 'To confirm a meeting location', 'To explain a policy update'],
            },
            {
                id: 'p4-q72',
                questionNumber: 72,
                questionText: 'What are listeners asked to do?',
                optionsText: ['Submit forms online', 'Arrive 15 minutes early', 'Call customer support', 'Bring printed tickets'],
            },
            {
                id: 'p4-q73',
                questionNumber: 73,
                questionText: 'When will the new rule take effect?',
                optionsText: ['This afternoon', 'Tomorrow morning', 'Next Monday', 'At the end of the month'],
            },
        ],
    },
    {
        id: 'p4-g2',
        imageUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=900&q=80',
        questions: [
            {
                id: 'p4-q74',
                questionNumber: 74,
                questionText: 'Where is this announcement most likely being made?',
                optionsText: ['At an airport terminal', 'In a hotel lobby', 'At a train station', 'Inside a museum'],
            },
            {
                id: 'p4-q75',
                questionNumber: 75,
                questionText: 'What problem is mentioned?',
                optionsText: ['A delayed delivery', 'A system outage', 'A canceled workshop', 'A parking shortage'],
            },
            {
                id: 'p4-q76',
                questionNumber: 76,
                questionText: 'What will happen after the announcement?',
                optionsText: ['Refunds will be processed', 'A staff member will assist guests', 'The store will close early', 'A survey link will be sent'],
            },
        ],
    },
];
