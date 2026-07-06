import styles from './CueDisplay.module.css';
import type { ShadowingState } from '../../hooks/use-shadowing-machine';
import type { Cue, PronunciationResult } from '../../types/shadowing.types';

interface CueDisplayProps {
    cue: Cue;
    mode: 'with-transcript' | 'without-transcript';
    state: ShadowingState;
    pronunciationResult?: PronunciationResult | null;
}

const formatCueTime = (milliseconds: number): string => {
    return `${(milliseconds / 1000).toFixed(1)}s`;
};

const WORD_TOKEN_REGEX = /[A-Za-z0-9']+|[^A-Za-z0-9'\s]+|\s+/g;

const getScoreClassName = (score?: number): string => {
    if (score === undefined) {
        return '';
    }

    if (score >= 90) {
        return styles.wordStrong;
    }

    if (score >= 70) {
        return styles.wordAverage;
    }

    return styles.wordWeak;
};

const buildScoredTokens = (text: string, result: PronunciationResult) => {
    const tokens = text.match(WORD_TOKEN_REGEX) ?? [];
    const scoredTokens: Array<{ key: string; text: string; score?: number; className: string }> = [];
    let wordIndex = 0;

    tokens.forEach((token, index) => {
        const isWord = /[A-Za-z0-9']+/.test(token);
        const wordScore = isWord ? result.words[wordIndex]?.accuracyScore : undefined;
        const className = isWord ? getScoreClassName(wordScore) : '';

        if (isWord) {
            wordIndex += 1;
        }

        scoredTokens.push({
            key: `${index}-${token}`,
            text: token,
            score: isWord ? wordScore : undefined,
            className,
        });
    });

    return scoredTokens;
};

const CueDisplay = ({ cue, mode, state, pronunciationResult }: CueDisplayProps) => {
    const shouldHideText = mode === 'without-transcript' && state === 'playing';
    const showScores = state === 'result' && pronunciationResult;
    const tokens = showScores ? buildScoredTokens(cue.text, pronunciationResult) : null;

    return (
        <section className={styles.cueContainer} aria-label="Câu đang luyện">
            <div className={styles.cueMetaRow}>
                <div>
                    <span className={styles.cueLabel}>Câu đang luyện</span>
                    <p className={styles.cueMeta}>
                        {formatCueTime(cue.startMs)} → {formatCueTime(cue.endMs)}
                    </p>
                </div>
                {showScores && (
                    <span className={`${styles.cueScoreBadge} ${getScoreClassName(pronunciationResult.overallScore)}`.trim()}>
                        {Math.round(pronunciationResult.overallScore)}
                    </span>
                )}
            </div>
            <p className={`${styles.cueText} ${shouldHideText ? styles.cueTextHidden : ''}`.trim()}>
                {shouldHideText && !showScores && '••••••••••••••••••'}
                {!shouldHideText && !showScores && cue.text}
                {!shouldHideText && showScores && tokens?.map((token) => (
                    <span key={token.key} className={token.className}>
                        {token.text}
                    </span>
                ))}
            </p>
            {cue.text.length > 200 && (
                <p className={styles.cueWarning} role="note">
                    ⚠ Câu này khá dài — hãy luyện chậm từng cụm từ.
                </p>
            )}
        </section>
    );
};

export default CueDisplay;
