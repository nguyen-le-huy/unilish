import { memo, useState, useCallback } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
    RefreshCw,
    Trash2,
    Pencil,
    PlusCircle,
    Loader2,
    BookOpen,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useReadingQuestions } from '../../../../../hooks/useReadingQuestions';
import {
    useSwapReadingQuestion,
    useUpdateReadingQuestion,
    useDeleteReadingQuestion,
} from '../../../../../hooks/useReadingMutations';
import type {
    ReadingLessonFormValues,
    ReadingContent,
    ReadingQuestionCard,
    UpdateReadingQuestionPayload,
} from '../../../../../types/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
    MULTIPLE_CHOICE: 'Trắc nghiệm',
    FILL_IN_BLANK: 'Điền từ',
    TRUE_FALSE: 'Đúng / Sai',
    MATCHING: 'Nối từ',
};

const TYPE_COLORS: Record<string, string> = {
    MULTIPLE_CHOICE: 'bg-blue-100 text-blue-700',
    FILL_IN_BLANK: 'bg-amber-100 text-amber-700',
    TRUE_FALSE: 'bg-purple-100 text-purple-700',
    MATCHING: 'bg-teal-100 text-teal-700',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    questionIds: ReadingContent['practiceConfig']['questionIds'];
}

interface EditState {
    questionId: string;
    stemText: string;
    explanation: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StemText({ text }: { text?: string }) {
    if (!text) return null;
    const parts = text.split(/(_{3,})/g);
    return (
        <p className="text-sm leading-relaxed">
            {parts.map((part, i) =>
                /^_{3,}$/.test(part) ? (
                    <strong key={i} className="font-semibold text-primary">
                        {part}
                    </strong>
                ) : (
                    part
                ),
            )}
        </p>
    );
}

function MCOptions({ options }: { options: ReadingQuestionCard['content']['options'] }) {
    if (!options?.length) return null;
    const labels = ['A', 'B', 'C', 'D'];
    return (
        <ul className="mt-2 space-y-1">
            {options.map((opt, idx) => (
                <li
                    key={opt.id}
                    className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${opt.isCorrect
                        ? 'bg-green-50 font-medium text-green-800'
                        : 'text-muted-foreground'
                        }`}
                >
                    <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${opt.isCorrect ? 'bg-green-500 text-white' : 'bg-muted'
                            }`}
                    >
                        {labels[idx] ?? idx + 1}
                    </span>
                    {opt.text}
                </li>
            ))}
        </ul>
    );
}

