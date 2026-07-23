import { useState } from 'react';
import happyImage from '@/assets/images/happy.svg';
import { Loading } from '@/components/common/Loading/Loading';
import { Button } from '@/components/core/Button';
import { useAuthStore } from '@/stores/auth.store';
import { useAiVoiceCatalog } from '../hooks/use-ai-voice-catalog';
import ChatWindow from '../components/chat-window/chat-window';
import LevelSelector from '../components/level-selector/level-selector';
import ScenarioSelector from '../components/scenario-selector/scenario-selector';
import TopicSelector from '../components/topic-selector/topic-selector';
import styles from './AIVoice.module.css';

const LEVEL_OPTIONS = [
	{ id: 'free-level', label: 'Tự do' },
	{ id: 'a1', label: 'A1' },
	{ id: 'a2', label: 'A2' },
	{ id: 'b1', label: 'B1' },
	{ id: 'b2', label: 'B2' },
	{ id: 'c1', label: 'C1' },
	{ id: 'c2', label: 'C2' },
];

const AIVoice = () => {
	const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
	const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
	const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
	const [isChatWindowVisible, setIsChatWindowVisible] = useState<boolean>(false);

	const user = useAuthStore((state) => state.user);
	const { data: topics = [], isLoading: isCatalogLoading, isError: isCatalogError, refetch } = useAiVoiceCatalog();
	const topicOptions = topics.map((topic) => ({
		id: topic.slug,
		label: topic.title,
		description: topic.description,
		icon: topic.icon,
	}));
	const selectedTopic = topics.find((topic) => topic.slug === selectedTopicId) ?? null;
	const availableScenarios = selectedTopic?.scenarios ?? [];

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

	const selectedScenario = availableScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null;
	const canStartConversation = Boolean(selectedTopicId && selectedLevelId && selectedScenarioId);

	const handleSelectTopic = (topicId: string) => {
		setSelectedTopicId(topicId);
		setSelectedScenarioId(null);
		setIsChatWindowVisible(false);
	};

	const handleSelectLevel = (levelId: string) => {
		setSelectedLevelId(levelId);
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
								options={topicOptions}
								selectedTopicId={selectedTopicId}
								onSelectTopic={handleSelectTopic}
							/>
							<LevelSelector
								options={LEVEL_OPTIONS}
								selectedLevelId={selectedLevelId}
								onSelectLevel={handleSelectLevel}
							/>
							</div>
							{selectedTopic && availableScenarios.length > 0 && (
								<ScenarioSelector
									options={availableScenarios}
									selectedScenarioId={selectedScenarioId}
									onSelectScenario={setSelectedScenarioId}
								/>
							)}

							{(!selectedTopic || availableScenarios.length === 0) && (
								<section className={styles.scenarioSection} aria-live="polite">
									<div className={styles.scenarioHeading}>
										<span className={styles.sectionNumber}>3</span>
										<div>
											<h2 className={styles.scenarioSectionTitle}>Chọn tình huống hội thoại</h2>
											<p>Các tình huống được quản trị viên biên soạn và phê duyệt.</p>
										</div>
									</div>

									{!isCatalogLoading && !isCatalogError && (
										<div className={styles.scenarioPlaceholder}>
											<span aria-hidden="true">✦</span>
											<div>
												<strong>{selectedTopic ? 'Chủ đề này chưa có tình huống' : 'Tình huống sẽ xuất hiện tại đây'}</strong>
												<p className={styles.scenarioHint}>{selectedTopic ? 'Vui lòng chọn chủ đề khác.' : 'Chọn một chủ đề để xem các tình huống đã được duyệt.'}</p>
											</div>
										</div>
									)}

									{isCatalogLoading && (
										<div className={styles.scenarioLoading} role="status">
											<Loading variant="inline" size="sm" className={styles.inlineLoading} />
											<p className={styles.scenarioHint}>Đang tải danh sách tình huống...</p>
										</div>
									)}

									{isCatalogError && (
										<div className={styles.scenarioError}>
											<p className={styles.scenarioHint}>Không thể tải danh sách chủ đề và tình huống.</p>
											<Button
												type="button"
												variant="outline"
												padding="B"
												className={styles.retryButton}
												onClick={() => void refetch()}
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
						topicLabel={selectedTopic?.title ?? selectedTopicId}
						onClose={handleCloseConversation}
					/>
				)}
			</div>
		</section>
	);
};

export default AIVoice;
