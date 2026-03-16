import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { getGoalQueryKey } from '../constants/goal-selection.constants';
import { useLearningGoalsQuery } from './use-learning-goals-query';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}));

describe('useLearningGoalsQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('builds query key and enables query when languageId is undefined', () => {
        useLearningGoalsQuery(undefined);

        expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: getGoalQueryKey(undefined),
            enabled: true,
        }));
    });

    it('disables query when languageId is an empty string', () => {
        useLearningGoalsQuery('');

        expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: getGoalQueryKey(''),
            enabled: false,
        }));
    });

    it('enables query when languageId is a non-empty string', () => {
        useLearningGoalsQuery('en');

        expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
            queryKey: getGoalQueryKey('en'),
            enabled: true,
        }));
    });
});
