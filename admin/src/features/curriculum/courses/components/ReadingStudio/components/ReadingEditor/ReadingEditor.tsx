import { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TextSection } from './sections/TextSection';
import { GlossarySection } from './sections/GlossarySection';
import type { ReadingSection } from '../../hooks/useReadingStudioState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: ReadingSection;
    isFillGlossaryPending: boolean;
    onFillGlossary: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingEditor = memo(function ReadingEditor({
    activeSection,
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
        </ScrollArea>
    );
});
