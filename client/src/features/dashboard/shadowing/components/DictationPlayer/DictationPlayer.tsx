import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useYtPlayer } from '../../hooks/use-yt-player';
import type { Cue, ShadowingVideo } from '../../types/shadowing.types';
import styles from './DictationPlayer.module.css';

type Difficulty = 'easy' | 'normal' | 'hard';

interface DictationPlayerProps {
    video: ShadowingVideo;
}

interface StoredDictationState {
    currentIndex: number;
    answers: Record<string, string>;
    checkedCueIds: string[];
    revealedCueIds: string[];
}

const normalizeAnswer = (value: string): string => {
    return value
        .toLocaleLowerCase()
        .replace(/[“”‘’]/g, "'")
        .replace(/[^a-z0-9'\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const maskCue = (text: string, difficulty: Difficulty): string => {
    if (difficulty === 'hard') {
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        return `${wordCount} từ · không có gợi ý ký tự`;
    }

    return text.replace(/[A-Za-z0-9']+/g, (word) => {
        if (difficulty === 'easy') {
            return `${word[0] ?? ''}${'*'.repeat(Math.max(0, word.length - 1))}`;
        }
        return '*'.repeat(word.length);
    });
};

const loadStoredState = (videoId: string, cueCount: number): StoredDictationState => {
    try {
        const raw = localStorage.getItem(`unilish-dictation:${videoId}`);
        if (!raw) throw new Error('empty');
        const parsed = JSON.parse(raw) as StoredDictationState;
        return {
            currentIndex: Math.min(Math.max(0, parsed.currentIndex ?? 0), Math.max(0, cueCount - 1)),
            answers: parsed.answers ?? {},
            checkedCueIds: parsed.checkedCueIds ?? [],
            revealedCueIds: parsed.revealedCueIds ?? [],
        };
    } catch {
        return { currentIndex: 0, answers: {}, checkedCueIds: [], revealedCueIds: [] };
    }
};

const DictationPlayer = ({ video }: DictationPlayerProps) => {
    const stored = useMemo(() => loadStoredState(video.videoId, video.cues.length), [video.cues.length, video.videoId]);
    const [currentIndex, setCurrentIndex] = useState(stored.currentIndex);
    const [answers, setAnswers] = useState<Record<string, string>>(stored.answers);
    const [checkedCueIds, setCheckedCueIds] = useState<Set<string>>(() => new Set(stored.checkedCueIds));
    const [revealedCueIds, setRevealedCueIds] = useState<Set<string>>(() => new Set(stored.revealedCueIds));
    const [difficulty, setDifficulty] = useState<Difficulty>('normal');
    const [isPlaying, setIsPlaying] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const cueRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const currentCue = video.cues[currentIndex] as Cue | undefined;

    const handleCueEnd = useCallback(() => setIsPlaying(false), []);
    const player = useYtPlayer('dictation-youtube-player', video.videoId, handleCueEnd);

    useEffect(() => {
        const payload: StoredDictationState = {
            currentIndex,
            answers,
            checkedCueIds: Array.from(checkedCueIds),
            revealedCueIds: Array.from(revealedCueIds),
        };
        localStorage.setItem(`unilish-dictation:${video.videoId}`, JSON.stringify(payload));
    }, [answers, checkedCueIds, currentIndex, revealedCueIds, video.videoId]);

    useEffect(() => {
        cueRefs.current[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        inputRef.current?.focus();
    }, [currentIndex]);

    const checkedCount = checkedCueIds.size;
    const progressPercent = video.cues.length > 0 ? Math.round((checkedCount / video.cues.length) * 100) : 0;
    const currentAnswer = currentCue ? answers[currentCue.id] ?? '' : '';
    const isChecked = currentCue ? checkedCueIds.has(currentCue.id) : false;
    const isRevealed = currentCue ? revealedCueIds.has(currentCue.id) : false;
    const isCorrect = Boolean(currentCue && isChecked && normalizeAnswer(currentAnswer) === normalizeAnswer(currentCue.text));

    const playCurrent = useCallback(() => {
        if (!currentCue || !player.isReady) return;
        setIsPlaying(true);
        player.playCue(currentCue);
    }, [currentCue, player]);

    const startFromFirstCue = useCallback(() => {
        const firstCue = video.cues[0];
        if (!firstCue || !player.isReady) return;
        setCurrentIndex(0);
        setIsPlaying(true);
        player.playCue(firstCue);
    }, [player, video.cues]);

    const moveToCue = useCallback((nextIndex: number, autoPlay = false) => {
        const safeIndex = Math.min(Math.max(0, nextIndex), video.cues.length - 1);
        setCurrentIndex(safeIndex);
        setIsPlaying(false);
        player.pausePlayer();
        if (autoPlay && player.isReady) {
            window.setTimeout(() => {
                const cue = video.cues[safeIndex];
                if (cue) {
                    setIsPlaying(true);
                    player.playCue(cue);
                }
            }, 0);
        }
    }, [player, video.cues]);

    const checkCurrent = () => {
        if (!currentCue || !currentAnswer.trim()) return;
        setCheckedCueIds((current) => new Set(current).add(currentCue.id));
    };

    const revealCurrent = () => {
        if (!currentCue) return;
        setAnswers((current) => ({ ...current, [currentCue.id]: currentCue.text }));
        setCheckedCueIds((current) => new Set(current).add(currentCue.id));
        setRevealedCueIds((current) => new Set(current).add(currentCue.id));
    };

    const resetProgress = () => {
        setCurrentIndex(0);
        setAnswers({});
        setCheckedCueIds(new Set());
        setRevealedCueIds(new Set());
        player.pausePlayer();
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            checkCurrent();
        }
    };

    if (!currentCue) return <div className={styles.emptyState}>Video chưa có transcript để luyện chính tả.</div>;

    return (
        <section className={styles.dictationRoot}>
            <header className={styles.topBar}>
                <div>
                    <span className={styles.eyebrow}>Chế độ chép chính tả</span>
                    <strong>Nghe kỹ và viết lại từng câu</strong>
                </div>
                <div className={styles.progressSummary}>
                    <span>{checkedCount}/{video.cues.length} câu</span>
                    <strong>{progressPercent}%</strong>
                    <div><i style={{ width: `${progressPercent}%` }} /></div>
                </div>
            </header>

            <div className={styles.workspace}>
                <section className={styles.mediaColumn}>
                    <header><span>Video</span><em>Câu {currentIndex + 1}</em></header>
                    <div className={styles.videoFrame}>
                        <div id="dictation-youtube-player" className={styles.youtubeMount} aria-label={`Video chính tả: ${video.title}`} />
                        <div className={styles.videoBlocker} aria-hidden="true" />
                    </div>
                    <div className={styles.mediaControls}>
                        <button type="button" className={styles.playButton} onClick={startFromFirstCue} disabled={!player.isReady}>{isPlaying && currentIndex === 0 ? 'Đang phát...' : '▶ Bắt đầu'}</button>
                        <button type="button" className={styles.replayButton} onClick={playCurrent} disabled={!player.isReady}>↻ Phát lại</button>
                    </div>
                    <div className={styles.mediaHint}><span aria-hidden="true">●</span>{player.isReady ? 'Trình phát đã sẵn sàng' : 'Đang tải trình phát...'}</div>
                </section>

                <main className={styles.answerColumn}>
                    <div className={styles.answerToolbar}>
                        <div className={styles.difficultyToggle} aria-label="Độ khó">
                            {(['easy', 'normal', 'hard'] as Difficulty[]).map((item) => <button key={item} type="button" className={difficulty === item ? styles.activeDifficulty : ''} onClick={() => setDifficulty(item)}>{item === 'easy' ? 'Dễ' : item === 'normal' ? 'Vừa' : 'Khó'}</button>)}
                        </div>
                        <div className={styles.cueNavigation}>
                            <button type="button" onClick={() => moveToCue(currentIndex - 1)} disabled={currentIndex === 0} aria-label="Câu trước">←</button>
                            <button type="button" onClick={playCurrent} aria-label="Phát lại">↻</button>
                            <button type="button" onClick={() => moveToCue(currentIndex + 1)} disabled={currentIndex === video.cues.length - 1} aria-label="Câu sau">→</button>
                        </div>
                    </div>

                    <section className={styles.answerCard}>
                        <label htmlFor="dictation-answer">Gõ những gì bạn nghe được</label>
                        <div className={styles.maskedHint}>{isRevealed ? currentCue.text : maskCue(currentCue.text, difficulty)}</div>
                        <textarea id="dictation-answer" ref={inputRef} value={currentAnswer} onChange={(event) => {
                            setAnswers((current) => ({ ...current, [currentCue.id]: event.target.value }));
                            if (checkedCueIds.has(currentCue.id)) setCheckedCueIds((current) => { const next = new Set(current); next.delete(currentCue.id); return next; });
                            if (revealedCueIds.has(currentCue.id)) setRevealedCueIds((current) => { const next = new Set(current); next.delete(currentCue.id); return next; });
                        }} onKeyDown={handleInputKeyDown} placeholder="Nhập câu tiếng Anh tại đây..." rows={4} />
                        <span className={styles.shortcutHint}>Nhấn Ctrl/⌘ + Enter để kiểm tra</span>
                    </section>

                    {isChecked && (
                        <div className={`${styles.feedback} ${isCorrect && !isRevealed ? styles.correctFeedback : styles.incorrectFeedback}`} role="status">
                            <strong>{isRevealed ? 'Đã hiện đáp án' : isCorrect ? '✓ Chính xác!' : 'Chưa chính xác'}</strong>
                            {!isCorrect && <span>Đáp án: {currentCue.text}</span>}
                        </div>
                    )}

                    <div className={styles.answerActions}>
                        <button type="button" className={styles.revealButton} onClick={revealCurrent}>Hiện đáp án</button>
                        <button type="button" className={styles.checkButton} onClick={checkCurrent} disabled={!currentAnswer.trim()}>Kiểm tra</button>
                        <button type="button" className={styles.nextButton} onClick={() => moveToCue(currentIndex + 1, true)} disabled={currentIndex === video.cues.length - 1}>Tiếp theo →</button>
                    </div>
                </main>

                <aside className={styles.transcriptColumn}>
                    <header>
                        <div><span>Bản chép</span><small>{checkedCount} câu đã làm</small></div>
                        <button type="button" onClick={resetProgress}>Đặt lại</button>
                    </header>
                    <div className={styles.transcriptList}>
                        {video.cues.map((cue, index) => {
                            const checked = checkedCueIds.has(cue.id);
                            const correct = checked && normalizeAnswer(answers[cue.id] ?? '') === normalizeAnswer(cue.text);
                            return <button key={cue.id} ref={(element) => { cueRefs.current[index] = element; }} type="button" className={`${styles.transcriptItem} ${index === currentIndex ? styles.activeTranscript : ''} ${checked ? correct ? styles.correctTranscript : styles.incorrectTranscript : ''}`.trim()} onClick={() => moveToCue(index, true)}><span><b>#{index + 1}</b><em>{((cue.endMs - cue.startMs) / 1000).toFixed(1)}s</em>{checked && <i aria-hidden="true">{correct ? '✓' : '!'}</i>}</span><p>{checked ? answers[cue.id] || maskCue(cue.text, 'normal') : maskCue(cue.text, 'normal')}</p></button>;
                        })}
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default DictationPlayer;
