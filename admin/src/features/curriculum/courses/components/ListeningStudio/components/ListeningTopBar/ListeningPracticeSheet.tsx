import { memo, useMemo } from 'react';
import { GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useListeningQuestions } from '../../../../hooks/useListeningQuestions';
import { TryTab } from '../../../VocabStudio/components/PracticeSheet/TryTab';
import type {
    IQuestion,
    ListeningQuestionCard,
    MCContent,
    FillContent,
    MatchContent,
} from '../../../../types/course.types';

interface Props {
    lessonId: string;
    questionIds: string[];
    passingScore: number;
}

function toIQuestion(question: ListeningQuestionCard): IQuestion {
    const normalizedType = question.type === 'TRUE_FALSE' ? 'MULTIPLE_CHOICE' : question.type;

    let content: MCContent | FillContent | MatchContent;

    if (normalizedType === 'MULTIPLE_CHOICE') {
        const fallbackOptions = question.type === 'TRUE_FALSE'
            ? [
                { id: 'opt_true', text: 'True', isCorrect: true },
                { id: 'opt_false', text: 'False', isCorrect: false },
            ]
            : [];

        content = { options: question.content.options ?? fallbackOptions } as MCContent;
    } else if (normalizedType === 'FILL_IN_BLANK') {
        content = { correctAnswers: question.content.correctAnswers ?? [] } as FillContent;
    } else {
        content = { pairs: question.content.pairs ?? [] } as MatchContent;
    }

    return {
        _id: question._id,
        languageId: '',
        testedConcept: '',
        type: normalizedType,
        difficultyLevel: question.difficultyLevel,
        stem: question.stem,
        content,
        explanation: question.explanation,
        tags: question.tags,
        createdAt: '',
        updatedAt: '',
    };
}

export const ListeningPracticeSheet = memo(function ListeningPracticeSheet({
    lessonId,
    questionIds,
    passingScore,
}: Props) {
    const { data: cards, isLoading } = useListeningQuestions(lessonId, questionIds);

    const questions = useMemo<IQuestion[]>(() => (cards ?? []).map(toIQuestion), [cards]);
    const hasQuestions = questions.length > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={questionIds.length === 0}
                    aria-label="Làm thử bài tập nghe hiểu"
                >
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Làm thử
                    {hasQuestions && (
                        <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                            {questions.length}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:w-[460px]">
                <SheetHeader className="shrink-0 border-b px-4 py-3">
                    <SheetTitle className="flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        Làm thử bài nghe hiểu
                    </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col overflow-hidden">
                    {isLoading ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <Skeleton key={index} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : hasQuestions ? (
                        <TryTab questions={questions} passingScore={passingScore} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                            <GraduationCap
                                className="h-12 w-12 text-muted-foreground/30"
                                aria-hidden="true"
                            />
                            <p className="text-sm text-muted-foreground">
                                Chưa có câu hỏi luyện tập.
                                <br />
                                Hãy tạo câu hỏi trước.
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
});
