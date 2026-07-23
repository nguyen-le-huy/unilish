import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import translateIcon from '@/assets/icons/translate.svg';
import { Button } from '@/components/core/Button';
import type { AiVoiceAssessmentResult, AiVoiceChatMessage, AiVoiceScenario } from '../../types/ai-voice.types';
import { useAiVoiceSession } from '../../hooks/use-ai-voice-session';
import MicButton from '../mic-button/mic-button';
import styles from './chat-window.module.css';

interface ChatWindowProps {
	scenario: AiVoiceScenario;
	level: string;
	topic: string;
	topicLabel: string;
	onClose: () => void;
}

const TRANSLATION_LOADING = '__loading__';
const TRANSLATION_ERROR = '__error__';

type TranslationMap = Record<string, string>;
type SuggestionVisibilityMap = Record<string, boolean>;
type GoogleTranslateChunk = [string, ...unknown[]];

const LEVEL_LABELS: Record<string, string> = {
	'free-level': 'Tự do',
	a1: 'A1',
	a2: 'A2',
	b1: 'B1',
	b2: 'B2',
	c1: 'C1',
	c2: 'C2',
};

const STATUS_LABELS = {
	idle: 'Sẵn sàng nghe bạn nói',
	recording: 'Đang ghi âm — nhấn lại để gửi',
	processing: 'Đang nhận diện giọng nói...',
	ai_speaking: 'AI Coach đang trả lời...',
	error: 'Có lỗi xảy ra — nhấn micro để thử lại',
	ended: 'Phiên luyện tập đã kết thúc',
} as const;

interface AssessmentToastProps {
	assessment: AiVoiceAssessmentResult;
	level: string;
	onClose: () => void;
}

const AssessmentToast = ({ assessment, level, onClose }: AssessmentToastProps) => (
	<div className={styles.assessmentToastOverlay} role="presentation">
		<article className={styles.assessmentToast} role="dialog" aria-modal="true" aria-label="Phiếu nhận xét buổi luyện nói">
			<header className={styles.assessmentHeader}>
				<div>
					<span className={styles.assessmentEyebrow}>NHẬN XÉT CỦA GIÁO VIÊN AI</span>
					<h3>Đánh giá buổi luyện nói</h3>
					<p>Đối chiếu theo khung CEFR <strong>{LEVEL_LABELS[level] ?? level.toUpperCase()}</strong></p>
				</div>
				<div className={styles.overallScore}>
					<strong>{assessment.language.overallScore}</strong><span>/100</span>
					<small>Tổng quan</small>
				</div>
			</header>

			<p className={styles.teacherSummary}>{assessment.language.teacherSummary}</p>
			<p className={styles.levelAssessment}><strong>Mức độ hiện tại:</strong> {assessment.language.levelAssessment}</p>

			<div className={styles.scoreGrid}>
				<div><span>Phát âm</span><strong>{assessment.pronunciation.overallScore}</strong><small>/100</small></div>
				<div><span>Ngữ pháp</span><strong>{assessment.language.grammarScore}</strong><small>/100</small></div>
				<div><span>Từ vựng</span><strong>{assessment.language.vocabularyScore}</strong><small>/100</small></div>
				<div><span>Độ trôi chảy</span><strong>{assessment.language.fluencyScore}</strong><small>/100</small></div>
			</div>

			<div className={styles.feedbackGrid}>
				<section><h4>Phát âm</h4><p>{assessment.language.pronunciationFeedback}</p></section>
				<section><h4>Ngữ pháp</h4><p>{assessment.language.grammarFeedback}</p></section>
				<section><h4>Từ vựng</h4><p>{assessment.language.vocabularyFeedback}</p></section>
			</div>

			<div className={styles.teacherColumns}>
				<section><h4>Điểm mạnh</h4><ul>{assessment.language.strengths.map((item) => <li key={item}>{item}</li>)}</ul></section>
				<section><h4>Cần cải thiện</h4><ul>{assessment.language.improvements.map((item) => <li key={item}>{item}</li>)}</ul></section>
			</div>

			{assessment.language.corrections.length > 0 && <section className={styles.corrections}><h4>Sửa câu tiêu biểu</h4>{assessment.language.corrections.map((item) => <div key={`${item.original}-${item.corrected}`}><span>{item.original}</span><b>→</b><strong>{item.corrected}</strong><small>{item.explanation}</small></div>)}</section>}
			<button type="button" className={styles.assessmentCloseButton} onClick={onClose}>Đóng phiếu nhận xét</button>
		</article>
	</div>
);

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

