import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import happyImage from '@/assets/images/happy.svg';
import { Loading } from '@/components/common/Loading/Loading';
import { Button } from '@/components/core/Button';
import { useAuthStore } from '@/stores/auth.store';
import type { AiVoiceScenario } from '../types/ai-voice.types';
import { useGenerateScenarios } from '../hooks/use-generate-scenarios';
import ChatWindow from '../components/chat-window/chat-window';
import LevelSelector from '../components/level-selector/level-selector';
import ScenarioSelector from '../components/scenario-selector/scenario-selector';
import TopicSelector from '../components/topic-selector/topic-selector';
import styles from './AIVoice.module.css';

const TOPIC_OPTIONS = [
	{ id: 'free-talk', label: 'Trò chuyện tự do', description: 'Nói về bất kỳ điều gì bạn thích', icon: '✦' },
	{ id: 'ielts-speaking', label: 'IELTS Speaking', description: 'Luyện phản xạ theo chủ đề IELTS', icon: '◎' },
	{ id: 'travel', label: 'Du lịch', description: 'Giao tiếp trong các chuyến đi', icon: '⌖' },
	{ id: 'office', label: 'Công sở', description: 'Tình huống chuyên nghiệp hằng ngày', icon: '▣' },
];

const LEVEL_OPTIONS = [
	{ id: 'free-level', label: 'Tự do' },
	{ id: 'a1', label: 'A1' },
	{ id: 'a2', label: 'A2' },
	{ id: 'b1', label: 'B1' },
	{ id: 'b2', label: 'B2' },
	{ id: 'c1', label: 'C1' },
	{ id: 'c2', label: 'C2' },
];

const ERROR_GENERATE_SCENARIOS = 'Không thể tạo tình huống. Vui lòng thử lại.';

type ScenarioState = 'idle' | 'loading' | 'ready' | 'error';

