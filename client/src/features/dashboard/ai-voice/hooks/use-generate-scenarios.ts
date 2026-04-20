import { useMutation } from '@tanstack/react-query';
import type { AiVoiceScenario } from '../types/ai-voice.types';
import { aiVoiceService } from '../api/ai-voice.service';

export interface GenerateScenariosInput {
	topic: string;
	level: string;
}

export const useGenerateScenarios = () => {
	return useMutation<AiVoiceScenario[], Error, GenerateScenariosInput>({
		mutationFn: ({ topic, level }) => aiVoiceService.generateScenarios(topic, level),
	});
};
