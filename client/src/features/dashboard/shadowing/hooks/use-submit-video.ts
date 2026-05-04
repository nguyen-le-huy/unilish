import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import type { ApiErrorResponse } from '@/types/common';
import { shadowingService } from '../api/shadowing.service';
import type { SubmitVideoResponse } from '../types/shadowing.types';

const buildShadowingPlayerPath = (videoId: string): string => {
    return `/dashboard/shadowing/${encodeURIComponent(videoId)}`;
};

export const useSubmitVideo = () => {
    const navigate = useNavigate();
    const [processingVideoId, setProcessingVideoId] = useState<string | null>(null);

    const mutation = useMutation<SubmitVideoResponse, AxiosError<ApiErrorResponse>, string>({
        mutationFn: shadowingService.submitVideo,
        onMutate: () => {
            setProcessingVideoId(null);
        },
        onSuccess: (payload) => {
            if (payload.status === 'ready') {
                const readyVideoId = payload.video?.videoId;
                if (readyVideoId) {
                    navigate(buildShadowingPlayerPath(readyVideoId));
                }
                return;
            }

            if (payload.status === 'processing' && payload.videoId) {
                setProcessingVideoId(payload.videoId);
            }
        },
    });

    const submitVideo = useCallback((url: string) => {
        mutation.mutate(url);
    }, [mutation]);

    const clearProcessingVideoId = useCallback(() => {
        setProcessingVideoId(null);
    }, []);

    return { ...mutation, submitVideo, processingVideoId, clearProcessingVideoId };
};
