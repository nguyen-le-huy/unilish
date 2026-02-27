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
import { useReadingQuestions } from '../../../../hooks/useReadingQuestions';
import { TryTab } from '../../../VocabStudio/components/PracticeSheet/TryTab';
import type {
    ReadingQuestionCard,
    IQuestion,
    MCContent,
    FillContent,
    MatchContent,
} from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    questionIds: string[];
    passingScore: number;
}

// ─── Adapter: ReadingQuestionCard → IQuestion ─────────────────────────────────

function toIQuestion(q: ReadingQuestionCard): IQuestion {
    let content: MCContent | FillContent | MatchContent;

    if (q.type === 'MULTIPLE_CHOICE') {
        content = { options: q.content.options ?? [] } as MCContent;
    } else if (q.type === 'FILL_IN_BLANK') {
        content = { correctAnswers: q.content.correctAnswers ?? [] } as FillContent;
    } else {
        content = { pairs: q.content.pairs ?? [] } as MatchContent;
    }

    return {
        _id: q._id,
        languageId: '',
        testedConcept: '',
        type: q.type,
        difficultyLevel: q.difficultyLevel,
        stem: {
            text: q.stem.text,
            audioUrl: q.stem.audioUrl === null ? undefined : q.stem.audioUrl,
            imageUrl: q.stem.imageUrl === null ? undefined : q.stem.imageUrl,
        },
        content,
        explanation: q.explanation,
        tags: q.tags,
        createdAt: '',
        updatedAt: '',
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingPracticeSheet = memo(function ReadingPracticeSheet({
    lessonId,
    questionIds,
    passingScore,
}: Props) {
    const { data: cards, isLoading } = useReadingQuestions(lessonId, questionIds);

    const questions = useMemo<IQuestion[]>(
        () => (cards ?? []).map(toIQuestion),
        [cards],
    );

    const hasQuestions = questions.length > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={questionIds.length === 0}
                    aria-label="Làm thử bài tập đọc hiểu"
                >
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Làm thử
                    {hasQuestions && (
                        <Badge
                            variant="secondary"
                            className="ml-0.5 h-4 px-1 text-[10px]"
                        >
                            {questions.length}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-[420px] flex-col p-0 sm:w-[460px]">
                <SheetHeader className="shrink-0 border-b px-4 py-3">
                    <SheetTitle className="flex items-center gap-2 text-sm">
                        <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        Làm thử bài đọc hiểu
                    </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col overflow-hidden">
                    {isLoading ? (
                        <div className="space-y-3 p-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
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
