import {
    CheckCircle2,
    ChevronRight,
    GraduationCap,
    Link2,
    PenLine,
    RotateCcw,
    Sparkles,
    Volume2,
    XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import type { IQuestion, QuestionType } from '../../../../types/course.types';
import { usePracticeQuiz } from './hooks/usePracticeQuiz';
import { MCQuiz } from './quiz/MCQuiz';
import { FillQuiz } from './quiz/FillQuiz';
import { MatchQuiz } from './quiz/MatchQuiz';

// ─── Question type metadata ────────────────────────────────────────────────────

interface QuestionTypeMeta {
    label: string;
    Icon: ComponentType<{ className?: string }> | null;
    badgeClass: string;
}

const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
    MULTIPLE_CHOICE: {
        label: 'Nghe & Chọn',
        Icon: Volume2,
        badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    FILL_IN_BLANK: {
        label: 'Điền từ',
        Icon: PenLine,
        badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    ERROR_CORRECTION: {
        label: 'Sửa lỗi',
        Icon: XCircle,
        badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    MATCHING: {
        label: 'Nối nghĩa',
        Icon: Link2,
        badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    TRUE_FALSE:   { label: 'Đúng/Sai',  Icon: null, badgeClass: 'bg-amber-100 text-amber-700 border-amber-200' },
    PRONUNCIATION: { label: 'Phát âm',  Icon: null, badgeClass: 'bg-pink-100 text-pink-700 border-pink-200' },
    ESSAY:        { label: 'Tự luận',   Icon: null, badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    questions: IQuestion[];
    passingScore: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TryTab({ questions, passingScore }: Props) {
    const { phase, shuffled, currentIndex, answers, score, start, confirmAnswer, next } =
        usePracticeQuiz(questions);

    // ── Idle ──────────────────────────────────────────────────────────────────

    if (phase === 'idle') {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                <div>
                    <p className="text-sm font-medium">{questions.length} câu hỏi</p>
                    <p className="mt-1 text-xs text-muted-foreground">Điểm đạt: {passingScore}%</p>
                </div>
                <Button className="gap-2" onClick={start} aria-label="Bắt đầu làm bài">
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Bắt đầu làm bài
                </Button>
            </div>
        );
    }

    // ── Finished ──────────────────────────────────────────────────────────────

    if (phase === 'finished') {
        const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        const passed = percentage >= passingScore;
        return (
            <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
                {passed ? (
                    <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden="true" />
                ) : (
                    <XCircle className="h-14 w-14 text-red-400" aria-hidden="true" />
                )}
                <div>
                    <p className="text-2xl font-bold tabular-nums">{percentage}%</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {score.correct}/{score.total} câu đúng —{' '}
                        <span
                            className={
                                passed
                                    ? 'font-medium text-emerald-600'
                                    : 'font-medium text-red-500'
                            }
                        >
                            {passed ? 'Đạt' : 'Chưa đạt'}
                        </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Điểm đạt yêu cầu: {passingScore}%
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={start}
                    aria-label="Làm lại bài tập"
                >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Làm lại
                </Button>
            </div>
        );
    }

    // ── Playing ───────────────────────────────────────────────────────────────

    const q = shuffled[currentIndex]!;
    const ans = answers[currentIndex]!;
    const progress = ((currentIndex + 1) / shuffled.length) * 100;
    const meta = QUESTION_TYPE_META[q.type] ?? QUESTION_TYPE_META['ESSAY'];
    const { Icon } = meta;
    const correctSoFar = answers.filter((a) => a.isCorrect === true).length;

    return (
        <div className="flex h-full flex-col">
            {/* Progress bar */}
            <div className="shrink-0 px-4 pb-2 pt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{currentIndex + 1} / {shuffled.length}</span>
                    <span>{correctSoFar} đúng</span>
                </div>
                <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={currentIndex + 1}
                    aria-valuemin={1}
                    aria-valuemax={shuffled.length}
                >
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Question body */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                {/* Type badge */}
                <span
                    className={`mb-3 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                >
                    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
                    {meta.label}
                </span>

                {q.type === 'MULTIPLE_CHOICE' && (
                    <MCQuiz question={q} answer={ans} onAnswer={confirmAnswer} />
                )}
                {q.type === 'FILL_IN_BLANK' && (
                    <FillQuiz question={q} answer={ans} onAnswer={confirmAnswer} />
                )}
                {q.type === 'MATCHING' && (
                    <MatchQuiz question={q} answer={ans} onAnswer={confirmAnswer} />
                )}

                {/* Explanation + Next button */}
                {ans.confirmed && (
                    <div className="mt-4 space-y-3">
                        {q.explanation && (
                            <div className="rounded-md border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                💡 {q.explanation}
                            </div>
                        )}
                        <Button
                            className="w-full gap-2"
                            onClick={next}
                            aria-label={
                                currentIndex + 1 >= shuffled.length
                                    ? 'Xem kết quả'
                                    : 'Câu tiếp theo'
                            }
                        >
                            {currentIndex + 1 >= shuffled.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
