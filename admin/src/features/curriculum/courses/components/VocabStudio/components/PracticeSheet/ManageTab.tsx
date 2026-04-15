import { memo, useCallback, useRef, useState } from 'react';
import {
    PenLine,
    RefreshCw,
    Settings2,
    Sparkles,
    Volume2,
    Link2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { notification } from '@/lib/notification';
import {
    useSwapVocabQuestion,
    useUpdateVocabQuestion,
    useUpdatePassingScore,
} from '../../../../hooks/useVocabQuestions';
import type {
    IQuestion,
    MCContent,
    FillContent,
    MatchContent,
    MCOption,
    MatchPair,
    QuestionType,
} from '../../../../types/course.types';

// ─── Question type metadata ────────────────────────────────────────────────────
// Icons stored as component references (not JSX elements) to stay React-safe.

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
        Icon: Settings2,
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

// ─── QuestionPreview ──────────────────────────────────────────────────────────

function QuestionPreview({ question }: { readonly question: IQuestion }) {
    if (question.type === 'MULTIPLE_CHOICE') {
        const mc = question.content as MCContent;
        return (
            <div className="space-y-2">
                {question.stem.audioUrl && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
                        <Volume2 className="h-3 w-3" aria-hidden="true" /> Audio đính kèm
                    </span>
                )}
                {question.stem.text && (
                    <p className="text-xs text-muted-foreground">{question.stem.text}</p>
                )}
                <div className="grid grid-cols-2 gap-1">
                    {mc.options.map((opt: MCOption) => (
                        <span
                            key={opt.id}
                            className={`truncate rounded border px-2 py-0.5 text-[11px] ${
                                opt.isCorrect
                                    ? 'border-emerald-200 bg-emerald-50 font-medium text-emerald-700'
                                    : 'border-border bg-muted/40 text-muted-foreground'
                            }`}
                        >
                            {opt.isCorrect ? '✓ ' : ''}
                            {opt.text}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    if (question.type === 'FILL_IN_BLANK') {
        const fill = question.content as FillContent;
        return (
            <div className="space-y-1.5">
                <p className="rounded bg-muted/40 px-2 py-1.5 font-mono text-xs text-foreground/90">
                    {question.stem.text}
                </p>
                <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Đáp án: </span>
                    {fill.correctAnswers[0]}
                </p>
            </div>
        );
    }

    if (question.type === 'MATCHING') {
        const match = question.content as MatchContent;
        return (
            <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{question.stem.text}</p>
                <div className="space-y-1">
                    {match.pairs.slice(0, 4).map((pair: MatchPair) => (
                        <div key={pair.id} className="flex items-start gap-2 text-xs">
                            <span className="w-[90px] shrink-0 font-medium text-foreground">
                                {pair.word}
                            </span>
                            <span className="text-muted-foreground/60">↔</span>
                            <span className="line-clamp-1 text-muted-foreground">
                                {pair.definition}
                            </span>
                        </div>
                    ))}
                    {match.pairs.length > 4 && (
                        <p className="text-[10px] text-muted-foreground">
                            +{match.pairs.length - 4} cặp nữa…
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <p className="text-xs text-muted-foreground">
            {question.stem.text ?? '(Không có nội dung)'}
        </p>
    );
}

// ─── QuestionRow ──────────────────────────────────────────────────────────────

interface QuestionRowProps {
    question: IQuestion;
    index: number;
    lessonId: string;
}

const QuestionRow = memo(function QuestionRow({
    question,
    index,
    lessonId,
}: QuestionRowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editStem, setEditStem] = useState(question.stem.text ?? '');
    const [editExplanation, setEditExplanation] = useState(question.explanation ?? '');

    const swapMutation = useSwapVocabQuestion(lessonId);
    const updateMutation = useUpdateVocabQuestion(lessonId);
    const meta = QUESTION_TYPE_META[question.type] ?? QUESTION_TYPE_META['ESSAY'];
    const { Icon } = meta;

    const handleCancel = useCallback(() => {
        setEditStem(question.stem.text ?? '');
        setEditExplanation(question.explanation ?? '');
        setIsEditing(false);
    }, [question.stem.text, question.explanation]);

    const handleSave = useCallback(() => {
        updateMutation.mutate(
            {
                questionId: question._id,
                payload: {
                    stem: { ...question.stem, text: editStem || undefined },
                    explanation: editExplanation || undefined,
                },
            },
            {
                onSuccess: () => {
                    setIsEditing(false);
                    notification.success('Đã cập nhật câu hỏi');
                },
                onError: () => notification.error('Lỗi khi cập nhật câu hỏi'),
            },
        );
    }, [question._id, question.stem, editStem, editExplanation, updateMutation]);

    const handleSwap = useCallback(() => {
        swapMutation.mutate(
            { questionId: question._id },
            {
                onSuccess: () => notification.success('Đã thay thế câu hỏi'),
                onError: () => notification.error('Không tìm được câu hỏi thay thế'),
            },
        );
    }, [question._id, swapMutation]);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/30">
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                </span>
                <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                >
                    {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
                    {meta.label}
                </span>
                <span className="flex-1 truncate text-xs text-foreground/80">
                    {question.stem.text ?? '(Không có text)'}
                </span>
                <span
                    className="text-xs text-muted-foreground/40 transition-transform group-data-[state=open]:rotate-180"
                    aria-hidden="true"
                >
                    ▾
                </span>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="space-y-3 rounded-b-lg border border-t-0 bg-card/50 px-3 pb-3 pt-2.5">
                    {isEditing ? (
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Nội dung câu hỏi
                                </p>
                                <Textarea
                                    value={editStem}
                                    onChange={(e) => setEditStem(e.target.value)}
                                    className="min-h-[56px] resize-none text-xs"
                                    placeholder="Nhập nội dung câu hỏi…"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Giải thích đáp án
                                </p>
                                <Textarea
                                    value={editExplanation}
                                    onChange={(e) => setEditExplanation(e.target.value)}
                                    className="min-h-[48px] resize-none text-xs"
                                    placeholder="Giải thích đáp án…"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <QuestionPreview question={question} />
                            {question.explanation && (
                                <p className="border-l-2 border-border pl-2 text-xs text-muted-foreground">
                                    💡 {question.explanation}
                                </p>
                            )}
                        </>
                    )}

                    <div className="flex items-center justify-end gap-1.5">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={handleCancel}
                                    disabled={updateMutation.isPending}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                >
                                    {updateMutation.isPending ? 'Đang lưu…' : 'Lưu'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={handleSwap}
                                    disabled={swapMutation.isPending}
                                    aria-label="Thay thế câu hỏi bằng câu hỏi khác"
                                >
                                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                                    {swapMutation.isPending ? 'Đang swap…' : 'Swap'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => setIsEditing(true)}
                                    aria-label="Chỉnh sửa câu hỏi"
                                >
                                    <PenLine className="h-3 w-3" aria-hidden="true" />
                                    Sửa
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
});

// ─── ManageTab ────────────────────────────────────────────────────────────────

interface ManageTabProps {
    lessonId: string;
    passingScore: number;
    questions: IQuestion[] | undefined;
    isLoading: boolean;
    isError: boolean;
}

export function ManageTab({
    lessonId,
    passingScore,
    questions,
    isLoading,
    isError,
}: ManageTabProps) {
    const updatePassingScoreMutation = useUpdatePassingScore(lessonId);
    const [localScoreOverride, setLocalScoreOverride] = useState<number | null>(null);
    const localScore = localScoreOverride ?? passingScore;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasQuestions = Array.isArray(questions) && questions.length > 0;


    const handleScoreChange = useCallback(
        (val: number[]) => {
            const score = val[0] ?? localScore;
            setLocalScoreOverride(score);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                updatePassingScoreMutation.mutate(
                    { passingScore: score },
                    {
                        onSuccess: () => setLocalScoreOverride(null),
                        onError: () => {
                            setLocalScoreOverride(null);
                            notification.error('Lỗi khi lưu điểm đạt');
                        },
                    },
                );
            }, 800);
        },
        [localScore, updatePassingScoreMutation],
    );

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Passing score config */}
            <div className="shrink-0 space-y-3 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-medium">Cấu hình bài tập</span>
                    {hasQuestions && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                            {questions!.length} câu
                        </Badge>
                    )}
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Điểm đạt tối thiểu</span>
                        <span className="text-xs font-semibold tabular-nums">
                            {localScore}%
                            {updatePassingScoreMutation.isPending && (
                                <span className="ml-1 text-[10px] text-muted-foreground" aria-label="Đang lưu">●</span>
                            )}
                        </span>
                    </div>
                    <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[localScore]}
                        onValueChange={handleScoreChange}
                        className="w-full"
                        aria-label="Điểm đạt tối thiểu"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>0%</span><span>50%</span><span>100%</span>
                    </div>
                </div>
            </div>

            {/* Question list */}
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {isLoading &&
                    [1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                {isError && (
                    <p className="py-8 text-center text-xs text-destructive/70">
                        Không tải được danh sách câu hỏi.
                    </p>
                )}
                {!isLoading && !isError && !hasQuestions && (
                    <div className="flex flex-col items-center justify-center space-y-2 py-12 text-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                        <p className="text-sm font-medium text-muted-foreground">
                            Chưa có câu hỏi luyện tập
                        </p>
                        <p className="max-w-[220px] text-xs text-muted-foreground">
                            Nhấn &quot;Tạo câu hỏi&quot; trên thanh công cụ để sinh câu hỏi.
                        </p>
                    </div>
                )}
                {hasQuestions && (
                    <>
                        <Separator />
                        {questions!.map((q, i) => (
                            <QuestionRow key={q._id} question={q} index={i} lessonId={lessonId} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
