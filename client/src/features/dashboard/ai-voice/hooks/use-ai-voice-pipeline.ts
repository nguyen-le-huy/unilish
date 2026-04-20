import { useCallback, useEffect, useMemo, useRef } from 'react';
import { aiVoiceService, type AiVoiceChatParams } from '../api/ai-voice.service';

interface SttResult {
	transcript: string;
	durationMs: number;
}

export interface AiVoiceLlmResult {
	reply: string;
	latencyMs: number;
	tokenUsage: number;
	model: string;
	isConversationEnded: boolean;
}

type SseData = Record<string, unknown>;

interface SseEvent {
	event: string;
	data: SseData;
}

interface StreamCallbackParams {
	onChunk: (chunk: string) => void;
	onAudioStart?: () => void;
}

export interface AiVoiceStreamReplyParams extends AiVoiceChatParams, StreamCallbackParams {}

interface UseAiVoicePipelineReturn {
	transcribe: (audio: Blob, sessionId: string) => Promise<SttResult>;
	streamReply: (params: AiVoiceStreamReplyParams) => Promise<AiVoiceLlmResult>;
	playDirectly: (text: string) => Promise<void>;
	waitForAudio: () => Promise<void>;
	interrupt: () => void;
	unlockAudio: () => void;
}

const parseSseEvents = (rawChunk: string): SseEvent[] => {
	const blocks = rawChunk.split('\n\n').map((part) => part.trim()).filter(Boolean);
	const parsed: SseEvent[] = [];

	blocks.forEach((block) => {
		const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
		const eventLine = lines.find((line) => line.startsWith('event:'));
		const dataLine = lines.find((line) => line.startsWith('data:'));
		if (!eventLine || !dataLine) {
			return;
		}

		const event = eventLine.replace('event:', '').trim();
		const dataRaw = dataLine.replace('data:', '').trim();

		try {
			const data = JSON.parse(dataRaw) as SseData;
			parsed.push({ event, data });
		} catch {
			// Ignore malformed SSE payload
		}
	});

	return parsed;
};

