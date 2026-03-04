import { useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { QuestionForm } from '../../components/QuestionForm/QuestionForm';
import { questionApi } from '../../api/question.api';
import { useQuestionByIdQuery } from '../../hooks/useQuestionByIdQuery';
import { useCreateQuestion, useUpdateQuestion } from '../../hooks/useQuestionMutations';
import type { ICreateQuestionPayload } from '../../types';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionEditorPage() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isEditMode = !!id;

    const prefill = useMemo(() => {
        const source = searchParams.get('source');
        const skill = searchParams.get('skill');
        const part = searchParams.get('part');
        const languageId = searchParams.get('languageId');

        return {
            source: source ?? undefined,
            skill: skill ?? undefined,
            part: part ? Number(part) : undefined,
            languageId: languageId ?? undefined,
        };
    }, [searchParams]);

    // ── Data (edit mode only) ─────────────────────────────────────────────────
    const { data: question, isLoading: isLoadingQuestion } = useQuestionByIdQuery(id ?? '');

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: createQuestion, isPending: isCreating } = useCreateQuestion();
    const { mutate: updateQuestion, isPending: isUpdating } = useUpdateQuestion();

    const isSubmitting = isCreating || isUpdating;

    // ── Handlers ──────────────────────────────────────────────────────────────

    function handleSaveDraft(payload: ICreateQuestionPayload) {
        const finalPayload = { ...payload, status: 'draft' as const };
        if (isEditMode && id) {
            updateQuestion({ id, payload: finalPayload });
        } else {
            createQuestion(finalPayload, {
                onSuccess: (created) => navigate(`/questions/${created._id}/edit`),
            });
        }
    }

    function handleSubmitForReview(payload: ICreateQuestionPayload) {
        const finalPayload = { ...payload, status: 'in_review' as const };
        if (isEditMode && id) {
            updateQuestion({ id, payload: finalPayload });
        } else {
            createQuestion(finalPayload, {
                onSuccess: (created) => navigate(`/questions/${created._id}/edit`),
            });
        }
    }

    async function handleAutoSave(payload: ICreateQuestionPayload): Promise<void> {
        if (!isEditMode || !id) return;

        const finalPayload = { ...payload, status: 'draft' as const };
        await questionApi.update(id, finalPayload);
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────

    if (isEditMode && isLoadingQuestion) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
                <Link to="/questions" className="hover:text-foreground transition-colors">
                    Ngân hàng Câu hỏi
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">
                    {isEditMode ? 'Chỉnh sửa câu hỏi' : 'Tạo câu hỏi mới'}
                </span>
            </nav>

            {/* Main form */}
            <QuestionForm
                defaultValues={question}
                prefillValues={prefill}
                isSubmitting={isSubmitting}
                onSaveDraft={handleSaveDraft}
                onSubmitForReview={handleSubmitForReview}
                onAutoSave={isEditMode ? handleAutoSave : undefined}
            />
        </div>
    );
}
