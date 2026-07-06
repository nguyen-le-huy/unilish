import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PATHS } from '@/config/paths';
import styles from './IeltsListeningTestPage.module.css';

type AnswerMap = Record<number, string>;

const PART = { number: 1, range: '1–10', duration: 426 } as const;

const QUESTIONS = [
    'Prices range from $105 to $ ___ per room per month.',
    'The furniture is very ___.',
    'Special offer: free ___ with every living room set.',
    'The second company is ___ and Oliver.',
    'There is a 12% monthly fee for ___.',
    'Larch Furniture also supplies ___ items.',
    'Customers must have their own ___.',
    'The final company is called ___ Rentals.',
    'See the ___ for the most up-to-date prices.',
    '___ are allowed within seven days of delivery.',
];

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const IeltsListeningTestPage = () => {
    const navigate = useNavigate();
    const { testId } = useParams();
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
    const [remainingSeconds, setRemainingSeconds] = useState(12 * 60);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    const answeredCount = Object.values(answers).filter((answer) => answer.trim().length > 0).length;
    const progress = (answeredCount / 10) * 100;

    useEffect(() => {
        const timer = window.setInterval(() => setRemainingSeconds((current) => Math.max(0, current - 1)), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!isPlaying) return;
        const timer = window.setInterval(() => setAudioTime((current) => Math.min(PART.duration, current + 1)), 1000);
        return () => window.clearInterval(timer);
    }, [isPlaying]);

    const updateAnswer = (questionNumber: number, value: string) => {
        setAnswers((current) => ({ ...current, [questionNumber]: value }));
    };

    const toggleFlag = (questionNumber: number) => {
        setFlagged((current) => {
            const next = new Set(current);
            if (next.has(questionNumber)) next.delete(questionNumber);
            else next.add(questionNumber);
            return next;
        });
    };

    const goToQuestion = (questionNumber: number) => {
        document.getElementById(`question-${questionNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const submitTest = () => {
        setShowSubmitDialog(false);
        toast.success('Bài thi Listening đã được ghi nhận.');
        navigate(PATHS.DASHBOARD.IELTS_SKILL('listening'));
    };

    return (
        <main className={styles.examPage}>
            <header className={styles.topBar}>
                <div className={styles.brandBlock}>
                    <div><span>IELTS Listening</span><strong>{testId?.replace(/-/g, ' ') ?? 'Practice test'}</strong></div>
                </div>
                <div className={styles.timer} aria-label="Thời gian còn lại"><span aria-hidden="true">◷</span>{formatTime(remainingSeconds)}</div>
                <div className={styles.headerActions}>
                    <button type="button" className={styles.exitButton} onClick={() => navigate(PATHS.DASHBOARD.IELTS_SKILL('listening'))}>Thoát</button>
                    <button type="button" className={styles.submitButton} onClick={() => setShowSubmitDialog(true)}>Nộp bài</button>
                </div>
            </header>

            <div className={styles.workspace}>
                <section className={styles.contentPane}>
                    <div className={styles.contentInner}>
                        <div className={styles.partLabel}>Listening <span>Câu {PART.range}</span></div>

                        <div className={styles.audioPlayer}>
                            <button type="button" className={styles.playButton} onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}>
                                {isPlaying ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8v12.4c0 .9 1 1.4 1.7.9l8.4-6.2a1.1 1.1 0 000-1.8L9.7 4.9C9 4.4 8 4.9 8 5.8z" /></svg>
                                )}
                            </button>
                            <input className={styles.audioProgress} type="range" min={0} max={PART.duration} value={audioTime} onChange={(event) => setAudioTime(Number(event.target.value))} aria-label="Tiến độ audio" />
                            <span className={styles.audioTime}>{formatTime(audioTime)} / {formatTime(PART.duration)}</span>
                            <span className={styles.speed}>1×</span>
                        </div>

                        <div className={styles.instruction}>Write ONE WORD AND/OR A NUMBER for each answer.</div>

                        <section className={styles.completionCard}>
                            <div className={styles.completionHeading}><span>Form completion</span><h2>Furniture rental companies</h2></div>
                            <div className={styles.completionList}>
                                {QUESTIONS.map((item, index) => {
                                    const questionNumber = index + 1;
                                    const [before, after = ''] = item.split('___');
                                    return (
                                        <div className={styles.completionItem} id={`question-${questionNumber}`} key={questionNumber}>
                                            <span className={styles.questionNumber}>{questionNumber}</span>
                                            <p>{before}<input value={answers[questionNumber] ?? ''} onChange={(event) => updateAnswer(questionNumber, event.target.value)} aria-label={`Đáp án câu ${questionNumber}`} />{after}</p>
                                            <button type="button" className={flagged.has(questionNumber) ? styles.flagActive : styles.flagButton} onClick={() => toggleFlag(questionNumber)} aria-label={`Đánh dấu câu ${questionNumber}`}>⚑</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </section>

                <aside className={styles.progressPanel}>
                    <div className={styles.progressHeader}>
                        <div><span>Tiến độ</span><strong>{answeredCount}/10</strong></div>
                        <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
                    </div>
                    <div className={styles.questionNavigator}>
                        <div className={styles.navigatorPart}>
                            <span>Câu hỏi <small>({PART.range})</small></span>
                            <div className={styles.numberGrid}>
                                {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
                                    <button type="button" key={number} className={`${answers[number]?.trim() ? styles.numberAnswered : styles.numberButton} ${flagged.has(number) ? styles.numberFlagged : ''} ${styles.numberCurrentPart}`} onClick={() => goToQuestion(number)}>{number}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.legend}>
                        <span><i className={styles.answeredDot} />Đã trả lời ({answeredCount})</span>
                        <span><i className={styles.emptyDot} />Chưa trả lời ({10 - answeredCount})</span>
                        <span><i className={styles.flaggedDot} />Đánh dấu ({flagged.size})</span>
                    </div>
                </aside>
            </div>

            {showSubmitDialog && (
                <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setShowSubmitDialog(false)}>
                    <section className={styles.submitDialog} role="dialog" aria-modal="true" aria-labelledby="submit-title" onMouseDown={(event) => event.stopPropagation()}>
                        <span className={styles.dialogIcon}>✓</span><h2 id="submit-title">Xác nhận nộp bài?</h2>
                        <p>Bạn đã trả lời <strong>{answeredCount}/10 câu</strong>. Sau khi nộp, bạn sẽ không thể thay đổi đáp án.</p>
                        <div><button type="button" onClick={() => setShowSubmitDialog(false)}>Tiếp tục làm bài</button><button type="button" className={styles.confirmSubmit} onClick={submitTest}>Nộp bài ngay</button></div>
                    </section>
                </div>
            )}
        </main>
    );
};

export default IeltsListeningTestPage;
