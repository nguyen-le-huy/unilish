export type PttStatus = 'idle' | 'recording' | 'processing' | 'ai_speaking' | 'error' | 'ended';

export interface AiVoiceChatMessage {
	id: string;
	role: 'assistant' | 'user';
	content: string;
	createdAt: number;
	suggestedReply?: string;
}

export interface AiVoiceScenario {
	id: string;
	title: string;
	description: string;
}

export interface AiVoiceTopic {
	_id: string;
	slug: string;
	title: string;
	description: string;
	icon: string;
	scenarios: AiVoiceScenario[];
}

export interface ChatHistoryItem {
	role: 'user' | 'assistant';
	content: string;
}

export interface AiVoiceAssessmentResult {
	pronunciation: {
		overallScore: number;
		words: Array<{ word: string; accuracyScore: number; errorType: string }>;
		assessedTurns: number;
		failedTurns: number;
	};
	language: {
		teacherSummary: string;
		levelAssessment: string;
		pronunciationFeedback: string;
		grammarFeedback: string;
		vocabularyFeedback: string;
		grammarScore: number;
		vocabularyScore: number;
		fluencyScore: number;
		overallScore: number;
		strengths: string[];
		improvements: string[];
		corrections: Array<{ original: string; corrected: string; explanation: string }>;
	};
}
