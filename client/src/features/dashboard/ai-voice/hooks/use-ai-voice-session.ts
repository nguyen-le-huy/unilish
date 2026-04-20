import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AiVoiceChatMessage, AiVoiceScenario, ChatHistoryItem, PttStatus } from '../types/ai-voice.types';
import { useAiVoicePipeline } from './use-ai-voice-pipeline';
import { usePttRecorder } from './use-ptt-recorder';

interface UseAiVoiceSessionParams {
	scenario: AiVoiceScenario;
	level: string;
	topic: string;
	onConversationEnd?: () => void;
}

interface UseAiVoiceSessionReturn {
	pttStatus: PttStatus;
	chatMessages: AiVoiceChatMessage[];
	isConversationEnded: boolean;
	sessionId: string;
	startSession: () => Promise<void>;
	handleToggleMic: () => Promise<void>;
	resetSession: () => void;
}

const createSessionId = (): string => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createMessage = (role: 'assistant' | 'user', content: string): AiVoiceChatMessage => ({
	id: createSessionId(),
	role,
	content,
	createdAt: Date.now(),
});

const toHistory = (messages: AiVoiceChatMessage[]): ChatHistoryItem[] => {
	return messages.map((message) => ({
		role: message.role,
		content: message.content,
	}));
};