const ChatWindow = ({ scenario, level, topic, topicLabel, onClose }: ChatWindowProps) => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [translationMap, setTranslationMap] = useState<TranslationMap>({});
	const [suggestionVisibilityMap, setSuggestionVisibilityMap] = useState<SuggestionVisibilityMap>({});
	const [isAssessmentDismissed, setIsAssessmentDismissed] = useState(false);

	const {
		pttStatus,
		chatMessages,
		isConversationEnded,
		assessment,
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

	const latestAssistantMessage = useMemo<AiVoiceChatMessage | null>(() => {
		for (let index = chatMessages.length - 1; index >= 0; index -= 1) {
			const message = chatMessages[index];
			if (message.role === 'assistant' && message.content.trim() && message.suggestedReply) {
				return message;
			}
		}

		return null;
	}, [chatMessages]);

	const handleSuggestReply = useCallback(() => {
		if (!latestAssistantMessage) {
			return;
		}

		setSuggestionVisibilityMap((prev) => {
			if (prev[latestAssistantMessage.id]) {
				return prev;
			}

			return {
				...prev,
				[latestAssistantMessage.id]: true,
			};
		});
	}, [latestAssistantMessage]);

	return (
		<section className={styles.chatWindow} aria-label="Phòng luyện nói giao tiếp với AI">
			<header className={styles.sessionHeader}>
				<div className={styles.sessionTitle}>
					<span className={styles.sessionEyebrow}>AI Speaking Coach</span>
					<h1>{scenario.title}</h1>
					<div className={styles.sessionBadges}>
						<span>{topicLabel}</span>
						<span>Trình độ {level === 'free-level' ? 'tự do' : level.toUpperCase()}</span>
					</div>
				</div>
				<button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Thoát phiên luyện nói">
					<span aria-hidden="true">←</span> Thoát phiên
				</button>
			</header>

			<div className={styles.workspace}>
				<aside className={styles.contextPanel}>
					<div className={styles.contextIcon} aria-hidden="true">✦</div>
					<span className={styles.contextKicker}>Tình huống luyện nói</span>
					<h2>{scenario.title}</h2>
					<p>{scenario.description}</p>
					<div className={styles.practiceTips}>
						<strong>Mẹo luyện tập</strong>
						<ul>
							<li>Trả lời bằng câu đầy đủ.</li>
							<li>Nói chậm và phát âm rõ ràng.</li>
							<li>Dùng gợi ý khi bạn cần hỗ trợ.</li>
						</ul>
					</div>
				</aside>

				<section className={styles.conversationPanel}>
					<header className={styles.conversationHeader}>
						<div className={styles.coachIdentity}>
							<span className={styles.coachAvatar} aria-hidden="true">AI</span>
							<div><strong>Unilish AI Coach</strong><span><i /> Đang trực tuyến</span></div>
						</div>
						<span className={styles.turnCount}>{chatMessages.length} lượt thoại</span>
					</header>

					<div className={styles.messageList} ref={scrollRef}>
						<div className={styles.conversationNotice}>Bắt đầu cuộc hội thoại bằng tiếng Anh</div>

						{chatMessages.length === 0 && (
							<div className={styles.emptyState}><span className={styles.loadingDots}>•••</span> AI đang chuẩn bị lời mở đầu...</div>
						)}

						{chatMessages.map((message) => {
							const isAssistant = message.role === 'assistant';
							const translation = translationMap[message.id];
							const shouldShowSuggestion = suggestionVisibilityMap[message.id] === true;

							return (
								<div key={message.id} className={isAssistant ? styles.messageRow : `${styles.messageRow} ${styles.messageRowRight}`}>
									{isAssistant && <span className={styles.messageAvatar} aria-hidden="true">AI</span>}
									<div className={styles.messageContent}>
										<span className={styles.messageAuthor}>{isAssistant ? 'AI Coach' : 'Bạn'}</span>
										<div className={isAssistant ? `${styles.messageBubble} ${styles.aiBubble}` : `${styles.messageBubble} ${styles.userBubble}`}>
											{isAssistant ? (
												<div className={styles.aiMessageWithTranslate}>
													<p className={styles.aiMessageText}>{message.content}</p>
													{message.content && (
														<button type="button" className={styles.translateButton} aria-label="Dịch tin nhắn AI" onClick={() => void handleTranslate(message)} disabled={translation === TRANSLATION_LOADING}>
															<img src={translateIcon} alt="" className={styles.translateIcon} aria-hidden="true" />
														</button>
													)}
												</div>
											) : <p className={styles.userMessageText}>{message.content}</p>}

											{isAssistant && translation === TRANSLATION_LOADING && <p className={styles.translationHint}>Đang dịch...</p>}
											{isAssistant && translation === TRANSLATION_ERROR && <p className={styles.translationError}>Không thể dịch. Vui lòng thử lại.</p>}
											{isAssistant && translation && translation !== TRANSLATION_LOADING && translation !== TRANSLATION_ERROR && (
												<div className={styles.translationBox}><p className={styles.translationLabel}>Dịch nghĩa</p><p className={styles.translationText}>{translation}</p></div>
											)}
											{isAssistant && shouldShowSuggestion && message.suggestedReply && (
												<div className={`${styles.translationBox} ${styles.suggestionBox}`}><p className={styles.translationLabel}>Bạn có thể trả lời</p><p className={styles.translationText}>{message.suggestedReply}</p></div>
											)}
										</div>
									</div>
									{!isAssistant && <span className={`${styles.messageAvatar} ${styles.userAvatar}`} aria-hidden="true">B</span>}
								</div>
							);
						})}

						{isConversationEnded && <div className={styles.endedBanner} role="status" aria-live="polite">
							<p>Cuộc hội thoại đã kết thúc. Hãy chọn tình huống mới để luyện tiếp.</p>
							{assessment ? <span>Phiếu nhận xét chi tiết đã sẵn sàng.</span> : <span>Đang chấm phát âm, ngữ pháp và từ vựng...</span>}
						</div>}
					</div>

					<footer className={styles.micControlArea}>
						<Button type="button" variant="outline" padding="B" className={styles.suggestButton} onClick={handleSuggestReply} disabled={!latestAssistantMessage?.suggestedReply}>
							<span aria-hidden="true">✦</span> Gợi ý trả lời
						</Button>
						<div className={styles.micCenter}>
							<MicButton status={pttStatus} onToggle={() => void handleToggleMic()} />
							<p>{STATUS_LABELS[pttStatus]}</p>
						</div>
						<div className={styles.audioStatus}><span aria-hidden="true">◉</span> Micro đang bật</div>
					</footer>
				</section>
			</div>
			{assessment && !isAssessmentDismissed && <AssessmentToast assessment={assessment} level={level} onClose={() => setIsAssessmentDismissed(true)} />}
		</section>
	);
};

export default ChatWindow;
