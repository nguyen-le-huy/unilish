import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PATHS } from '@/config/paths';
import styles from './IeltsReadingTestPage.module.css';

type AnswerMap = Record<number, string>;

const STATEMENTS = [
    'There are other parrots that share the kākāpō’s inability to fly.',
    'Adult kākāpō produce chicks every year.',
    'Adult male kākāpō bring food back to nesting females.',
    'The Polynesian rat was a greater threat to the kākāpō than Polynesian settlers.',
    'Richard Henry successfully protected the birds on Resolution Island.',
    'The Recovery Plan increased support for struggling young birds.',
];

const NOTES = [
    'The diet consists of fern fronds, tree bark and ___.',
    'Nests are created in ___ where eggs are laid.',
    'The ___ of the kākāpō were used to make clothes.',
    'European settlers introduced ___ which ate the birds’ food sources.',
    'A female kākāpō was sighted on Rakiura Island in ___.',
    'The Recovery Plan included an increase in ___.',
    'The plan aims to maintain the involvement of ___ in kākāpō protection.',
];

const PASSAGE = [
    'The kākāpō is a nocturnal, flightless parrot that is critically endangered and one of New Zealand’s unique treasures.',
    'The kākāpō, also known as the owl parrot, is a large, forest-dwelling bird with a pale owl-like face. Up to 64 cm in length, it has predominantly yellow-green feathers, forward-facing eyes, a large grey beak, large blue feet, relatively short wings and tail. It is the world’s only flightless parrot and is possibly one of the world’s longest-living birds, with a reported lifespan of up to 100 years.',
    'Kākāpō are solitary birds and tend to occupy the same home range for many years. They forage on the ground and climb high into trees. They often leap from trees and flap their wings, but at best manage a controlled descent to the ground. They are entirely vegetarian, with their diet including leaves, roots, bark, bulbs and fern fronds.',
    'Kākāpō breed in summer and autumn, but only in years when food is plentiful. Males play no part in incubation or chick-rearing – females alone incubate eggs and feed the chicks. The eggs are laid in soil which is repeatedly turned over before and during incubation. The female has to spend long periods away from the nest searching for food, leaving the unattended eggs and chicks vulnerable to predators.',
    'Before humans arrived, kākāpō were common throughout New Zealand’s forests. The first Polynesian settlers arrived about 700 years ago and hunted the flightless bird for food and feathers. With them came dogs and rats which also preyed on kākāpō. Later European colonisation brought forest clearance and introduced species such as deer, cats and stoats, placing the remaining population in serious trouble.',
    'In 1894, the New Zealand government launched its first attempt to save the kākāpō. Conservationist Richard Henry relocated several hundred birds to predator-free Resolution Island. Unfortunately, stoats arrived within six years and eventually destroyed the island population. By the mid-1900s, the kākāpō was practically a lost species.',
    'From 1949 to 1973, the New Zealand Wildlife Service made more than 60 expeditions to find kākāpō. A small number were caught, but the absence of females made recovery difficult. A breakthrough came when a previously unknown population, including females, was discovered on Rakiura Island.',
    'The Kākāpō Recovery Plan now combines intensive monitoring, supplementary feeding and veterinary care. Young birds that struggle are hand-reared when necessary. The programme also works closely with local communities and Māori groups, whose continued involvement remains central to protecting the species.',
];

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

