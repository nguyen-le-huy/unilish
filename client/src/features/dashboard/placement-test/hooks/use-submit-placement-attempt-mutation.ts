import { useMutation } from '@tanstack/react-query';
import { submitPlacementAttempt, type SubmitPlacementAttemptResult } from '../api/submit-placement-attempt';

export const useSubmitPlacementAttemptMutation = () => {
    return useMutation<SubmitPlacementAttemptResult, Error, string>({
        mutationFn: submitPlacementAttempt,
    });
};
