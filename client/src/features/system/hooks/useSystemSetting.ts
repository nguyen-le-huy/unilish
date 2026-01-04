import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

// Keys
export const settingKeys = {
    all: ['settings'] as const,
    detail: (key: string) => [...settingKeys.all, key] as const,
};

// API
const getSetting = async <T>(key: string): Promise<T> => {
    const res = await apiClient.get<{ data: { value: T } }>(`/settings/${key}`);
    return res.data.data.value;
};

// Hook
export function useSystemSetting<T>(key: string) {
    return useQuery({
        queryKey: settingKeys.detail(key),
        queryFn: () => getSetting<T>(key),
        staleTime: 1000 * 60 * 60, // 1 hour cache
    });
}
