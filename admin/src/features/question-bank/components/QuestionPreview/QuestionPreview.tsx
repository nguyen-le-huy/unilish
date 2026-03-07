import { CheckCircle, Volume2, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ICreateQuestionPayload } from '../../types';
import {
    QUESTION_DIFFICULTY_COLORS,
    QUESTION_SKILL_LABELS,
} from '../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    formValues: Partial<ICreateQuestionPayload>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionPreview({ formValues }: Props) {
    const { stem, options = [], correctAnswer, tags = [], difficulty, skill } = formValues;

    const hasContent = !!(stem?.text || stem?.audioUrl || stem?.imageUrl);

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-muted/30 p-5 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Xem trước
                </p>
                <div className="flex items-center gap-1.5">
                    {difficulty && (
                        <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${QUESTION_DIFFICULTY_COLORS[difficulty] ?? ''}`}
                        >
                            {difficulty}
                        </span>
                    )}
                    {skill && (
                        <Badge variant="outline" className="text-xs">
                            {QUESTION_SKILL_LABELS[skill] ?? skill}
                        </Badge>
                    )}
                </div>
            </div>

            {!hasContent ? (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-muted-foreground italic">
                        Điền nội dung câu hỏi để xem trước...
                    </p>
                </div>
            ) : (
                <>
                    {/* Stem */}
                    <div className="flex flex-col gap-2">
                        {/* Audio player placeholder */}
                        {stem?.audioUrl && (
                            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                                <Volume2 className="h-4 w-4 shrink-0" />
                                <span className="text-xs truncate">{stem.audioUrl}</span>
                            </div>
                        )}

                        {/* Image */}
                        {stem?.imageUrl && (
                            <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-purple-700">
                                <Image className="h-4 w-4 shrink-0" />
                                <span className="text-xs truncate">{stem.imageUrl}</span>
                            </div>
                        )}

                        {/* Text */}
                        {stem?.text && (
                            <p className="text-sm font-medium leading-relaxed">{stem.text}</p>
                        )}
                    </div>

                    {/* Options */}
                    {options.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {options.map((opt, i) => {
                                const key = opt.key ?? String.fromCharCode(65 + i);
                                const isCorrect = correctAnswer === key;

                                return (
                                    <div
                                        key={key}
                                        className={cn(
                                            'flex items-start gap-2.5 rounded-md border px-3 py-2 text-sm',
                                            isCorrect
                                                ? 'border-green-400 bg-green-50 text-green-800'
                                                : 'border-transparent bg-background',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5',
                                                isCorrect
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {key}
                                        </span>
                                        <span className="flex-1">{opt.text || <em className="text-muted-foreground">Chưa có nội dung</em>}</span>
                                        {isCorrect && (
                                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2 border-t">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
