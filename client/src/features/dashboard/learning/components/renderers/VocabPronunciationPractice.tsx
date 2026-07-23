import { useState } from 'react';
import {
    useAzurePronunciation,
    useShadowingRecorder,
    type PronunciationResult,
} from '@/features/dashboard/shadowing';
import styles from './Renderer.module.css';

interface Props {
    word: string;
}

const getScoreMessage = (score: number): string => {
    if (score >= 85) return 'Phát âm rất tốt!';
    if (score >= 70) return 'Phát âm tốt.';
    if (score >= 50) return 'Khá ổn, hãy luyện thêm.';
    return 'Hãy nghe lại và thử lần nữa.';
};

const getScoreTone = (score: number): string => {
    if (score >= 85) return styles.pronunciationExcellent;
    if (score >= 70) return styles.pronunciationGood;
    if (score >= 50) return styles.pronunciationFair;
    return styles.pronunciationNeedsWork;
};

const getErrorLabel = (errorType: string): string => {
    const labels: Record<string, string> = {
        Omission: 'Thiếu âm',
        Insertion: 'Thừa âm',
        Mispronunciation: 'Sai âm',
    };
    return labels[errorType] ?? errorType;
};

export const VocabPronunciationPractice = ({ word }: Props) => {
    const { startRecording, stopRecording, isRecording } = useShadowingRecorder();
    const { scoreBlob, isScoring, error: scoringError, clearError } = useAzurePronunciation();
    const [result, setResult] = useState<PronunciationResult | null>(null);
    const [recorderError, setRecorderError] = useState<string | null>(null);

    const startPractice = async () => {
        setResult(null);
        setRecorderError(null);
        clearError();

        try {
            await startRecording();
        } catch (error) {
            const permissionDenied = error instanceof Error && error.message === 'Microphone permission denied';
            setRecorderError(permissionDenied
                ? 'Bạn cần cho phép sử dụng micro để luyện phát âm.'
                : 'Trình duyệt không thể bắt đầu ghi âm.');
        }
    };

    const stopAndScore = async () => {
        setRecorderError(null);
        clearError();

        try {
            const audioBlob = await stopRecording();
            if (audioBlob.size === 0) {
                setRecorderError('Không thu được âm thanh. Vui lòng thử lại.');
                return;
            }

            const assessment = await scoreBlob(audioBlob, word);
            setResult(assessment);
        } catch (error) {
            if (!(error instanceof Error && error.message)) {
                setRecorderError('Không thể chấm phát âm. Vui lòng thử lại.');
            }
        }
    };

    const handleClick = () => {
        if (isRecording) {
            void stopAndScore();
            return;
        }
        void startPractice();
    };

    const problemWords = result?.words.filter((item) => item.errorType !== 'None' || item.accuracyScore < 70) ?? [];
    const visibleError = recorderError ?? scoringError;

    return (
        <div className={styles.pronunciationPractice}>
            <button
                type="button"
                className={`${styles.pronunciationButton} ${isRecording ? styles.pronunciationButtonRecording : ''}`}
                onClick={handleClick}
                disabled={isScoring}
                aria-pressed={isRecording}
                aria-label={isRecording ? `Dừng ghi âm và chấm từ ${word}` : `Luyện phát âm từ ${word}`}
            >
                <span className={styles.pronunciationMic} aria-hidden="true">
                    {isScoring ? <LoadingIcon /> : <MicrophoneIcon />}
                </span>
                {isScoring ? 'Azure đang chấm...' : isRecording ? 'Dừng & chấm điểm' : 'Luyện phát âm'}
            </button>

            {isRecording && (
                <p className={styles.pronunciationStatus} role="status">
                    <span className={styles.recordingDot} aria-hidden="true" />
                    Hãy nói “{word}”, sau đó bấm dừng.
                </p>
            )}

            {visibleError && <p className={styles.pronunciationError} role="alert">{visibleError}</p>}

            {result && (
                <div className={`${styles.pronunciationResult} ${getScoreTone(result.overallScore)}`} aria-live="polite">
                    <div className={styles.pronunciationScore}>
                        <strong>{Math.round(result.overallScore)}</strong>
                        <span>/100</span>
                    </div>
                    <div className={styles.pronunciationFeedback}>
                        <strong>{getScoreMessage(result.overallScore)}</strong>
                        {problemWords.length > 0 ? (
                            <p>
                                {problemWords.map((item) => `${item.word}: ${getErrorLabel(item.errorType)} (${Math.round(item.accuracyScore)})`).join(' · ')}
                            </p>
                        ) : (
                            <p>Azure không phát hiện lỗi nổi bật.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const MicrophoneIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="8" y="3" width="8" height="12" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const LoadingIcon = () => (
    <svg className={styles.pronunciationSpinner} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
);
