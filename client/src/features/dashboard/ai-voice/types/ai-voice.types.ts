export type PttStatus = 'idle' | 'recording' | 'processing' | 'ai_speaking' | 'error' | 'ended';

export interface AiVoiceChatMessage {
	id: string;
	role: 'assistant' | 'user';
	content: string;
	createdAt: number;
}

export interface AiVoiceScenario {
	id: string;
	title: string;
	description: string;
}

export interface ChatHistoryItem {
	role: 'user' | 'assistant';
	content: string;
}