const IeltsReadingTestPage = () => {
    const navigate = useNavigate();
    const { testId } = useParams();
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
    const [remainingSeconds, setRemainingSeconds] = useState(60 * 60);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;

    useEffect(() => {
        const timer = window.setInterval(() => setRemainingSeconds((current) => Math.max(0, current - 1)), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const updateAnswer = (number: number, value: string) => {
        setAnswers((current) => ({ ...current, [number]: value }));
    };

    const toggleFlag = (number: number) => {
        setFlagged((current) => {
            const next = new Set(current);
            if (next.has(number)) next.delete(number);
            else next.add(number);
            return next;
        });
    };

    const goToQuestion = (number: number) => {
        document.getElementById(`reading-question-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const submit = () => {
        setShowSubmitDialog(false);
        toast.success('Bài thi Reading Part 1 đã được ghi nhận.');
        navigate(PATHS.DASHBOARD.IELTS_SKILL('reading'));
    };

    return (
        <main className={styles.examPage}>
            <header className={styles.topBar}>
                <div className={styles.testTitle}>
                    <span>IELTS Reading · Part 1</span>
                    <strong>{testId?.replace(/-/g, ' ') ?? 'Reading practice test'}</strong>
                </div>
                <div className={styles.timer}><span aria-hidden="true">◷</span>{formatTime(remainingSeconds)}</div>
                <div className={styles.headerActions}>
                    <button type="button" onClick={() => navigate(PATHS.DASHBOARD.IELTS_SKILL('reading'))}>Thoát</button>
                    <button type="button" className={styles.submitButton} onClick={() => setShowSubmitDialog(true)}>Nộp bài</button>
                </div>
            </header>

            <nav className={styles.partBar} aria-label="Phần thi Reading">
                <span>Part 1</span><small>{answeredCount}/13</small>
            </nav>

            <div className={styles.workspace}>
                <article className={styles.passagePane}>
                    <div className={styles.paneHeading}><span>Reading · Part 1</span><h1>The kākāpō</h1></div>
                    <div className={styles.passageText}>{PASSAGE.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                </article>

                <section className={styles.questionsPane}>
                    <div className={styles.instruction}>
                        <p>Do the following statements agree with the information given in Reading Passage 1?</p>
                        <span>Choose <strong>TRUE</strong>, <strong>FALSE</strong> or <strong>NOT GIVEN</strong>.</span>
                    </div>

                    <div className={styles.statementList}>
                        {STATEMENTS.map((statement, index) => {
                            const number = index + 1;
                            return (
                                <article className={styles.questionCard} id={`reading-question-${number}`} key={number}>
                                    <div className={styles.questionHeader}>
                                        <span className={styles.questionNumber}>{number}</span>
                                        <button type="button" className={flagged.has(number) ? styles.flagActive : styles.flagButton} onClick={() => toggleFlag(number)}>⚑ Đánh dấu</button>
                                    </div>
                                    <h2>{statement}</h2>
                                    <div className={styles.choiceRow}>
                                        {['TRUE', 'FALSE', 'NOT GIVEN'].map((choice) => (
                                            <label className={answers[number] === choice ? styles.choiceSelected : styles.choice} key={choice}>
                                                <input type="radio" name={`reading-${number}`} value={choice} checked={answers[number] === choice} onChange={() => updateAnswer(number, choice)} />
                                                {choice}
                                            </label>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className={styles.instruction}><p>Complete the notes below.</p><span>Choose <strong>ONE WORD AND/OR A NUMBER</strong> from the passage for each answer.</span></div>
                    <section className={styles.notesCard}>
                        <h2>New Zealand’s kākāpō</h2>
                        {NOTES.map((note, index) => {
                            const number = index + 7;
                            const [before, after = ''] = note.split('___');
                            return (
                                <div className={styles.noteItem} id={`reading-question-${number}`} key={number}>
                                    <span className={styles.questionNumber}>{number}</span>
                                    <p>{before}<input value={answers[number] ?? ''} onChange={(event) => updateAnswer(number, event.target.value)} aria-label={`Đáp án câu ${number}`} />{after}</p>
                                    <button type="button" className={flagged.has(number) ? styles.flagActive : styles.flagButton} onClick={() => toggleFlag(number)}>⚑</button>
                                </div>
                            );
                        })}
                    </section>
                </section>

                <aside className={styles.progressPanel}>
                    <div className={styles.progressHeader}>
                        <div><span>Tiến độ</span><strong>{answeredCount}/13</strong></div>
                        <div className={styles.progressTrack}><span style={{ width: `${(answeredCount / 13) * 100}%` }} /></div>
                    </div>
                    <div className={styles.navigator}>
                        <span>Part 1 <small>(1–13)</small></span>
                        <div>{Array.from({ length: 13 }, (_, index) => index + 1).map((number) => (
                            <button
                                type="button"
                                key={number}
                                className={`${answers[number]?.trim() ? styles.numberAnswered : styles.numberButton} ${flagged.has(number) ? styles.numberFlagged : ''}`}
                                onClick={() => goToQuestion(number)}
                            >{number}</button>
                        ))}</div>
                    </div>
                    <div className={styles.legend}>
                        <span><i className={styles.answeredDot} />Đã trả lời ({answeredCount})</span>
                        <span><i className={styles.emptyDot} />Chưa trả lời ({13 - answeredCount})</span>
                        <span><i className={styles.flaggedDot} />Đánh dấu ({flagged.size})</span>
                    </div>
                </aside>
            </div>

            {showSubmitDialog && (
                <div className={styles.modalBackdrop} onMouseDown={() => setShowSubmitDialog(false)}>
                    <section className={styles.submitDialog} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                        <span>✓</span><h2>Xác nhận nộp bài?</h2>
                        <p>Bạn đã hoàn thành <strong>{answeredCount}/13 câu</strong> của Reading Part 1.</p>
                        <div><button type="button" onClick={() => setShowSubmitDialog(false)}>Tiếp tục làm bài</button><button type="button" className={styles.confirmSubmit} onClick={submit}>Nộp bài ngay</button></div>
                    </section>
                </div>
            )}
        </main>
    );
};

export default IeltsReadingTestPage;
