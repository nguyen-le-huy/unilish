import { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextSection } from './sections/TextSection';
import { GlossarySection } from './sections/GlossarySection';
import { PracticeSection } from './sections/PracticeSection';
import type { ReadingSection } from '../../hooks/useReadingStudioState';
import type { ReadingContent } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: ReadingSection;
    lessonId: string;
    questionIds: ReadingContent['practiceConfig']['questionIds'];
    isFillGlossaryPending: boolean;
    onFillGlossary: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingEditor = memo(function ReadingEditor({
    activeSection,
    lessonId,
    questionIds,
    isFillGlossaryPending,
    onFillGlossary,
}: Props) {
    return (
        <ScrollArea className="h-full">
            {activeSection === 'text' && (
                <TextSection
                    isFillGlossaryPending={isFillGlossaryPending}
                    onFillGlossary={onFillGlossary}
                />
            )}
            {activeSection === 'glossary' && <GlossarySection />}
            {activeSection === 'practice' && (
                <PracticeSection lessonId={lessonId} questionIds={questionIds} />
            )}
        </ScrollArea>
    );
});