function QuestionCard({
    question,
    index,
    onEdit,
    swappingId,
    deletingId,
    onSwap,
    onDelete,
}: {
    question: ReadingQuestionCard;
    index: number;
    onEdit: (q: ReadingQuestionCard) => void;
    swappingId: string | null;
    deletingId: string | null;
    onSwap: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const isSwapping = swappingId === question._id;
    const isDeleting = deletingId === question._id;
    const isBusy = isSwapping || isDeleting;
    const typeLabel = TYPE_LABELS[question.type] ?? question.type;
    const typeColor = TYPE_COLORS[question.type] ?? 'bg-slate-100 text-slate-700';

    return (
        <div
            className="rounded-lg border bg-card p-4 shadow-sm transition-opacity duration-200 data-[busy=true]:opacity-60"
            data-busy={isBusy}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {index + 1}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColor}`}>
                        {typeLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Độ khó: {question.difficultyLevel}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Chỉnh sửa câu hỏi"
                        disabled={isBusy}
                        onClick={() => onEdit(question)}
                        aria-label="Chỉnh sửa câu hỏi"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Thay thế bằng câu hỏi khác"
                        disabled={isBusy}
                        onClick={() => onSwap(question._id)}
                        aria-label="Thay thế câu hỏi"
                    >
                        {isSwapping ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Xóa câu hỏi"
                        disabled={isBusy}
                        onClick={() => onDelete(question._id)}
                        aria-label="Xóa câu hỏi"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            </div>

            <StemText text={question.stem.text} />

            {question.type === 'MULTIPLE_CHOICE' && (
                <MCOptions options={question.content.options} />
            )}
            {question.type === 'FILL_IN_BLANK' && question.content.correctAnswers?.length ? (
                <p className="mt-2 text-sm">
                    <span className="font-medium">Đáp án: </span>
                    {question.content.correctAnswers.join(', ')}
                </p>
            ) : null}

            {question.explanation && (
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Giải thích: </span>
                    {question.explanation}
                </p>
            )}

            {question.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {question.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

function EditQuestionDialog({
    open,
    editState,
    isSaving,
    onClose,
    onSave,
    onChange,
}: {
    open: boolean;
    editState: EditState;
    isSaving: boolean;
    onClose: () => void;
    onSave: () => void;
    onChange: (patch: Partial<EditState>) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Chỉnh sửa câu hỏi</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="reading-edit-stem">Câu hỏi</Label>
                        <Textarea
                            id="reading-edit-stem"
                            rows={3}
                            value={editState.stemText}
                            onChange={(e) => onChange({ stemText: e.target.value })}
                            placeholder="Nhập nội dung câu hỏi…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="reading-edit-explanation">Giải thích (tùy chọn)</Label>
                        <Textarea
                            id="reading-edit-explanation"
                            rows={2}
                            value={editState.explanation}
                            onChange={(e) => onChange({ explanation: e.target.value })}
                            placeholder="Giải thích đáp án…"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button onClick={onSave} disabled={isSaving}>
                        {isSaving && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        Lưu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const PracticeSection = memo(function PracticeSection({ lessonId, questionIds }: Props) {
    const { control, watch } = useFormContext<ReadingLessonFormValues>();
    const passingScore = watch('practiceConfig.passingScore');

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: questions, isLoading } = useReadingQuestions(lessonId, questionIds);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const swapMutation = useSwapReadingQuestion(lessonId);
    const updateMutation = useUpdateReadingQuestion(lessonId);
    const deleteMutation = useDeleteReadingQuestion(lessonId);

    // ── Edit modal state ──────────────────────────────────────────────────────
    const [editState, setEditState] = useState<EditState | null>(null);

    const openEdit = useCallback((q: ReadingQuestionCard) => {
        setEditState({
            questionId: q._id,
            stemText: q.stem.text ?? '',
            explanation: q.explanation ?? '',
        });
    }, []);

    const closeEdit = useCallback(() => setEditState(null), []);

    const handleSaveEdit = useCallback(() => {
        if (!editState) return;
        const body: UpdateReadingQuestionPayload = {
            stem: { text: editState.stemText },
            explanation: editState.explanation || null,
        };
        updateMutation.mutate(
            { questionId: editState.questionId, body },
            { onSuccess: closeEdit },
        );
    }, [editState, updateMutation, closeEdit]);

    return (
        <div className="space-y-5 p-4">
            {/* Passing Score Slider */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="reading-passing-score" className="text-sm font-medium">
                        Điểm qua môn
                    </Label>
                    <span
                        className="tabular-nums text-sm font-semibold text-primary"
                        aria-live="polite"
                        aria-label={`Điểm qua môn hiện tại: ${passingScore}%`}
                    >
                        {passingScore}%
                    </span>
                </div>
                <Controller
                    control={control}
                    name="practiceConfig.passingScore"
                    render={({ field }) => (
                        <Slider
                            id="reading-passing-score"
                            min={50}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            aria-label="Điểm qua môn tối thiểu"
                            aria-valuemin={50}
                            aria-valuemax={100}
                            aria-valuenow={field.value}
                        />
                    )}
                />
                <p className="text-xs text-muted-foreground">
                    Học sinh cần đạt tối thiểu{' '}
                    <strong>{passingScore}%</strong> để hoàn thành bài học này.
                </p>
            </div>

            {/* Question Review Board */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        Câu hỏi comprehension
                        {questions && questions.length > 0 && (
                            <span className="ml-1.5 text-muted-foreground">
                                ({questions.length})
                            </span>
                        )}
                    </p>
                </div>

                {isLoading && questionIds.length > 0 && (
                    <div className="space-y-3">
                        {Array.from({ length: questionIds.length }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-lg" />
                        ))}
                    </div>
                )}

                {!isLoading && questionIds.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                        <p className="text-sm font-medium text-muted-foreground">
                            Chưa có câu hỏi nào
                        </p>
                        <p className="max-w-xs text-xs text-muted-foreground">
                            Nhấn <strong>Tạo câu hỏi</strong> ở thanh trên để tạo câu hỏi
                            tự động từ nội dung bài đọc.
                        </p>
                    </div>
                )}

                {!isLoading && questions && questions.length > 0 && (
                    <div className="space-y-3">
                        {questions.map((q, i) => (
                            <QuestionCard
                                key={q._id}
                                question={q}
                                index={i}
                                onEdit={openEdit}
                                swappingId={
                                    swapMutation.isPending
                                        ? (swapMutation.variables as string)
                                        : null
                                }
                                deletingId={
                                    deleteMutation.isPending
                                        ? (deleteMutation.variables as string)
                                        : null
                                }
                                onSwap={(id) => swapMutation.mutate(id)}
                                onDelete={(id) => deleteMutation.mutate(id)}
                            />
                        ))}
                    </div>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 w-full border-dashed text-muted-foreground hover:text-foreground"
                    disabled
                    title="Tính năng sắp ra mắt"
                    aria-label="Thêm câu hỏi từ Ngân hàng (sắp ra mắt)"
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm câu hỏi từ Ngân hàng
                </Button>
            </div>

            {editState && (
                <EditQuestionDialog
                    open
                    editState={editState}
                    isSaving={updateMutation.isPending}
                    onClose={closeEdit}
                    onSave={handleSaveEdit}
                    onChange={(patch) => setEditState((s) => s && { ...s, ...patch })}
                />
            )}
        </div>
    );
});