export const useAiVoicePipeline = (): UseAiVoicePipelineReturn => {
	const chatAbortRef = useRef<AbortController | null>(null);
	const ttsAbortControllersRef = useRef<AbortController[]>([]);
	const activeAudioRef = useRef<HTMLAudioElement | null>(null);
	const audioQueueRef = useRef<Array<Promise<Blob | null>>>([]);
	const isPlayingRef = useRef(false);
	const hasStartedPlayingRef = useRef(false);
	const finishResolversRef = useRef<Array<() => void>>([]);
	const onAudioStartRef = useRef<(() => void) | undefined>(undefined);
	const processAudioQueueRef = useRef<() => Promise<void>>(async () => {});
	const stopAudioPlaybackRef = useRef<() => void>(() => {});

	const transcribe = useCallback(async (audio: Blob, sessionId: string): Promise<SttResult> => {
		return aiVoiceService.stt(audio, sessionId);
	}, []);

	const processAudioQueue = useCallback(async () => {
		if (isPlayingRef.current) {
			return;
		}

		if (audioQueueRef.current.length === 0) {
			finishResolversRef.current.forEach((resolve) => resolve());
			finishResolversRef.current = [];
			return;
		}

		isPlayingRef.current = true;
		const blobPromise = audioQueueRef.current.shift();

		if (!blobPromise) {
			isPlayingRef.current = false;
			return;
		}

		try {
			const blob = await blobPromise;
			if (!blob) {
				isPlayingRef.current = false;
				void processAudioQueueRef.current();
				return;
			}

			if (!hasStartedPlayingRef.current) {
				hasStartedPlayingRef.current = true;
				onAudioStartRef.current?.();
			}

			const url = URL.createObjectURL(blob);
			const audio = activeAudioRef.current || new Audio();
			activeAudioRef.current = audio;
			audio.src = url;

			await new Promise<void>((resolve) => {
				audio.onended = () => resolve();
				audio.onerror = () => resolve();
				audio.play().catch(() => resolve());
			});

			URL.revokeObjectURL(url);
			activeAudioRef.current = null;
		} catch {
			// Ignore single chunk audio failure
		}

		isPlayingRef.current = false;
		void processAudioQueueRef.current();
	}, []);

	useEffect(() => {
		processAudioQueueRef.current = processAudioQueue;
	}, [processAudioQueue]);

	const stopAudioPlayback = useCallback(() => {
		ttsAbortControllersRef.current.forEach((controller) => controller.abort());
		ttsAbortControllersRef.current = [];

		audioQueueRef.current = [];
		isPlayingRef.current = false;
		hasStartedPlayingRef.current = false;

		const audio = activeAudioRef.current;
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
			audio.src = '';
		}
		activeAudioRef.current = null;

		finishResolversRef.current.forEach((resolve) => resolve());
		finishResolversRef.current = [];
	}, []);

	useEffect(() => {
		stopAudioPlaybackRef.current = stopAudioPlayback;
	}, [stopAudioPlayback]);

	const enqueueTts = useCallback((text: string) => {
		if (!text.trim()) {
			return;
		}

		const controller = new AbortController();
		ttsAbortControllersRef.current.push(controller);

		const promise = aiVoiceService
			.tts(text, controller.signal)
			.then((blob) => blob)
			.catch(() => null)
			.finally(() => {
				ttsAbortControllersRef.current = ttsAbortControllersRef.current.filter((item) => item !== controller);
			});

		audioQueueRef.current.push(promise);
		void processAudioQueue();
	}, [processAudioQueue]);

	const streamReply = useCallback(async ({
		onChunk,
		onAudioStart,
		...requestParams
	}: AiVoiceStreamReplyParams): Promise<AiVoiceLlmResult> => {
		chatAbortRef.current?.abort();
		stopAudioPlaybackRef.current();

		const abortController = new AbortController();
		chatAbortRef.current = abortController;

		onAudioStartRef.current = onAudioStart;

		const response = await aiVoiceService.chat(requestParams, abortController.signal);
		if (!response.body) {
			throw new Error('Phản hồi hội thoại không hợp lệ.');
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffered = '';

		let reply = '';
		let latencyMs = 0;
		let tokenUsage = 0;
		let model = '';
		let isConversationEnded = false;

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			buffered += decoder.decode(value, { stream: true });
			const parsedEvents = parseSseEvents(buffered);

			const consumed = buffered.lastIndexOf('\n\n');
			if (consumed >= 0) {
				buffered = buffered.slice(consumed + 2);
			}

			parsedEvents.forEach(({ event, data }) => {
				if (event === 'chunk') {
					const incomingText = typeof data.text === 'string' ? data.text : '';
					if (incomingText) {
						reply += incomingText;
						onChunk(incomingText);
					}
				}

				if (event === 'done') {
					latencyMs = typeof data.latencyMs === 'number' ? data.latencyMs : latencyMs;
					tokenUsage = typeof data.tokenUsage === 'number' ? data.tokenUsage : tokenUsage;
					model = typeof data.model === 'string' ? data.model : model;
					isConversationEnded = typeof data.isConversationEnded === 'boolean'
						? data.isConversationEnded
						: isConversationEnded;
				}
			});
		}

		if (reply.trim()) {
			enqueueTts(reply);
		}

		return {
			reply,
			latencyMs,
			tokenUsage,
			model,
			isConversationEnded,
		};
	}, [enqueueTts]);

	const waitForAudio = useCallback((): Promise<void> => {
		return new Promise<void>((resolve) => {
			const checkPlaybackFinished = () => {
				const audio = activeAudioRef.current;
				const isElementPlaying = Boolean(audio && !audio.paused && !audio.ended);
				const hasPendingQueue = audioQueueRef.current.length > 0;
				const isProcessingPlayback = isPlayingRef.current;

				if (!isElementPlaying && !hasPendingQueue && !isProcessingPlayback) {
					resolve();
					return;
				}

				globalThis.setTimeout(checkPlaybackFinished, 60);
			};

			checkPlaybackFinished();
		});
	}, []);

	const playDirectly = useCallback(async (text: string): Promise<void> => {
		enqueueTts(text);
		await waitForAudio();
	}, [enqueueTts, waitForAudio]);

	const interrupt = useCallback(() => {
		chatAbortRef.current?.abort();
		chatAbortRef.current = null;
		stopAudioPlayback();
	}, [stopAudioPlayback]);

	const unlockAudio = useCallback(() => {
		if (!activeAudioRef.current) {
			const audio = new Audio();
			audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
			audio.volume = 0;
			audio.play().catch(() => {});
			audio.volume = 1;
			activeAudioRef.current = audio;
		}
	}, []);

	return useMemo(() => ({
		transcribe,
		streamReply,
		playDirectly,
		waitForAudio,
		interrupt,
		unlockAudio,
	}), [interrupt, playDirectly, streamReply, transcribe, unlockAudio, waitForAudio]);
};
