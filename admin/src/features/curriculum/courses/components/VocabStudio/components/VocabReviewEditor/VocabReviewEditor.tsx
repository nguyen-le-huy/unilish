import { memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentTab } from './tabs/ContentTab';
import { PracticeTab } from './tabs/PracticeTab';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    item: VocabItem;
    onItemChange: (field: keyof VocabItem, value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabReviewEditor = memo(function VocabReviewEditor({
    lessonId,
    item,
    onItemChange,
}: Props) {
    return (
        <div className="flex h-full flex-col">
            {/* Item header */}
            <div className="shrink-0 border-b px-4 py-2.5">
                <p className="text-base font-semibold">{item.word}</p>
                {item.ipa && (
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/{item.ipa}/</p>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="content" className="flex flex-1 flex-col overflow-hidden">
                <TabsList className="shrink-0 rounded-none border-b justify-start gap-0 h-9 px-4 bg-background">
                    <TabsTrigger
                        value="content"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full text-xs"
                    >
                        Nội dung
                    </TabsTrigger>
                    <TabsTrigger
                        value="practice"
                        className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none h-full text-xs"
                    >
                        Luyện tập
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="flex-1 overflow-hidden mt-0">
                    <ContentTab lessonId={lessonId} item={item} onItemChange={onItemChange} />
                </TabsContent>

                <TabsContent value="practice" className="flex-1 overflow-hidden mt-0">
                    <PracticeTab />
                </TabsContent>
            </Tabs>
        </div>
    );
});
