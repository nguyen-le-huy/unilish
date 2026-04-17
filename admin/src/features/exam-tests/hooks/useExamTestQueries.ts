import { useQuery } from '@tanstack/react-query';
import { examTestService } from '../api/examTestService';
import { EXAM_TEST_QUERY_KEYS } from './useExamTests';

export const useExamVersionHistory = (testId: string | undefined) => {
    return useQuery({
        queryKey: EXAM_TEST_QUERY_KEYS.versions(testId ?? ''),
        queryFn: () => examTestService.getVersionHistory(testId!),
        enabled: !!testId,
        staleTime: 60 * 1000,
    });
};

export const useExamAnalytics = (testId: string | undefined) => {
    return useQuery({
        queryKey: EXAM_TEST_QUERY_KEYS.analytics(testId ?? ''),
        queryFn: () => examTestService.getAnalytics(testId!),
        enabled: !!testId,
        staleTime: 5 * 60 * 1000,
    });
};
