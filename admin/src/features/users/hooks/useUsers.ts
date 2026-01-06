import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/user.api';
import type { UserFilter, UpdateSubscriptionPayload, UpdateRolePayload } from '../types';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

export const useUsers = (filter: UserFilter) => {
    return useQuery({
        queryKey: ['users', filter],
        queryFn: () => userApi.getUsers(filter),
        placeholderData: (previousData) => previousData,
    });
};

export const useUserStats = () => {
    return useQuery({
        queryKey: ['user-stats'],
        queryFn: () => userApi.getStats(),
    });
};

export const useUser = (id: string) => {
    return useQuery({
        queryKey: ['users', id],
        queryFn: () => userApi.getUser(id),
        enabled: !!id,
    });
};

export const useUpdateSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateSubscriptionPayload }) =>
            userApi.updateSubscription(id, payload),
        onSuccess: () => {
            toast.success('Cập nhật gói cước thành công');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: AxiosError<{ message?: string }>) => {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });
};

export const useUpdateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
            userApi.updateRole(id, payload),
        onSuccess: () => {
            toast.success('Cập nhật quyền thành công');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: AxiosError<{ message?: string }>) => {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        },
    });
};
