import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashcardCard } from './FlashcardCard';
import { MicButton } from './MicButton';
import { PronunciationScoreCard } from './PronunciationScoreCard';
import { usePronunciationTest } from '../hooks/usePronunciationTest';
import type { VocabItem } from '../../../../../types/course.types';

interface FlashcardDeckProps {
    items: VocabItem[];
}

type PracticeTarget = 'word' | 'sentence';

export function FlashcardDeck({ items }: FlashcardDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [practiceTarget, setPracticeTarget] = useState<PracticeTarget>('word');

    const { status, result, error, startTest, stopTest, reset } = usePronunciationTest();

    const item = items[currentIndex] ?? null;

    const progressLabel = useMemo(
        () => `${Math.min(currentIndex + 1, items.length)} / ${items.length}`,
        [currentIndex, items.length],
    );

    const sentenceText = item?.exampleSentence?.trim() ?? '';
    const hasSentence = sentenceText.length > 0;
    const referenceText = practiceTarget === 'word'
        ? item?.word?.trim() ?? ''
        : sentenceText;

    const moveToIndex = useCallback((nextIndex: number) => {
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        setPracticeTarget('word');
        reset();
    }, [reset]);

    const handleTargetChange = useCallback((nextTarget: PracticeTarget) => {
        setPracticeTarget(nextTarget);
        reset();
    }, [reset]);

    const handlePrev = useCallback(() => {
        if (currentIndex <= 0) {
            return;
        }
        moveToIndex(currentIndex - 1);
    }, [currentIndex, moveToIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex >= items.length - 1) {
            return;
        }
        moveToIndex(currentIndex + 1);
    }, [currentIndex, items.length, moveToIndex]);

    const handleStart = useCallback(() => {
        if (!referenceText) {
            return;
        }
        void startTest(referenceText);
    }, [referenceText, startTest]);

    if (!item) {
        return null;
    }

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Flashcard pronunciation</span>
                <span>{progressLabel}</span>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    aria-label="Từ trước"
                >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Trước
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentIndex === items.length - 1}
                    className="ml-auto"
                    aria-label="Từ tiếp theo"
                >
                    Sau
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            </div>

            <FlashcardCard
                item={item}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((prev) => !prev)}
            />

            <div className="space-y-2 rounded-lg border bg-muted/20 p-2">
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={practiceTarget === 'word' ? 'default' : 'outline'}
                        className="h-8 flex-1"
                        onClick={() => handleTargetChange('word')}
                        aria-label="Chuyển sang luyện đọc từ vựng"
                    >
                        Luyện đọc từ
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={practiceTarget === 'sentence' ? 'default' : 'outline'}
                        className="h-8 flex-1"
                        onClick={() => handleTargetChange('sentence')}
                        disabled={!hasSentence}
                        aria-label="Chuyển sang luyện đọc câu ví dụ"
                    >
                        Luyện đọc câu
                    </Button>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                    {referenceText || 'Câu ví dụ chưa có nội dung để luyện đọc.'}
                </p>
            </div>

            <MicButton
                status={status}
                onStart={handleStart}
                onStop={stopTest}
                disabled={!referenceText}
            />

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <PronunciationScoreCard result={result} referenceText={referenceText} />
            )}
        </div>
    );
}