const isAbortLikeError = (error: unknown): boolean => {
	if (error instanceof DOMException && error.name === 'AbortError') {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	const normalizedName = error.name.toLowerCase();
	const normalizedMessage = error.message.toLowerCase();
	return normalizedName === 'aborterror'
		|| normalizedMessage.includes('signal is aborted')
		|| normalizedMessage.includes('aborted')
		|| normalizedMessage.includes('canceled')
		|| normalizedMessage.includes('cancelled');
};

const CONVERSATION_END_UI_DELAY_MS = 320;

export const useAiVoiceSession = ({
	scenario,
	level,
	topic,
	onConversationEnd,
}: UseAiVoiceSessionParams): UseAiVoiceSessionReturn => {
	const [pttStatus, setPttStatus] = useState<PttStatus>('idle');
	const [chatMessages, setChatMessages] = useState<AiVoiceChatMessage[]>([]);
	const [isConversationEnded, setIsConversationEnded] = useState(false);
	const [sessionId, setSessionId] = useState(createSessionId);

	const { startRecording, stopRecording, reset: resetRecorder } = usePttRecorder();
	const {
		transcribe,
		streamReply,
		playDirectly,
		waitForAudio,
		interrupt,
		unlockAudio,
	} = useAiVoicePipeline();

	const messagesRef = useRef<AiVoiceChatMessage[]>([]);
	const isProcessingRef = useRef(false);
	const hasSessionStartedRef = useRef(false);
	const hasNotifiedConversationEndedRef = useRef(false);

	useEffect(() => {
		messagesRef.current = chatMessages;
	}, [chatMessages]);

	const markConversationEnded = useCallback(() => {
		setIsConversationEnded(true);
		setPttStatus('ended');
		if (!hasNotifiedConversationEndedRef.current) {
			hasNotifiedConversationEndedRef.current = true;
			onConversationEnd?.();
		}
	}, [onConversationEnd]);

	const streamAssistantReply = useCallback(async (
		assistantMessageId: string,
		transcript: string,
		history: ChatHistoryItem[],
	): Promise<void> => {
		const llm = await streamReply({
			sessionId,
			scenario,
			level,
			topic,
			transcript,
			chatHistory: history,
			onChunk: (chunk) => {
				setChatMessages((prev) => prev.map((message) => {
					if (message.id !== assistantMessageId) {
						return message;
					}

					return {
						...message,
						content: `${message.content}${chunk}`,
					};
				}));
			},
			onAudioStart: () => {
				setPttStatus('ai_speaking');
			},
		});

		if (!llm.reply.trim()) {
			const fallbackReply = 'It was nice talking with you!';
			setChatMessages((prev) => prev.map((message) => {
				if (message.id !== assistantMessageId) {
					return message;
				}

				return {
					...message,
					content: fallbackReply,
				};
			}));
			setPttStatus('ai_speaking');
			await playDirectly(fallbackReply);
		}

		await waitForAudio();

		if (llm.isConversationEnded) {
			await new Promise<void>((resolve) => {
				globalThis.setTimeout(() => resolve(), CONVERSATION_END_UI_DELAY_MS);
			});
			markConversationEnded();
			return;
		}

		setPttStatus('idle');
	}, [level, markConversationEnded, playDirectly, scenario, sessionId, streamReply, topic, waitForAudio]);

	const processTurn = useCallback(async (audioBlob: Blob): Promise<void> => {
		if (isProcessingRef.current || isConversationEnded) {
			return;
		}

		isProcessingRef.current = true;
		setPttStatus('processing');

		try {
			const stt = await transcribe(audioBlob, sessionId);
			const userMessage = createMessage('user', stt.transcript);
			const nextHistory: ChatHistoryItem[] = [...toHistory(messagesRef.current), { role: 'user', content: stt.transcript }];

			setChatMessages((prev) => [...prev, userMessage]);

			const assistantMessage = createMessage('assistant', '');
			setChatMessages((prev) => [...prev, assistantMessage]);

			await streamAssistantReply(assistantMessage.id, stt.transcript, nextHistory);
		} catch (error) {
			if (isAbortLikeError(error)) {
				if (!isConversationEnded) {
					setPttStatus('idle');
				}
				return;
			}

			const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý lượt nói.';
			setPttStatus('error');
			toast.error(message);
		} finally {
			isProcessingRef.current = false;
		}
	}, [isConversationEnded, sessionId, streamAssistantReply, transcribe]);

	const startSession = useCallback(async (): Promise<void> => {
		if (hasSessionStartedRef.current || isConversationEnded) {
			return;
		}

		hasSessionStartedRef.current = true;
		unlockAudio();
		setPttStatus('processing');

		try {
			const assistantMessage = createMessage('assistant', '');
			setChatMessages([assistantMessage]);
			await streamAssistantReply(assistantMessage.id, '__START__', []);
		} catch (error) {
			if (isAbortLikeError(error)) {
				hasSessionStartedRef.current = false;
				if (!isConversationEnded) {
					setPttStatus('idle');
				}
				return;
			}

			hasSessionStartedRef.current = false;
			setPttStatus('error');
			const message = error instanceof Error ? error.message : 'Không thể bắt đầu phiên hội thoại AI Voice.';
			toast.error(message);
		}
	}, [isConversationEnded, streamAssistantReply, unlockAudio]);

	const handleToggleMic = useCallback(async (): Promise<void> => {
		if (pttStatus === 'processing' || pttStatus === 'ai_speaking' || pttStatus === 'ended') {
			return;
		}

		if (pttStatus === 'idle' || pttStatus === 'error') {
			const started = await startRecording();
			if (started) {
				setPttStatus('recording');
			}
			return;
		}

		if (pttStatus === 'recording') {
			const result = await stopRecording();
			if (!result) {
				setPttStatus('idle');
				return;
			}

			await processTurn(result.blob);
		}
	}, [processTurn, pttStatus, startRecording, stopRecording]);

	const resetSession = useCallback(() => {
		resetRecorder();
		interrupt();

		isProcessingRef.current = false;
		hasSessionStartedRef.current = false;
		hasNotifiedConversationEndedRef.current = false;
		messagesRef.current = [];

		setChatMessages([]);
		setIsConversationEnded(false);
		setPttStatus('idle');
		setSessionId(createSessionId());
	}, [interrupt, resetRecorder]);

	useEffect(() => {
		return () => {
			resetRecorder();
			interrupt();
		};
	}, [interrupt, resetRecorder]);

	return useMemo(() => ({
		pttStatus,
		chatMessages,
		isConversationEnded,
		sessionId,
		startSession,
		handleToggleMic,
		resetSession,
	}), [chatMessages, handleToggleMic, isConversationEnded, pttStatus, resetSession, sessionId, startSession]);
};
