import { useEffect, useRef, useState } from 'react';
import Mic from '@/assets/icons/mic.svg';
import Next from '@/assets/icons/next.svg';
import Stop from '@/assets/icons/stop.svg';
import { Button } from '@/components/core/Button';
import styles from './TestMic.module.css';

interface Props {
    onStartTest: () => void;
}

type PermissionState = 'granted' | 'denied' | 'prompt';
type MicTestPhase = 'idle' | 'recording' | 'review';

const MAX_RECORD_SECONDS = 20;
const AMPLITUDE_THRESHOLD = 10;
const MIN_ACTIVE_FRAMES = 4;

const RetryIcon = () => (
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
            d="M2.53891 6.17702C3.7548 4.07854 5.6919 2.49345 7.98951 1.7169C10.2871 0.940342 12.7886 1.02525 15.0283 1.95581C17.268 2.88638 19.0931 4.59917 20.1639 6.77527C21.2347 8.95138 21.4782 11.4425 20.849 13.7847C20.2198 16.127 18.7608 18.1608 16.7437 19.5074C14.7266 20.854 12.2889 21.4216 9.88442 21.1047C7.47993 20.7877 5.27258 19.6077 3.67337 17.7843C2.07416 15.961 1.1921 13.6186 1.19141 11.1933"
            stroke="black"
            strokeWidth="2.38095"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M7.4414 6.19336H2.44141V1.19336"
            stroke="black"
            strokeWidth="2.38095"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const TestMic = ({ onStartTest }: Props) => {
    const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
    const [phase, setPhase] = useState<MicTestPhase>('idle');
    const [isBusy, setIsBusy] = useState(false);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [isSuitable, setIsSuitable] = useState(false);

    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const monitorTimerRef = useRef<number | null>(null);
    const autoStopTimerRef = useRef<number | null>(null);
    const recordStartRef = useRef<number | null>(null);
    const activeFramesRef = useRef(0);
    const chunksRef = useRef<BlobPart[]>([]);

    const clearTimers = () => {
        if (monitorTimerRef.current) {
            window.clearInterval(monitorTimerRef.current);
            monitorTimerRef.current = null;
        }
        if (autoStopTimerRef.current) {
            window.clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }
    };

    const cleanupStream = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        analyserRef.current = null;
        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const startMicCheck = async () => {
        if (phase === 'recording') {
            return;
        }

        setIsBusy(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionState('granted');
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            activeFramesRef.current = 0;
            recordStartRef.current = Date.now();
            setIsSuitable(false);
            setPhase('recording');

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                clearTimers();
                const elapsed = Math.max(1, Math.round((Date.now() - (recordStartRef.current ?? Date.now())) / 1000));

                const blob = chunksRef.current.length > 0
                    ? new Blob(chunksRef.current, { type: 'audio/webm' })
                    : null;

                if (recordedAudioUrl) {
                    URL.revokeObjectURL(recordedAudioUrl);
                }

                const nextAudioUrl = blob ? URL.createObjectURL(blob) : null;
                setRecordedAudioUrl(nextAudioUrl);
                setIsSuitable(activeFramesRef.current >= MIN_ACTIVE_FRAMES && elapsed >= 2);
                setPhase('review');
                setIsBusy(false);
                await cleanupStream();
            };

            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;

            monitorTimerRef.current = window.setInterval(() => {
                const currentAnalyser = analyserRef.current;
                if (!currentAnalyser) {
                    return;
                }

                const samples = new Uint8Array(currentAnalyser.fftSize);
                currentAnalyser.getByteTimeDomainData(samples);

                let sum = 0;
                for (let i = 0; i < samples.length; i += 1) {
                    sum += Math.abs(samples[i] - 128);
                }
                const avgAmplitude = sum / samples.length;
                if (avgAmplitude > AMPLITUDE_THRESHOLD) {
                    activeFramesRef.current += 1;
                }
            }, 100);

            autoStopTimerRef.current = window.setTimeout(() => {
                const activeRecorder = mediaRecorderRef.current;
                if (activeRecorder && activeRecorder.state !== 'inactive') {
                    activeRecorder.stop();
                }
            }, MAX_RECORD_SECONDS * 1000);

            recorder.start();
            setIsBusy(false);
        } catch {
            setPermissionState('denied');
            setIsSuitable(false);
            setPhase('idle');
            setIsBusy(false);
        } finally {
            if (permissionState === 'denied') {
                setIsBusy(false);
            }
        }
    };

    const stopMicCheck = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            return;
        }
        recorder.stop();
    };

    const resetMicCheck = async () => {
        clearTimers();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        await cleanupStream();

        mediaRecorderRef.current = null;
        chunksRef.current = [];
        activeFramesRef.current = 0;
        recordStartRef.current = null;

        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }

        setRecordedAudioUrl(null);
        setIsSuitable(false);
        setPhase('idle');
    };

    useEffect(() => {
        return () => {
            clearTimers();
            void cleanupStream();
            if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl);
            }
        };
    }, [recordedAudioUrl]);

    const deniedHint = permissionState === 'denied'
        ? 'Truy cập micro đang bị từ chối. Hãy bật quyền microphone cho trình duyệt rồi thử lại.'
        : '';

    const failedHint = phase === 'review' && !isSuitable
        ? 'Không phát hiện đủ tín hiệu giọng nói. Hãy thử lại và nói rõ trong khi kiểm tra.'
        : '';

    const grantedHint = phase === 'review' && isSuitable
        ? 'Microphone đã sẵn sàng. Bạn có thể bắt đầu phần Speaking.'
        : '';

    return (
        <div className={styles.testMic}>
            <div className={styles.manual}>
                <h1>TEST YOUR MICROPHONE</h1>

                <div className={styles.content}>
                    <p className={styles.title}></p>

                    <ul className={styles.list}>
                        <li>You have 20 seconds to speak.</li>
                        <li>To complete this activity, you must allow access to your system&apos;s microphone.</li>
                        <li>
                            Click the button <span>Test microphone</span> below to Start.
                        </li>
                    </ul>
                </div>
            </div>

            {phase === 'idle' && (
                <div className={styles.actionButtons}>
                    <Button
                        type="button"
                        icon={Mic}
                        iconWidth={20}
                        disabled={isBusy}
                        onClick={() => {
                            void startMicCheck();
                        }}
                    >
                        {isBusy ? 'Đang kiểm tra...' : 'Test microphone'}
                    </Button>
                </div>
            )}

            {phase === 'recording' && (
                <div className={styles.actionButtons}>
                    <div className={styles.timerAura}>
                        <Button
                            type="button"
                            icon={Stop}
                            iconWidth={20}
                            className={styles.timerButton}
                            onClick={stopMicCheck}
                        >
                            Stop
                        </Button>
                    </div>
                </div>
            )}

            {phase === 'review' && (
                <div className={styles.reviewPanel}>
                    <div className={styles.reviewDivider} />
                    {recordedAudioUrl && (
                        <audio
                            className={styles.defaultAudio}
                            src={recordedAudioUrl}
                            preload="metadata"
                            controls
                        />
                    )}

                    <div className={styles.reviewActions}>
                        <Button
                            type="button"
                            variant="outline"
                            icon={<RetryIcon />}
                            iconWidth={20}
                            fontSize={18}
                            borderColor="#848484"
                            textColor="#000000"
                            className={styles.tryAgainBtn}
                            onClick={() => {
                                void resetMicCheck();
                            }}
                        >
                            Try again
                        </Button>

                        <Button
                            type="button"
                            icon={Next}
                            iconPosition="right"
                            disabled={!isSuitable}
                            onClick={onStartTest}
                        >
                            Start Test
                        </Button>
                    </div>
                </div>
            )}

            {deniedHint && <p className={styles.deniedHint}>{deniedHint}</p>}
            {failedHint && <p className={styles.deniedHint}>{failedHint}</p>}
            {grantedHint && <p className={styles.grantedHint}>{grantedHint}</p>}
        </div>
    );
};

export default TestMic;