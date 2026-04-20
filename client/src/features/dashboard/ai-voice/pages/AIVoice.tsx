import { useCallback, useEffect, useRef, useState } from 'react';
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
	{ id: 'free-talk', label: 'Tự do' },
	{ id: 'ielts-speaking', label: 'IELTS Speaking' },
	{ id: 'travel', label: 'Du lịch' },
	{ id: 'office', label: 'Công sở' },
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

	useEffect(() => {
		if (selectedTopicId && selectedLevelId) {
			runGenerateScenarios(selectedTopicId, selectedLevelId);
		}
	}, [runGenerateScenarios, selectedLevelId, selectedTopicId]);

	const selectedScenario = generatedScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
	const canStartConversation = Boolean(selectedTopicId && selectedLevelId && selectedScenarioId && scenarioState === 'ready');

	const handleSelectTopic = (topicId: string) => {
		setSelectedTopicId(topicId);
	};

	const handleSelectLevel = (levelId: string) => {
		setSelectedLevelId(levelId);
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
							<img src={happyImage} alt="Happy mascot" className={styles.mascotImage} />
							<p className={styles.greeting}>
								Hey <span className={styles.userName}>{userDisplayName}</span>, vào đây nói chuyện một chút cho vui nè 😆
							</p>
						</div>

						<div className={styles.selectionPanel}>
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
							{scenarioState === 'ready' && (
								<ScenarioSelector
									options={generatedScenarios}
									selectedScenarioId={selectedScenarioId}
									onSelectScenario={setSelectedScenarioId}
								/>
							)}

							{scenarioState !== 'ready' && (
								<section className={styles.scenarioSection} aria-live="polite">
									<h2 className={styles.scenarioSectionTitle}>Các tình huống tạo bởi bởi AI:</h2>

									{scenarioState === 'idle' && (
										<p className={styles.scenarioHint}>Hãy chọn chủ đề và level để AI tự động sinh tình huống</p>
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
								<Button
									type="button"
									variant="primary"
									padding="B"
									className={styles.startButton}
									disabled={!canStartConversation}
									onClick={handleStartConversation}
								>
									Bắt đầu luyện nói
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
