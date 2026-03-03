import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { learningGoalApi } from '../api/learning-goal.api';
import { LEARNING_GOAL_QUERY_KEYS } from '../constants/query-keys';
import type {
    CreateLearningGoalPayload,
    DuplicateLearningGoalPayload,
    LearningGoalListResponse,
    TestLearningGoalPayload,
    UpdateLearningGoalPayload,
} from '../types/learning-goal.types';

export const useCreateLearningGoal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateLearningGoalPayload) => learningGoalApi.createLearningGoal(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });
            toast.success('Tạo mục tiêu thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Tạo mục tiêu thất bại'));
        },
    });
};

export const useUpdateLearningGoal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ slug, payload }: { slug: string; payload: UpdateLearningGoalPayload }) =>
            learningGoalApi.updateLearningGoal(slug, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.detail(variables.slug) });
            toast.success('Cập nhật mục tiêu thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Cập nhật mục tiêu thất bại'));
        },
    });
};

export const useDuplicateLearningGoal = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ slug, payload }: { slug: string; payload: DuplicateLearningGoalPayload }) =>
            learningGoalApi.duplicateLearningGoal(slug, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });
            toast.success('Nhân bản mục tiêu thành công');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Nhân bản mục tiêu thất bại'));
        },
    });
};

export const useToggleLearningGoalStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (slug: string) => learningGoalApi.toggleLearningGoalStatus(slug),
        onMutate: async (slug) => {
            await queryClient.cancelQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });

            const previousLists = queryClient.getQueriesData<LearningGoalListResponse>({
                queryKey: LEARNING_GOAL_QUERY_KEYS.lists(),
            });

            queryClient.setQueriesData<LearningGoalListResponse>(
                { queryKey: LEARNING_GOAL_QUERY_KEYS.lists() },
                (old) =>
                    old
                        ? {
                              ...old,
                              data: old.data.map((g) =>
                                  g.slug === slug ? { ...g, isActive: !g.isActive } : g,
                              ),
                          }
                        : old,
            );

            return { previousLists };
        },
        onError: (error, _, context) => {
            for (const [key, data] of context?.previousLists ?? []) {
                queryClient.setQueryData(key, data);
            }
            toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });
        },
    });
};

export const useTestLearningGoal = () => {
    return useMutation({
        mutationFn: ({ slug, payload }: { slug: string; payload: TestLearningGoalPayload }) =>
            learningGoalApi.testLearningGoal(slug, payload),
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Test AI thất bại'));
        },
    });
};

export const useUploadGoalIcon = () => {
    return useMutation({
        mutationFn: (file: File) => learningGoalApi.uploadGoalIcon(file),
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Upload icon mục tiêu thất bại'));
        },
    });
};
