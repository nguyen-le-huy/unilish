import { useMutation } from '@tanstack/react-query';
import { savePlacementAnswers, type SavePlacementAnswersPayload, type SavePlacementAnswersResult } from '../api/save-placement-answers';

export const useSavePlacementAnswersMutation = () => {
    return useMutation<SavePlacementAnswersResult, Error, SavePlacementAnswersPayload>({
        mutationFn: savePlacementAnswers,
    });
};
