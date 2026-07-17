import { env } from '@/config/env';
import { api, apiPostUnwrappedEnvelope } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import type { AiVoiceAssessmentResult, AiVoiceScenario, ChatHistoryItem } from '../types/ai-voice.types';

const AI_VOICE_BASE = '/v1/ai-voice';
const AI_VOICE_FETCH_BASE = `${env.API_URL}${AI_VOICE_BASE}`;

export interface AiVoiceSttResult {
	transcript: string;
	durationMs: number;
}

interface AiVoiceTtsPayload {
	text: string;
}

interface GenerateScenariosPayload {
	topic: string;
	level: string;
}

interface GenerateScenariosResponse {
	scenarios: AiVoiceScenario[];
}

const isAiVoiceScenario = (value: unknown): value is AiVoiceScenario => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const scenario = value as Record<string, unknown>;
	return (
		typeof scenario.id === 'string'
		&& typeof scenario.title === 'string'
		&& typeof scenario.description === 'string'
	);
};

const isAiVoiceScenarioArray = (value: unknown): value is AiVoiceScenario[] => {
	return Array.isArray(value) && value.every(isAiVoiceScenario);
};

const isGenerateScenariosResponse = (value: unknown): value is GenerateScenariosResponse => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const response = value as { scenarios?: unknown };
	return isAiVoiceScenarioArray(response.scenarios);
};

const parseGenerateScenariosResponse = (value: unknown): AiVoiceScenario[] => {
	if (isGenerateScenariosResponse(value)) {
		return value.scenarios;
	}

	if (isAiVoiceScenarioArray(value)) {
		return value;
	}

	throw new Error('Dữ liệu tình huống AI không hợp lệ.');
};

export interface AiVoiceChatParams {
	sessionId: string;
	scenario: AiVoiceScenario;
	transcript: string;
	chatHistory: ChatHistoryItem[];
	level: string;
	topic: string;
}

export interface AiVoiceAssessmentTurn {
	transcript: string;
	durationMs: number;
}

export const aiVoiceService = {
	async stt(audio: Blob, sessionId: string): Promise<AiVoiceSttResult> {
		const formData = new FormData();
		formData.append('audio', audio, 'recording.webm');
		formData.append('sessionId', sessionId);

		return apiPostUnwrappedEnvelope<AiVoiceSttResult, FormData>(
			`${AI_VOICE_BASE}/stt`,
			formData,
			{ headers: { 'Content-Type': 'multipart/form-data' } },
		);
	},

	async tts(text: string, signal?: AbortSignal): Promise<Blob> {
		const payload: AiVoiceTtsPayload = { text };
		const response = await api.post<ArrayBuffer, ArrayBuffer>(
			`${AI_VOICE_BASE}/tts`,
			payload,
			{
				responseType: 'arraybuffer',
				signal,
			},
		);

		return new Blob([response], { type: 'audio/mpeg' });
	},

	async generateScenarios(topic: string, level: string): Promise<AiVoiceScenario[]> {
		const payload: GenerateScenariosPayload = { topic, level };
		const response = await apiPostUnwrappedEnvelope<GenerateScenariosResponse | AiVoiceScenario[], GenerateScenariosPayload>(
			`${AI_VOICE_BASE}/generate-scenarios`,
			payload,
		);

		return parseGenerateScenariosResponse(response);
	},

	async chat(params: AiVoiceChatParams, signal?: AbortSignal): Promise<Response> {
		const token = useAuthStore.getState().token;
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
		};

		if (token && token !== 'cookie') {
			headers.Authorization = `Bearer ${token}`;
		}

		const response = await fetch(`${AI_VOICE_FETCH_BASE}/chat`, {
			method: 'POST',
			headers,
			credentials: 'include',
			body: JSON.stringify(params),
			signal,
		});

		if (!response.ok) {
			throw new Error('Không thể gọi pipeline hội thoại AI Voice.');
		}

		return response;
	},

	async assessConversation(params: {
		sessionId: string;
		scenario: AiVoiceScenario;
		level: string;
		topic: string;
		turns: AiVoiceAssessmentTurn[];
		audioBlobs: Blob[];
	}): Promise<AiVoiceAssessmentResult> {
		const formData = new FormData();
		formData.append('sessionId', params.sessionId);
		formData.append('scenario', JSON.stringify(params.scenario));
		formData.append('level', params.level);
		formData.append('topic', params.topic);
		formData.append('turns', JSON.stringify(params.turns));
		params.audioBlobs.forEach((blob, index) => {
			formData.append('audio', blob, `turn-${index + 1}.webm`);
		});

		return apiPostUnwrappedEnvelope<AiVoiceAssessmentResult, FormData>(
			`${AI_VOICE_BASE}/assessment`,
			formData,
			{ headers: { 'Content-Type': 'multipart/form-data' } },
		);
	},
};
