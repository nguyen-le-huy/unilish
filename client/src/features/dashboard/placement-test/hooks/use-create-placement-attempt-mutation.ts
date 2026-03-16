import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PT_QUERY_KEYS } from '../constants/placement-test.constants';
import { createPlacementAttempt } from '../api/create-placement-attempt';
import type { RuntimeAttempt } from '../types/runtime.types';

export const useCreatePlacementAttemptMutation = (placementTestId?: string) => {
    const lastTriggeredPlacementTestIdRef = useRef<string | null>(null);

    const mutation = useMutation<RuntimeAttempt, Error, string>({
        mutationKey: PT_QUERY_KEYS.create(placementTestId),
        mutationFn: (nextPlacementTestId) => createPlacementAttempt({ placementTestId: nextPlacementTestId }),
        retry: false,
    });
    const { mutate } = mutation;

    useEffect(() => {
        if (!placementTestId) {
            return;
        }

        if (lastTriggeredPlacementTestIdRef.current === placementTestId) {
            return;
        }

        lastTriggeredPlacementTestIdRef.current = placementTestId;
        mutate(placementTestId);
    }, [placementTestId, mutate]);

    return mutation;
};
