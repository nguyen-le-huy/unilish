import { useQuery } from '@tanstack/react-query';
import { aiVoiceService } from '../api/ai-voice.service';

export const useAiVoiceCatalog = () => useQuery({
	queryKey: ['ai-voice', 'catalog'],
	queryFn: () => aiVoiceService.getCatalog(),
	staleTime: 5 * 60 * 1000,
});
