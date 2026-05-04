import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ApiErrorResponse } from '@/types/common';
import { shadowingService } from '../api/shadowing.service';
import type { PaginatedVideos } from '../types/shadowing.types';

export const useVideoLibrary = (page: number = 1, limit: number = 12) => {
    return useQuery<PaginatedVideos, AxiosError<ApiErrorResponse>>({
        queryKey: ['shadowing', 'library', page, limit],
        queryFn: () => shadowingService.listVideos(page, limit),
        staleTime: 30_000,
    });
};
