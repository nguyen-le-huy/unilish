import { memo, useCallback, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
    GraduationCap,
    ListChecks,
    BookOpen,
    Loader2,
    Pencil,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useListeningQuestions } from '../../../../hooks/useListeningQuestions';
import {
    useSwapListeningQuestion,
    useUpdateListeningQuestion,
    useDeleteListeningQuestion,
} from '../../../../hooks/useListeningMutations';
import type {
    ListeningLessonFormValues,
    ListeningQuestionCard,
    UpdateListeningQuestionPayload,
} from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    questionIds: string[];
    questionCount: number;
}

interface EditState {
    questionId: string;
    stemText: string;
    explanation: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PracticeQuestionsPanel = memo(function PracticeQuestionsPanel({
    lessonId,
    questionIds,
    questionCount,
}: Props) {
    const { register } = useFormContext<ListeningLessonFormValues>();
    const { data: questions, isLoading } = useListeningQuestions(lessonId, questionIds);
    const swapMutation = useSwapListeningQuestion(lessonId);
    const updateMutation = useUpdateListeningQuestion(lessonId);
    const deleteMutation = useDeleteListeningQuestion(lessonId);
    const [editState, setEditState] = useState<EditState | null>(null);

    const openEdit = useCallback((question: ListeningQuestionCard) => {
        setEditState({
            questionId: question._id,
            stemText: question.stem.text ?? '',
            explanation: question.explanation ?? '',
        });
    }, []);

    const closeEdit = useCallback(() => setEditState(null), []);

    const handleSaveEdit = useCallback(() => {
        if (!editState) return;
        const body: UpdateListeningQuestionPayload = {
            stem: { text: editState.stemText },
            explanation: editState.explanation || null,
        };
        updateMutation.mutate({ questionId: editState.questionId, body }, { onSuccess: closeEdit });
    }, [closeEdit, editState, updateMutation]);

    return (
        <div className="flex flex-col gap-6">
            {/* Stats overview */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                        Câu hỏi hiện có
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                        {questionCount}
                    </span>
                </div>
                <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                    <Label
                        htmlFor="passing-score"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                        Điểm đạt (%)
                    </Label>
                    <Input
                        id="passing-score"
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        className="h-8 text-base font-semibold tabular-nums"
                        {...register('practiceConfig.passingScore', { valueAsNumber: true })}
                    />
                </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                        Review câu hỏi
                        {questions && questions.length > 0 && (
                            <span className="ml-1.5 text-muted-foreground">({questions.length})</span>
                        )}
                    </p>
                </div>

                {isLoading && questionIds.length > 0 && (
                    <div className="space-y-2">
                        {Array.from({ length: questionIds.length }).map((_, index) => (
                            <Skeleton key={index} className="h-20 w-full rounded-lg" />
                        ))}
                    </div>
                )}

                {!isLoading && questionIds.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-7 text-center">
                        <BookOpen className="h-7 w-7 text-muted-foreground/50" aria-hidden="true" />
                        <p className="text-sm font-medium text-muted-foreground">Chưa có câu hỏi nào</p>
                    </div>
                )}

                {!isLoading && questions && questions.length > 0 && (
                    <div className="space-y-2">
                        {questions.map((question) => {
                            const isSwapping = swapMutation.isPending && swapMutation.variables === question._id;
                            const isDeleting = deleteMutation.isPending && deleteMutation.variables === question._id;
                            const isBusy = isSwapping || isDeleting;
                            return (
                                <div
                                    key={question._id}
                                    className="rounded-md border p-3 data-[busy=true]:opacity-60"
                                    data-busy={isBusy}
                                >
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <Badge variant="secondary" className="text-[11px]">
                                            {question.type}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openEdit(question)}
                                                disabled={isBusy}
                                                aria-label="Chỉnh sửa câu hỏi"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => swapMutation.mutate(question._id)}
                                                disabled={isBusy}
                                                aria-label="Thay câu hỏi"
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
                                                onClick={() => deleteMutation.mutate(question._id)}
                                                disabled={isBusy}
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
                                    <p className="text-sm leading-relaxed">{question.stem.text}</p>
                                    {question.explanation && (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {question.explanation}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Dialog open={!!editState} onOpenChange={(isOpen) => !isOpen && closeEdit()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa câu hỏi listening</DialogTitle>
                    </DialogHeader>
                    {editState && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="listening-edit-stem">Câu hỏi</Label>
                                <Textarea
                                    id="listening-edit-stem"
                                    rows={3}
                                    value={editState.stemText}
                                    onChange={(event) =>
                                        setEditState((prev) =>
                                            prev
                                                ? { ...prev, stemText: event.target.value }
                                                : prev,
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="listening-edit-explanation">Giải thích</Label>
                                <Textarea
                                    id="listening-edit-explanation"
                                    rows={2}
                                    value={editState.explanation}
                                    onChange={(event) =>
                                        setEditState((prev) =>
                                            prev
                                                ? { ...prev, explanation: event.target.value }
                                                : prev,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={closeEdit}>
                            Hủy
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                            )}
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
