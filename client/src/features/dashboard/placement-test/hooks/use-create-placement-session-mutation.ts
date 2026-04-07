import { useMutation } from '@tanstack/react-query';
import {
    createPlacementSession,
    type CreatePlacementSessionPayload,
    type CreatePlacementSessionResult,
} from '../api/create-placement-session';

export const useCreatePlacementSessionMutation = () => {
    return useMutation<CreatePlacementSessionResult, Error, CreatePlacementSessionPayload>({
        mutationFn: createPlacementSession,
    });
};