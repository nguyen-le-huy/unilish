import { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StoryEditor } from './sections/StoryEditor';
import { RuleEditor } from './sections/RuleEditor';
import { PracticeEditor } from './sections/PracticeEditor';
import type { GrammarSection } from '../../hooks/useGrammarStudioState';
import type { GrammarContent } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: GrammarSection;
    lessonId: string;
    questionIds: GrammarContent['practiceConfig']['questionIds'];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GrammarEditor = memo(function GrammarEditor({ activeSection, lessonId, questionIds }: Props) {
    return (
        <ScrollArea className="h-full">
            {activeSection === 'story' && <StoryEditor />}
            {activeSection === 'rules' && <RuleEditor />}
            {activeSection === 'practice' && (
                <PracticeEditor lessonId={lessonId} questionIds={questionIds} />
            )}
        </ScrollArea>
    );
});
