import { useState, useMemo } from 'react';
import type { IQuestion, MatchContent } from '../../../../../types/course.types';
import type { AnswerState } from '../hooks/usePracticeQuiz';
import { shuffleArray } from '../../../../../lib/array.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    question: IQuestion;
    answer: AnswerState;
    onAnswer: (state: Partial<AnswerState>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchQuiz({ question, answer, onAnswer }: Props) {
    const match = question.content as MatchContent;
    const confirmed = answer.confirmed;
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [userPairs, setUserPairs] = useState<Record<string, string>>({});

    // Shuffle definitions once on mount
    const shuffledDefs = useMemo(
        () => shuffleArray(match.pairs.map((p) => p.definition)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [question._id],
    );

    const handleWordClick = (word: string) => {
        if (confirmed) return;
        setSelectedWord(word === selectedWord ? null : word);
    };

    const handleDefClick = (def: string) => {
        if (confirmed || !selectedWord) return;
        const next = { ...userPairs, [selectedWord]: def };
        setUserPairs(next);
        setSelectedWord(null);

        // Auto-confirm once all pairs are matched
        if (Object.keys(next).length === match.pairs.length) {
            const correctCount = match.pairs.filter((p) => next[p.word] === p.definition).length;
            onAnswer({
                confirmed: true,
                isCorrect: correctCount === match.pairs.length,
                matchSelections: next,
            });
        }
    };

    const usedDefs = Object.values(userPairs);

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{question.stem.text}</p>
            <div className="grid grid-cols-2 gap-2">
                {/* Words column */}
                <div className="space-y-1.5">
                    {match.pairs.map((pair) => {
                        const isPaired = userPairs[pair.word] !== undefined;
                        let cls = 'w-full rounded-md border px-2.5 py-2 text-left text-sm font-medium transition-colors ';
                        if (confirmed) {
                            cls +=
                                pair.definition === userPairs[pair.word]
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-red-300 bg-red-50 text-red-700';
                        } else if (selectedWord === pair.word) {
                            cls += 'border-primary bg-primary/10 cursor-pointer';
                        } else if (isPaired) {
                            cls += 'border-border bg-muted/40 text-muted-foreground cursor-pointer';
                        } else {
                            cls += 'border-border hover:border-primary/50 cursor-pointer';
                        }
                        return (
                            <button
                                key={pair.word}
                                type="button"
                                className={cls}
                                onClick={() => handleWordClick(pair.word)}
                                aria-label={`Chọn từ: ${pair.word}`}
                                aria-pressed={selectedWord === pair.word}
                            >
                                {pair.word}
                            </button>
                        );
                    })}
                </div>

                {/* Definitions column */}
                <div className="space-y-1.5">
                    {shuffledDefs.map((def) => {
                        const isUsed = usedDefs.includes(def);
                        let cls = 'w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors ';
                        if (confirmed || isUsed) {
                            cls += 'border-border bg-muted/30 text-muted-foreground';
                        } else if (selectedWord) {
                            cls += 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
                        } else {
                            cls += 'border-border text-muted-foreground';
                        }
                        return (
                            <button
                                key={def}
                                type="button"
                                className={cls}
                                onClick={() => handleDefClick(def)}
                                aria-label={`Chọn nghĩa: ${def}`}
                                disabled={confirmed || isUsed}
                            >
                                {def}
                            </button>
                        );
                    })}
                </div>
            </div>
            {confirmed && (
                <p
                    className={`text-sm font-medium ${
                        answer.isCorrect ? 'text-emerald-600' : 'text-red-600'
                    }`}
                >
                    {answer.isCorrect
                        ? '✓ Hoàn hảo!'
                        : '✗ Có cặp sai — đáp án đúng đã được hiển thị ở phần giải thích'}
                </p>
            )}
        </div>
    );
}
