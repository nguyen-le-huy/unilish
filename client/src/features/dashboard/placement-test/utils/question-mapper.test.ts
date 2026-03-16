import { describe, expect, it } from 'vitest';
import { env } from '@/config/env';
import { mapAttemptToParts } from './question-mapper';
import type { RuntimeAttempt } from '../types/runtime.types';

const buildAttemptFixture = (): RuntimeAttempt => ({
    attemptId: 'attempt-1',
    placementTestId: 'test-1',
    language: 'en',
    status: 'in_progress',
    startedAt: '2026-03-16T08:00:00.000Z',
    expiresAt: '2026-03-16T09:00:00.000Z',
    submittedAt: null,
    durationSeconds: null,
    totalQuestions: 5,
    answerSheet: [],
    modules: [
        {
            order: 1,
            type: 'mcq',
            name: 'TOEIC Runtime',
            timeLimitMinutes: 60,
            parts: [
                {
                    part: 2,
                    name: 'Part 2',
                    skill: 'listening',
                    audioUrl: 'https://pub-example.r2.dev/audio/part2.mp3',
                    questions: [
                        {
                            questionId: 'p2-q1',
                            questionNumber: 1,
                            part: 2,
                            skill: 'listening',
                            questionText: 'Question 1',
                            options: [
                                { id: 'A', text: 'A1' },
                                { id: 'B', text: 'B1' },
                                { id: 'C', text: 'C1' },
                                { id: 'D', text: 'D1' },
                            ],
                            audioUrl: 'audio/part2-question.mp3',
                        },
                    ],
                },
                {
                    part: 6,
                    name: 'Part 6',
                    skill: 'reading',
                    questions: [
                        {
                            questionId: 'p6-q1',
                            questionNumber: 1,
                            part: 6,
                            skill: 'reading',
                            questionText: 'Question 2',
                            options: [
                                { id: 'A', text: 'A2' },
                                { id: 'B', text: 'B2' },
                                { id: 'C', text: 'C2' },
                                { id: 'D', text: 'D2' },
                            ],
                            imageUrl: 'https://cdn.example.com/shared-image.png',
                        },
                        {
                            questionId: 'p6-q2',
                            questionNumber: 2,
                            part: 6,
                            skill: 'reading',
                            questionText: 'Question 3',
                            options: [
                                { id: 'A', text: 'A3' },
                                { id: 'B', text: 'B3' },
                                { id: 'C', text: 'C3' },
                                { id: 'D', text: 'D3' },
                            ],
                            imageUrl: 'https://cdn.example.com/shared-image.png',
                        },
                    ],
                },
            ],
        },
    ],
});

describe('mapAttemptToParts', () => {
    it('maps parts with sequential display numbers and next-part links', () => {
        const mapped = mapAttemptToParts(buildAttemptFixture());

        expect(mapped.partInfos.map((item) => item.part)).toEqual([2, 6]);
        expect(mapped.nextPartMap[2]).toBe(6);
        expect(mapped.nextPartMap[6]).toBeUndefined();

        expect(mapped.partQuestions[2]?.[0]?.questionNumber).toBe(1);
        expect(mapped.partQuestions[6]?.[0]?.questionNumber).toBe(2);
        expect(mapped.partQuestions[6]?.[1]?.questionNumber).toBe(3);
    });

    it('normalizes part 2 options and proxies audio URLs through backend API', () => {
        const mapped = mapAttemptToParts(buildAttemptFixture());
        const part2Question = mapped.partQuestions[2]?.[0];

        expect(part2Question?.optionCount).toBe(3);
        expect(part2Question?.optionsText).toEqual(['A1', 'B1', 'C1']);

        expect(mapped.partAudio[2]).toBe(`${env.API_URL}/audio/audio/part2-question.mp3`);
    });

    it('groups part 6 questions by shared media key and preserves single shared image', () => {
        const mapped = mapAttemptToParts(buildAttemptFixture());
        const part6Groups = mapped.partGroups[6] ?? [];

        expect(part6Groups).toHaveLength(1);
        expect(part6Groups[0]?.questions).toHaveLength(2);
        expect(part6Groups[0]?.imageUrl).toBe('https://cdn.example.com/shared-image.png');
        expect(part6Groups[0]?.imageUrls).toBeUndefined();
    });
});
