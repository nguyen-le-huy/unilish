import type { VocabItem } from '../../../../../types/course.types';
import { FlashcardDeck } from './FlashcardDeck';

interface PronounceTabProps {
    items: VocabItem[];
}

export function PronounceTab({ items }: PronounceTabProps) {
    if (items.length === 0) {
        return (
            <div className="flex h-full items-center justify-center px-6 text-center">
                <p className="text-sm text-muted-foreground">Chưa có từ vựng để test phát âm.</p>
            </div>
        );
    }

    return <FlashcardDeck items={items} />;
}
