import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import styles from './Result.module.css';
import { Button } from '@/components/core/Button';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { useAuthStore } from '@/stores/auth.store';
import { usePlacementTestStore } from '@/stores/placement-test.store';
import { usePlacementResultQuery } from '../../hooks/use-placement-result-query';

const formatBand = (value: number | undefined): string => {
    if (typeof value !== 'number') {
        return '--';
    }

    return `${value.toFixed(1)}/9`;
};

const toRangeValue = (value: number, max = 100): number => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(max, value));
};

const flattenFeedback = (items: string[] | undefined): string => {
    if (!items || items.length === 0) {
        return 'Đang cập nhật đánh giá.';
    }

    return items.join(' ');
};

export const Result = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const sessionId = usePlacementTestStore((state) => state.sessionId);
    const clearPlacementSession = usePlacementTestStore((state) => state.clear);

    const {
        data: result,
        isLoading,
        isError,
        hasTimedOut,
    } = usePlacementResultQuery(sessionId);

    useEffect(() => {
        if (!hasTimedOut) {
            return;
        }

        toast.error('Hệ thống đang bận, vui lòng thử lại.');
    }, [hasTimedOut]);

    const skillScores = useMemo(() => {
        if (!result) {
            return [] as Array<{ label: string; score: string; fillPercent: number }>;
        }

        return [
            {
                label: 'Listening',
                score: `${toRangeValue(result.scores.listening.rawPercent)}%`,
                fillPercent: toRangeValue(result.scores.listening.rawPercent),
            },
            {
                label: 'Reading',
                score: `${toRangeValue(result.scores.reading.rawPercent)}%`,
                fillPercent: toRangeValue(result.scores.reading.rawPercent),
            },
            {
                label: 'Writing',
                score: formatBand(result.scores.writing.band),
                fillPercent: toRangeValue((result.scores.writing.band / 9) * 100),
            },
            {
                label: 'Speaking',
                score: formatBand(result.scores.speaking.band),
                fillPercent: toRangeValue((result.scores.speaking.band / 9) * 100),
            },
        ];
    }, [result]);

    const detailedFeedback = useMemo(() => {
        if (!result) {
            return [] as Array<{ label: string; score: string; content: string }>;
        }

        return [
            {
                label: 'Overall',
                score: result.cefr,
                content: result.cefrDescription ?? 'Kết quả tổng hợp theo chuẩn CEFR.',
            },
            {
                label: 'Writing',
                score: formatBand(result.scores.writing.band),
                content: [
                    result.scores.writing.criteria ? `Tiêu chí (TR: ${formatBand(result.scores.writing.criteria.TR)} | CC: ${formatBand(result.scores.writing.criteria.CC)} | LR: ${formatBand(result.scores.writing.criteria.LR)} | GRA: ${formatBand(result.scores.writing.criteria.GRA)})` : '',
                    flattenFeedback(result.feedback?.writing?.strengths),
                ].filter(Boolean).join('\n\n'),
            },
            {
                label: 'Writing Tips',
                score: 'Tips',
                content: flattenFeedback(result.feedback?.writing?.tips),
            },
            {
                label: 'Speaking',
                score: formatBand(result.scores.speaking.band),
                content: [
                    result.scores.speaking.criteria ? `Tiêu chí (Fluency: ${formatBand(result.scores.speaking.criteria.fluency)} | Lexical: ${formatBand(result.scores.speaking.criteria.lexical)} | Grammar: ${formatBand(result.scores.speaking.criteria.grammar)} | Pronunciation: ${formatBand(result.scores.speaking.criteria.pronunciation)})` : '',
                    flattenFeedback(result.feedback?.speaking?.strengths),
                ].filter(Boolean).join('\n\n'),
            },
            {
                label: 'Speaking Tips',
                score: 'Tips',
                content: flattenFeedback(result.feedback?.speaking?.tips),
            },
        ];
    }, [result]);

    if (!isAuthenticated) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    if (!sessionId) {
        return <Navigate to={PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING} replace />;
    }

    if (isLoading) {
        return <Loading />;
    }

    if (isError || hasTimedOut || !result) {
        return (
            <div className={styles.errorState} role="alert">
                <p>Không thể tải kết quả bài kiểm tra. Vui lòng thử lại sau.</p>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(PATHS.DASHBOARD.HOME)}
                >
                    Quay về Dashboard
                </Button>
            </div>
        );
    }

    if (result.status === 'pending' || result.status === 'computing') {
        return (
            <div className={styles.loadingState} role="status" aria-live="polite">
                <Loading />
                <p>Giám khảo AI đang chấm điểm...</p>
            </div>
        );
    }

    return (
        <div className={styles.result}>
            <h1>Kết quả đánh giá năng lực</h1>
            <div className={styles.score}>
                <div className={styles.levelBadge}>
                    <p>{result.cefr}</p>
                </div>

                <section className={styles.scoreList}>
                    {skillScores.map((skill, index) => (
                        <div key={`${skill.label}-${index}`} className={styles.scoreRow}>
                            <div className={styles.scoreRowHeader}>
                                <p>{skill.label}</p>
                                <p>{skill.score}</p>
                            </div>

                            <div className={styles.scoreTrack}>
                                <div className={styles.scoreFill} style={{ width: `${skill.fillPercent}%` }} />
                            </div>
                        </div>
                    ))}
                </section>
            </div>
            <section className={styles.detailedFeedback}>
                <h2 className={styles.feedbackTitle}>Nhận xét chi tiết</h2>
                <div className={styles.feedbackList}>
                    {detailedFeedback.map((item) => (
                        <article key={item.label} className={styles.feedbackItem}>
                            <h3 className={styles.feedbackItemTitle}>
                                {item.label} <span>({item.score})</span>
                            </h3>
                            <p className={styles.feedbackItemContent}>{item.content}</p>
                        </article>
                    ))}
                </div>
            </section>
            <Button
                type="button"
                onClick={() => {
                    clearPlacementSession();
                    navigate(PATHS.DASHBOARD.HOME);
                }}
            >
                Tìm khoá học phù hợp
            </Button>
        </div>
    );
}

export default Result;