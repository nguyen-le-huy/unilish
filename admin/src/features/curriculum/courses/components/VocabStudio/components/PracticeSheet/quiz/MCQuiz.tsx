import { resolveAudioUrl } from '../../../../../lib/audio.utils';
import { AudioPlayerMini } from '../../AudioPlayerMini/AudioPlayerMini';
import type { IQuestion, MCContent } from '../../../../../types/course.types';
import type { AnswerState } from '../hooks/usePracticeQuiz';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    question: IQuestion;
    answer: AnswerState;
    onAnswer: (state: Partial<AnswerState>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MCQuiz({ question, answer, onAnswer }: Props) {
    const mc = question.content as MCContent;
    const confirmed = answer.confirmed;

    const handleSelect = (optId: string) => {
        if (confirmed) return;
        const isCorrect = mc.options.find((o) => o.id === optId)?.isCorrect ?? false;
        onAnswer({ selected: optId, confirmed: true, isCorrect });
    };

    return (
        <div className="space-y-3">
            {question.stem.audioUrl && (
                <AudioPlayerMini
                    src={resolveAudioUrl(question.stem.audioUrl)}
                    label="câu hỏi"
                    className="w-full"
                />
            )}
            {question.stem.text && (
                <p className="text-sm text-foreground/80">{question.stem.text}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
                {mc.options.map((opt) => {
                    let cls = 'rounded-lg border px-3 py-2 text-left text-sm transition-colors w-full ';
                    if (!confirmed) {
                        cls +=
                            answer.selected === opt.id
                                ? 'border-primary bg-primary/5 font-medium'
                                : 'border-border hover:bg-muted/50 cursor-pointer';
                    } else if (opt.isCorrect) {
                        cls += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-medium';
                    } else if (answer.selected === opt.id && !opt.isCorrect) {
                        cls += 'border-red-300 bg-red-50 text-red-700';
                    } else {
                        cls += 'border-border bg-muted/30 text-muted-foreground';
                    }
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            className={cls}
                            onClick={() => handleSelect(opt.id)}
                            aria-label={`Chọn đáp án: ${opt.text}`}
                            aria-pressed={answer.selected === opt.id}
                        >
                            {confirmed && opt.isCorrect && '✓ '}
                            {opt.text}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
