import { memo, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Wand2, Loader2, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { ReadingLessonFormValues } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    isFillGlossaryPending: boolean;
    onFillGlossary: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TextSection = memo(function TextSection({
    isFillGlossaryPending,
    onFillGlossary,
}: Props) {
    const { register, watch, formState: { errors } } = useFormContext<ReadingLessonFormValues>();

    const text = watch('text');
    const glossaryKeys = Object.keys(watch('glossary') ?? {});

    // Count <mark> tags in the HTML to show marked word count
    const markCount = (text ?? '').match(/<mark\s/gi)?.length ?? 0;

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold">Nội dung văn bản</h3>
                    <p className="text-xs text-muted-foreground">
                        Soạn bài đọc với HTML. Dùng{' '}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                            {'<mark data-concept="gen_1">word</mark>'}
                        </code>{' '}
                        để đánh dấu từ vựng.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {markCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            <BookMarked className="mr-1 h-3 w-3" />
                            {markCount} từ được đánh dấu
                        </Badge>
                    )}
                    {glossaryKeys.length > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onFillGlossary}
                            disabled={isFillGlossaryPending}
                            aria-label="AI điền định nghĩa cho glossary"
                        >
                            {isFillGlossaryPending ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                                <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            AI điền nghĩa
                        </Button>
                    )}
                </div>
            </div>

            {/* HTML text editor */}
            <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="reading-text" className="text-xs font-medium text-muted-foreground">
                    Bài đọc (HTML)
                </Label>
                <Textarea
                    id="reading-text"
                    className="min-h-[280px] flex-1 font-mono text-xs leading-relaxed resize-none"
                    placeholder={'<p>Nhập nội dung bài đọc tại đây...</p>'}
                    aria-label="Nội dung bài đọc HTML"
                    {...register('text')}
                />
                {errors.text && (
                    <p className="text-xs text-destructive" role="alert">
                        {errors.text.message}
                    </p>
                )}
            </div>

            {/* Vietnamese translation */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="reading-translation" className="text-xs font-medium text-muted-foreground">
                    Bản dịch (Tiếng Việt)
                </Label>
                <Textarea
                    id="reading-translation"
                    className="min-h-[140px] resize-none text-sm leading-relaxed"
                    placeholder="Nhập bản dịch tiếng Việt của bài đọc…"
                    aria-label="Bản dịch tiếng Việt"
                    {...register('translation')}
                />
            </div>

            {/* Live Preview */}
            {text && (
                <div className="rounded-md border bg-muted/30 p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Xem trước</p>
                    <div
                        className="prose prose-sm max-w-none dark:prose-invert reading-preview [&_mark]:bg-transparent [&_mark]:font-bold [&_mark]:text-green-600 dark:[&_mark]:text-green-400"
                        dangerouslySetInnerHTML={{ __html: text }}
                    />
                </div>
            )}
        </div>
    );
});
