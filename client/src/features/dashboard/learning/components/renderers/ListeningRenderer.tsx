import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LearnerListeningContent } from './renderer.types';
import { getPlayableAudioSources } from './audio-url';
import styles from './Renderer.module.css';

interface ListeningRendererProps {
    content: LearnerListeningContent;
}

interface TranscriptSegment {
    line: LearnerListeningContent['transcript'][number];
    startTime: number;
    endTime: number;
}

const resolveTranscriptSegments = (content: LearnerListeningContent): TranscriptSegment[] => {
    const wordWeights = content.transcript.map((line) => Math.max(line.text.trim().split(/\s+/).length, 1));
    const totalWeight = Math.max(wordWeights.reduce((sum, weight) => sum + weight, 0), 1);
    const knownDuration = Math.max(
        content.media.duration,
        ...content.transcript.map((line) => line.endTime),
        ...content.transcript.flatMap((line) => line.words.map((word) => word.end)),
    );
    let inferredCursor = 0;

    return content.transcript.map((line, index) => {
        const inferredStart = inferredCursor;
        inferredCursor += knownDuration * ((wordWeights[index] ?? 1) / totalWeight);

        const firstWord = line.words.find((word) => Number.isFinite(word.start));
        const lastWord = [...line.words].reverse().find((word) => Number.isFinite(word.end));
        const hasLineTiming = Number.isFinite(line.startTime)
            && Number.isFinite(line.endTime)
            && line.endTime > line.startTime;
        const hasWordTiming = firstWord !== undefined
            && lastWord !== undefined
            && lastWord.end > firstWord.start;

        if (hasLineTiming) return { line, startTime: line.startTime, endTime: line.endTime };
        if (hasWordTiming) return { line, startTime: firstWord.start, endTime: lastWord.end };
        return { line, startTime: inferredStart, endTime: inferredCursor };
    });
};

const ListeningRenderer = ({ content }: ListeningRendererProps) => {
    const audioSrc = getPlayableAudioSources(content.media.audioUrl)[0];
    const [activeLineId, setActiveLineId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const segmentEndRef = useRef<number | null>(null);
    const playbackRequestRef = useRef(0);
    const lineRefs = useRef(new Map<string, HTMLButtonElement>());
    const transcriptSegments = useMemo(() => resolveTranscriptSegments(content), [content]);

    const syncTranscript = useCallback((currentTime: number) => {
        const activeSegment = transcriptSegments.find(
            (segment) => currentTime >= segment.startTime && currentTime < segment.endTime,
        );
        setActiveLineId((current) => (
            current === activeSegment?.line.id ? current : activeSegment?.line.id ?? null
        ));
    }, [transcriptSegments]);

    useEffect(() => {
        if (!activeLineId) return;
        lineRefs.current.get(activeLineId)?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [activeLineId]);

    const handleTimeUpdate = (audio: HTMLAudioElement) => {
        const segmentEnd = segmentEndRef.current;
        if (segmentEnd !== null && audio.currentTime >= segmentEnd - 0.02) {
            audio.pause();
            segmentEndRef.current = null;
            setActiveLineId(null);
            return;
        }

        syncTranscript(audio.currentTime);
    };

    const playTranscriptLine = (segment: TranscriptSegment) => {
        const audio = audioRef.current;
        if (!audio || !audioSrc) return;

        const requestId = playbackRequestRef.current + 1;
        playbackRequestRef.current = requestId;
        audio.pause();
        setActiveLineId(segment.line.id);

        const seekAndPlay = () => {
            if (playbackRequestRef.current !== requestId) return;
            audio.currentTime = Math.max(0, segment.startTime);
            segmentEndRef.current = segment.endTime > segment.startTime ? segment.endTime : null;
            void audio.play().catch(() => {
                if (playbackRequestRef.current !== requestId) return;
                segmentEndRef.current = null;
                setActiveLineId(null);
            });
        };

        if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
            audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
            audio.load();
            return;
        }

        seekAndPlay();
    };

    return (
        <div className={styles.renderer}>
            {/* Audio player */}
            {audioSrc && (
                <div className={styles.mediaPlayerRow}>
                    <audio
                        ref={audioRef}
                        src={audioSrc}
                        controls
                        className={styles.audioPlayer}
                        preload="metadata"
                        aria-label="Phát âm thanh bài nghe"
                        onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)}
                        onSeeked={(event) => syncTranscript(event.currentTarget.currentTime)}
                        onEnded={() => {
                            segmentEndRef.current = null;
                            setActiveLineId(null);
                        }}
                    />
                    <span className={styles.accent}>{content.media.accent}</span>
                </div>
            )}

            {/* Transcript */}
            {content.transcript.length > 0 && (
                <div className={styles.transcript}>
                    <h3 className={styles.sectionTitle}>Transcript</h3>
                    {transcriptSegments.map((segment) => {
                        const { line } = segment;
                        const isActive = activeLineId === line.id;
                        return (
                        <button
                            type="button"
                            key={line.id}
                            ref={(node) => {
                                if (node) lineRefs.current.set(line.id, node);
                                else lineRefs.current.delete(line.id);
                            }}
                            className={`${styles.transcriptLine} ${isActive ? styles.transcriptLineActive : ''}`}
                            onClick={() => playTranscriptLine(segment)}
                            aria-current={isActive ? 'true' : undefined}
                            aria-label={`Phát đoạn hội thoại của ${line.speaker}: ${line.text}`}
                        >
                            <span className={styles.speaker}>{line.speaker}</span>
                            <span className={styles.transcriptText}>{line.text}</span>
                            {line.translation && (
                                <span className={styles.transcriptTranslation}>
                                    {line.translation}
                                </span>
                            )}
                        </button>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default ListeningRenderer;
