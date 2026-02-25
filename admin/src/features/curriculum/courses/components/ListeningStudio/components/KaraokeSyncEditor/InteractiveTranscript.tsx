import { memo, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { TranscriptLine, ListeningLessonFormValues } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lines: TranscriptLine[];
    currentTime: number;
}

interface WordSpanProps {
    word: string;
    isActive: boolean;
    isTarget: boolean;
    onClick: () => void;
}

// ─── Sub-component: WordSpan ───────────────────────────────────────────────

const WordSpan = memo(function WordSpan({ word, isActive, isTarget, onClick }: WordSpanProps) {
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick()}
            title={isTarget ? 'Bỏ đánh dấu từ mục tiêu' : 'Đánh dấu làm từ mục tiêu'}
            className={cn(
                'cursor-pointer rounded px-0.5 py-0 text-sm transition-colors duration-150 select-none',
                'hover:bg-violet-100 dark:hover:bg-violet-900/30',
                isActive && 'bg-violet-200 font-semibold text-violet-900 dark:bg-violet-800/50 dark:text-violet-100',
                isTarget && !isActive && 'text-violet-600 underline decoration-dotted underline-offset-2 dark:text-violet-400',
                !isActive && !isTarget && 'text-foreground',
            )}
        >
            {word}
        </span>
    );
});

// ─── Component ────────────────────────────────────────────────────────────────

export const InteractiveTranscript = memo(function InteractiveTranscript({ lines, currentTime }: Props) {
    const { setValue, getValues } = useFormContext<ListeningLessonFormValues>();

    const toggleTargetVocab = useCallback(
        (lineIdx: number, wordIdx: number) => {
            const line = getValues(`transcript.${lineIdx}`);
            if (!line) return;

            const updatedWords = line.words.map((w, i) =>
                i === wordIdx ? { ...w, isTargetVocab: !w.isTargetVocab } : w,
            );

            setValue(`transcript.${lineIdx}.words`, updatedWords, { shouldDirty: true });
        },
        [getValues, setValue],
    );

    if (lines.length === 0) {
        return (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                Chưa có kịch bản. Hãy tạo kịch bản trước.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 overflow-y-auto p-1" role="list">
            {lines.map((line, lineIdx) => {
                const isActiveLine =
                    currentTime >= (line.startTime ?? Infinity) &&
                    currentTime < (line.endTime ?? -Infinity);

                return (
                    <div
                        key={line.id}
                        role="listitem"
                        className={cn(
                            'rounded-md border p-3 transition-colors duration-200',
                            isActiveLine
                                ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
                                : 'border-border bg-card',
                        )}
                    >
                        {/* Speaker label */}
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                            {line.speaker || 'Speaker'}
                            {line.role ? <span className="ml-1 opacity-60">· {line.role}</span> : null}
                        </p>

                        {/* Words */}
                        <p className="flex flex-wrap gap-x-1 gap-y-0.5 leading-relaxed">
                            {line.words.map((word, wordIdx) => {
                                const isActiveWord =
                                    isActiveLine &&
                                    currentTime >= (word.start ?? Infinity) &&
                                    currentTime < (word.end ?? -Infinity);

                                return (
                                    <WordSpan
                                        key={wordIdx}
                                        word={word.word}
                                        isActive={isActiveWord}
                                        isTarget={word.isTargetVocab ?? false}
                                        onClick={() => toggleTargetVocab(lineIdx, wordIdx)}
                                    />
                                );
                            })}
                        </p>

                        {line.translation ? (
                            <p className="mt-2 text-xs italic text-muted-foreground">
                                {line.translation}
                            </p>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
});
