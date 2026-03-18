import { memo } from 'react';
import { GraduationCap } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLessonQuestions } from '../../../../hooks/useVocabQuestions';
import { ManageTab } from './ManageTab';
import { TryTab } from './TryTab';
import { PronounceTab } from './pronunciation/PronounceTab';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    passingScore: number;
    items: VocabItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PracticeSheet = memo(function PracticeSheet({ lessonId, passingScore, items }: Props) {
    const { data: questions, isLoading, isError } = useLessonQuestions(lessonId);
    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    const hasVocabItems = items.length > 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-label="Mở bảng luyện tập"
                >
                    <GraduationCap className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Luyện tập
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
                        Luyện tập
                    </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="manage" className="flex flex-1 flex-col overflow-hidden">
                    <TabsList className="h-9 shrink-0 justify-start gap-0 rounded-none border-b bg-background px-4">
                        <TabsTrigger
                            value="manage"
                            className="h-full rounded-none px-3 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                        >
                            Quản lý
                        </TabsTrigger>
                        <TabsTrigger
                            value="try"
                            className="h-full rounded-none px-3 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                            disabled={!hasQuestions}
                        >
                            Làm thử
                            {!hasQuestions && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                    (chưa có câu hỏi)
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="pronounce"
                            className="h-full rounded-none px-3 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                            disabled={!hasVocabItems}
                        >
                            Phát âm
                            {!hasVocabItems && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                    (chưa có từ)
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manage" className="mt-0 flex-1 overflow-hidden">
                        <ManageTab
                            lessonId={lessonId}
                            passingScore={passingScore}
                            questions={questions}
                            isLoading={isLoading}
                            isError={isError}
                        />
                    </TabsContent>

                    <TabsContent value="try" className="mt-0 flex-1 overflow-hidden">
                        {hasQuestions ? (
                            <TryTab questions={questions} passingScore={passingScore} />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <p className="text-sm text-muted-foreground">Chưa có câu hỏi.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="pronounce" className="mt-0 flex-1 overflow-hidden">
                        <PronounceTab items={items} />
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
});

