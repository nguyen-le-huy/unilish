import { describe, expect, it, vi } from 'vitest';
import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import { getLearningGoals } from './get-learning-goals';

vi.mock('@/lib/axios', () => ({
    apiGetUnwrappedEnvelope: vi.fn(),
}));

describe('getLearningGoals', () => {
    it('requests active goals with envelope unwrapping enabled utility', async () => {
        const goals = [
            {
                _id: 'goal-1',
                slug: 'travel',
                title: 'Giao tiếp du lịch',
                isActive: true,
            },
        ];

        vi.mocked(apiGetUnwrappedEnvelope).mockResolvedValueOnce(goals);

        const result = await getLearningGoals();

        expect(apiGetUnwrappedEnvelope).toHaveBeenCalledWith('/curriculum/goals', {
            params: {
                page: 1,
                limit: 100,
                isActive: true,
            },
        });
        expect(result).toEqual(goals);
    });
});
