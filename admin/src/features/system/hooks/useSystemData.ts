import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings.api';
import type { LevelIcons } from '../types/system.types';
import { toast } from 'sonner';

// Query keys for cache management
export const SYSTEM_QUERY_KEYS = {
    levelIcons: ['system', 'levelIcons'] as const,
    setting: (key: string) => ['system', 'setting', key] as const,
};

/**
 * Hook to fetch level icons setting
 */
export const useLevelIcons = () => {
    return useQuery({
        queryKey: SYSTEM_QUERY_KEYS.levelIcons,
        queryFn: async () => {
            const data = await settingsApi.getSetting('level_icons');
            return (data?.value || {}) as LevelIcons;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (rarely changes)
    });
};

/**
 * Hook to upload an image
 */
export const useUploadImage = () => {
    return useMutation({
        mutationFn: settingsApi.uploadImage,
        onError: () => {
            toast.error('Upload thất bại');
        },
    });
};

/**
 * Hook to update level icon
 */
export const useUpdateLevelIcon = () => {
    const queryClient = useQueryClient();
    const uploadImage = useUploadImage();

    return useMutation({
        mutationFn: async ({ level, file }: { level: string; file: File }) => {
            // 1. Upload image
            const uploadRes = await uploadImage.mutateAsync(file);

            // 2. Get current icons
            const currentIcons = queryClient.getQueryData<LevelIcons>(
                SYSTEM_QUERY_KEYS.levelIcons
            ) || {};

            // 3. Update with new icon
            const newIcons = { ...currentIcons, [level]: uploadRes.url };

            // 4. Save to settings
            await settingsApi.updateSetting(
                'level_icons',
                newIcons,
                'Icons for Level Progress'
            );

            return newIcons;
        },
        onSuccess: (data, { level }) => {
            // Update cache with new data
            queryClient.setQueryData(SYSTEM_QUERY_KEYS.levelIcons, data);
            toast.success(`Cập nhật icon cho level ${level} thành công`);
        },
        onError: () => {
            toast.error('Cập nhật icon thất bại');
        },
    });
};
