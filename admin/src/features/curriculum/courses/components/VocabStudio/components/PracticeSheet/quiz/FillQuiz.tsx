import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { IQuestion, FillContent } from '../../../../../types/course.types';
import type { AnswerState } from '../hooks/usePracticeQuiz';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    question: IQuestion;
    answer: AnswerState;
    onAnswer: (state: Partial<AnswerState>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FillQuiz({ question, answer, onAnswer }: Props) {
    const fill = question.content as FillContent;
    const [input, setInput] = useState('');
    const confirmed = answer.confirmed;

    const handleSubmit = () => {
        if (!input.trim() || confirmed) return;
        const isCorrect = fill.correctAnswers.some(
            (a) => a.trim().toLowerCase() === input.trim().toLowerCase(),
        );
        onAnswer({ selected: input.trim(), confirmed: true, isCorrect });
    };

    return (
        <div className="space-y-3">
            <p className="rounded-md bg-muted/50 px-3 py-2 font-mono text-sm text-foreground/90">
                {question.stem.text}
            </p>
            <div className="flex gap-2">
                <Input
                    placeholder="Nhập câu trả lời…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    disabled={confirmed}
                    className="text-sm"
                    aria-label="Nhập câu trả lời điền từ"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                />
                {!confirmed && (
                    <Button size="sm" onClick={handleSubmit} disabled={!input.trim()}>
                        Kiểm tra
                    </Button>
                )}
            </div>
            {confirmed && (
                <p
                    className={`text-sm font-medium ${
                        answer.isCorrect ? 'text-emerald-600' : 'text-red-600'
                    }`}
                >
                    {answer.isCorrect
                        ? '✓ Chính xác!'
                        : `✗ Đáp án đúng: ${fill.correctAnswers[0]}`}
                </p>
            )}
        </div>
    );
}