const AIVoice = () => {
	const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
	const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
	const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
	const [generatedScenarios, setGeneratedScenarios] = useState<AiVoiceScenario[]>([]);
	const [scenarioState, setScenarioState] = useState<ScenarioState>('idle');
	const [isChatWindowVisible, setIsChatWindowVisible] = useState<boolean>(false);

	const user = useAuthStore((state) => state.user);
	const { mutate: generateScenarios } = useGenerateScenarios();
	const generationRequestIdRef = useRef(0);

	const userDisplayName = (() => {
		const fullName = user?.fullName?.trim() ?? '';
		if (fullName) {
			return fullName;
		}

		const email = user?.email?.trim() ?? '';
		if (!email) {
			return 'User';
		}

		const localPart = email.split('@')[0]?.trim() ?? '';
		return localPart || 'User';
	})();

	const runGenerateScenarios = useCallback((topicId: string, levelId: string) => {
		const requestId = generationRequestIdRef.current + 1;
		generationRequestIdRef.current = requestId;

		setScenarioState('loading');
		setGeneratedScenarios([]);
		setSelectedScenarioId(null);
		setIsChatWindowVisible(false);

		generateScenarios(
			{ topic: topicId, level: levelId },
			{
				onSuccess: (data) => {
					if (requestId !== generationRequestIdRef.current) {
						return;
					}

					setGeneratedScenarios(data);
					setScenarioState('ready');
				},
				onError: () => {
					if (requestId !== generationRequestIdRef.current) {
						return;
					}

					setScenarioState('error');
					toast.error(ERROR_GENERATE_SCENARIOS);
				},
			},
		);
	}, [generateScenarios]);

	const selectedScenario = generatedScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
	const canStartConversation = Boolean(selectedTopicId && selectedLevelId && selectedScenarioId && scenarioState === 'ready');

	const handleSelectTopic = (topicId: string) => {
		setSelectedTopicId(topicId);
		if (selectedLevelId) {
			runGenerateScenarios(topicId, selectedLevelId);
		}
	};

	const handleSelectLevel = (levelId: string) => {
		setSelectedLevelId(levelId);
		if (selectedTopicId) {
			runGenerateScenarios(selectedTopicId, levelId);
		}
	};

	const handleRetryGenerateScenarios = () => {
		if (!selectedTopicId || !selectedLevelId) {
			return;
		}

		runGenerateScenarios(selectedTopicId, selectedLevelId);
	};

	const handleStartConversation = () => {
		if (!canStartConversation || !selectedScenario) {
			return;
		}

		setIsChatWindowVisible(true);
	};

	const handleCloseConversation = () => {
		setIsChatWindowVisible(false);
	};

	return (
		<section className={styles.aiVoicePage}>
			<div className={isChatWindowVisible ? `${styles.content} ${styles.chatModeContent}` : styles.content}>
				{!isChatWindowVisible && (
					<>
						<div className={styles.heroSection}>
							<div className={styles.heroCopy}>
								<span className={styles.eyebrow}>AI Speaking Coach</span>
								<h1>Luyện nói tự nhiên,<br />tự tin hơn mỗi ngày.</h1>
								<p className={styles.greeting}>
									Chào <span className={styles.userName}>{userDisplayName}</span>, hãy chọn một tình huống và bắt đầu cuộc hội thoại bằng tiếng Anh.
								</p>
								<div className={styles.heroBenefits}>
									<span><i>✓</i> Hội thoại theo trình độ</span>
									<span><i>✓</i> Phản hồi tức thì</span>
									<span><i>✓</i> Luyện tập không giới hạn</span>
								</div>
							</div>

							<div className={styles.coachCard}>
								<div className={styles.coachTop}>
									<span className={styles.onlineDot} />
									<span>AI Coach đang sẵn sàng</span>
								</div>
								<img src={happyImage} alt="Trợ lý luyện nói AI" className={styles.mascotImage} />
								<div className={styles.coachMessage}>
									<span className={styles.quoteMark}>“</span>
									<p>Let&apos;s practice together.<br />You&apos;ve got this!</p>
								</div>
							</div>
						</div>

						<div className={styles.selectionPanel}>
							<header className={styles.panelHeader}>
								<div>
									<span className={styles.panelKicker}>Thiết lập buổi luyện</span>
									<h2>Tạo cuộc hội thoại phù hợp với bạn</h2>
								</div>
								<div className={styles.setupProgress} aria-label="Tiến trình thiết lập">
									<span className={selectedTopicId ? styles.stepDone : styles.stepActive}>1</span>
									<i />
									<span className={selectedLevelId ? styles.stepDone : selectedTopicId ? styles.stepActive : ''}>2</span>
									<i />
									<span className={selectedScenarioId ? styles.stepDone : selectedLevelId ? styles.stepActive : ''}>3</span>
								</div>
							</header>

							<div className={styles.selectorGrid}>
							<TopicSelector
								options={TOPIC_OPTIONS}
								selectedTopicId={selectedTopicId}
								onSelectTopic={handleSelectTopic}
							/>
							<LevelSelector
								options={LEVEL_OPTIONS}
								selectedLevelId={selectedLevelId}
								onSelectLevel={handleSelectLevel}
							/>
							</div>
							{scenarioState === 'ready' && (
								<ScenarioSelector
									options={generatedScenarios}
									selectedScenarioId={selectedScenarioId}
									onSelectScenario={setSelectedScenarioId}
								/>
							)}

							{scenarioState !== 'ready' && (
								<section className={styles.scenarioSection} aria-live="polite">
									<div className={styles.scenarioHeading}>
										<span className={styles.sectionNumber}>3</span>
										<div>
											<h2 className={styles.scenarioSectionTitle}>Chọn tình huống hội thoại</h2>
											<p>AI sẽ tạo các ngữ cảnh phù hợp với lựa chọn của bạn.</p>
										</div>
									</div>

									{scenarioState === 'idle' && (
										<div className={styles.scenarioPlaceholder}>
											<span aria-hidden="true">✦</span>
											<div>
												<strong>Tình huống sẽ xuất hiện tại đây</strong>
												<p className={styles.scenarioHint}>Hoàn thành chủ đề và trình độ để AI bắt đầu đề xuất.</p>
											</div>
										</div>
									)}

									{scenarioState === 'loading' && (
										<div className={styles.scenarioLoading} role="status">
											<Loading variant="inline" size="sm" className={styles.inlineLoading} />
											<p className={styles.scenarioHint}>AI đang tạo tình huống...</p>
										</div>
									)}

									{scenarioState === 'error' && (
										<div className={styles.scenarioError}>
											<p className={styles.scenarioHint}>{ERROR_GENERATE_SCENARIOS}</p>
											<Button
												type="button"
												variant="outline"
												padding="B"
												className={styles.retryButton}
												onClick={handleRetryGenerateScenarios}
											>
												Thử lại
											</Button>
										</div>
									)}
								</section>
							)}

							<div className={styles.actionRow}>
								<div className={styles.actionHint}>
									<span aria-hidden="true">◉</span>
									Cuộc hội thoại sử dụng micro và kéo dài khoảng 5–10 phút
								</div>
								<Button
									type="button"
									variant="primary"
									padding="B"
									className={styles.startButton}
									disabled={!canStartConversation}
									onClick={handleStartConversation}
								>
									Bắt đầu luyện nói <span aria-hidden="true">→</span>
								</Button>
							</div>
						</div>
					</>
				)}

				{isChatWindowVisible && selectedScenario && selectedTopicId && selectedLevelId && (
					<ChatWindow
						scenario={selectedScenario}
						level={selectedLevelId}
						topic={selectedTopicId}
						onClose={handleCloseConversation}
					/>
				)}
			</div>
		</section>
	);
};

export default AIVoice;
