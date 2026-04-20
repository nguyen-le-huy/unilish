import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import closeIcon from '@/assets/icons/close.svg';
import translateIcon from '@/assets/icons/translate.svg';
import type { AiVoiceChatMessage, AiVoiceScenario } from '../../types/ai-voice.types';
import { useAiVoiceSession } from '../../hooks/use-ai-voice-session';
import MicButton from '../mic-button/mic-button';
import styles from './chat-window.module.css';

interface ChatWindowProps {
	scenario: AiVoiceScenario;
	level: string;
	topic: string;
	onClose: () => void;
}

const TRANSLATION_LOADING = '__loading__';
const TRANSLATION_ERROR = '__error__';

type TranslationMap = Record<string, string>;
type GoogleTranslateChunk = [string, ...unknown[]];

const translateToVietnamese = async (text: string): Promise<string> => {
	const query = encodeURIComponent(text);
	const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${query}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Translation failed');
	}

	const data = await response.json() as unknown;
	if (!Array.isArray(data) || !Array.isArray(data[0])) {
		throw new Error('Unexpected translation payload');
	}

	const chunks = data[0].filter((chunk): chunk is GoogleTranslateChunk => {
		return Array.isArray(chunk) && typeof chunk[0] === 'string';
	});

	return chunks.map((chunk) => chunk[0]).join('');
};

const ChatWindow = ({ scenario, level, topic, onClose }: ChatWindowProps) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [translationMap, setTranslationMap] = useState<TranslationMap>({});

	const {
		pttStatus,
		chatMessages,
		isConversationEnded,
		handleToggleMic,
		startSession,
		resetSession,
	} = useAiVoiceSession({
		scenario,
		level,
		topic,
	});

	useEffect(() => {
		void startSession();
	}, [startSession]);

	useEffect(() => {
		return () => {
			resetSession();
		};
	}, [resetSession]);

	useLayoutEffect(() => {
		const container = scrollRef.current;
		if (!container) {
			return;
		}

		requestAnimationFrame(() => {
			container.scrollTop = container.scrollHeight;
		});
	}, [chatMessages, isConversationEnded]);

	const handleClose = () => {
		resetSession();
		onClose();
	};

	const handleTranslate = async (message: AiVoiceChatMessage) => {
		if (!message.content || translationMap[message.id]) {
			return;
		}

		setTranslationMap((prev) => ({ ...prev, [message.id]: TRANSLATION_LOADING }));
		try {
			const translated = await translateToVietnamese(message.content);
			setTranslationMap((prev) => ({ ...prev, [message.id]: translated }));
		} catch {
			setTranslationMap((prev) => ({ ...prev, [message.id]: TRANSLATION_ERROR }));
		}
	};

	return (
		<section className={styles.chatWindow} aria-label="AI voice chat window">
			<div className={styles.closeRow}>
				<button type="button" className={styles.closeButton} aria-label="Đóng chat" onClick={handleClose}>
					<img src={closeIcon} alt="" className={styles.closeIcon} aria-hidden="true" />
				</button>
			</div>

			<div className={styles.messageList} ref={scrollRef}>
				<div className={styles.messageRow}>
					<div className={`${styles.messageBubble} ${styles.systemInfoBubble}`}>
						<p className={styles.systemInfoLabel}>Tình huống luyện nói</p>
						<p className={styles.aiMessageText}>{scenario.description}</p>
					</div>
				</div>

				{chatMessages.length === 0 && (
					<p className={styles.emptyState}>AI đang chuẩn bị lời mở đầu...</p>
				)}

				{chatMessages.map((message) => {
					const isAssistant = message.role === 'assistant';
					const translation = translationMap[message.id];

					return (
						<div
							key={message.id}
							className={isAssistant ? styles.messageRow : `${styles.messageRow} ${styles.messageRowRight}`}
						>
							<div className={isAssistant ? `${styles.messageBubble} ${styles.aiBubble}` : `${styles.messageBubble} ${styles.userBubble}`}>
								{isAssistant ? (
									<div className={styles.aiMessageWithTranslate}>
										<p className={styles.aiMessageText}>{message.content}</p>
										{message.content && (
											<button
												type="button"
												className={styles.translateButton}
												aria-label="Dịch tin nhắn AI"
												onClick={() => void handleTranslate(message)}
												disabled={translation === TRANSLATION_LOADING}
											>
												<img src={translateIcon} alt="" className={styles.translateIcon} aria-hidden="true" />
											</button>
										)}
									</div>
								) : (
									<p className={styles.userMessageText}>{message.content}</p>
								)}

								{isAssistant && translation === TRANSLATION_LOADING && (
									<p className={styles.translationHint}>Đang dịch...</p>
								)}
								{isAssistant && translation === TRANSLATION_ERROR && (
									<p className={styles.translationError}>Không thể dịch. Vui lòng thử lại.</p>
								)}
								{isAssistant && translation && translation !== TRANSLATION_LOADING && translation !== TRANSLATION_ERROR && (
									<div className={styles.translationBox}>
										<p className={styles.translationLabel}>Dịch nghĩa:</p>
										<p className={styles.translationText}>{translation}</p>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{isConversationEnded && (
				<div className={styles.endedBanner} role="status" aria-live="polite">
					Cuộc hội thoại đã kết thúc. Bạn có thể chọn tình huống mới để luyện tiếp.
				</div>
			)}

			<div className={styles.micControlArea}>
				<MicButton status={pttStatus} onToggle={() => void handleToggleMic()} />
			</div>
		</section>
	);
};

export default ChatWindow;
