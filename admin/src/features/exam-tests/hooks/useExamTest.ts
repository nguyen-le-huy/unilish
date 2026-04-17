import { useQuery } from '@tanstack/react-query';
import { examTestService } from '../api/examTestService';
import { EXAM_TEST_QUERY_KEYS } from './useExamTests';

export const useExamTest = (id: string | undefined) => {
    return useQuery({
        queryKey: EXAM_TEST_QUERY_KEYS.detail(id ?? ''),
        queryFn: () => examTestService.getById(id!),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
};
