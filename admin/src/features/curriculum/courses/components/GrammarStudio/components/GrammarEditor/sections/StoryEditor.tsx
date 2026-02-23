import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import { AlertTriangle, Volume2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HighlightTable } from '../blocks/HighlightTable';
import type { GrammarLessonFormValues } from '../../../../../types/course.types';

// ─── Component ────────────────────────────────────────────────────────────────

export const StoryEditor = memo(function StoryEditor() {
    const { register, watch, formState: { errors } } = useFormContext<GrammarLessonFormValues>();

    const audioUrl = watch('context_story.audioUrl');
    const highlights = watch('context_story.highlights');

    const hasHighlightWarning = highlights.length === 0;

    return (
        <div className="space-y-5 p-4">
            {/* ── Warning banner ─────────────────────────────────────────── */}
            {hasHighlightWarning && (
                <div
                    className="flex items-start gap-2 rounded-md border border-yellow-400/50 bg-yellow-50 px-3 py-2.5 text-xs text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-950/30 dark:text-yellow-400"
                    role="alert"
                >
                    <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                    />
                    <p>
                        Đoạn truyện chưa có từ nổi bật nào. Hãy thêm các từ để
                        học sinh biết cần chú ý vào điểm ngữ pháp nào.
                    </p>
                </div>
            )}

            {/* ── Story text ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label htmlFor="story-text" className="text-sm font-medium">
                    Đoạn truyện (tiếng Anh)
                </Label>
                <Textarea
                    id="story-text"
                    {...register('context_story.text')}
                    placeholder="Enter the context story in English…"
                    rows={6}
                    aria-invalid={!!errors.context_story?.text}
                    className="resize-none font-mono text-sm leading-relaxed"
                />
                {errors.context_story?.text && (
                    <p className="text-xs text-destructive" role="alert">
                        {errors.context_story.text.message}
                    </p>
                )}
            </div>

            {/* ── Translation ────────────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label htmlFor="story-translation" className="text-sm font-medium">
                    Bản dịch (tiếng Việt)
                </Label>
                <Textarea
                    id="story-translation"
                    {...register('context_story.translation')}
                    placeholder="Nhập bản dịch…"
                    rows={4}
                    className="resize-none text-sm"
                />
            </div>

            {/* ── Audio player mini ──────────────────────────────────────── */}
            {audioUrl && (
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                        <Volume2 className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                        Nghe đoạn truyện
                    </Label>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                        controls
                        src={audioUrl}
                        className="h-8 w-full"
                        aria-label="Phát âm thanh đoạn truyện ngữ cảnh"
                    />
                </div>
            )}

            {/* ── Highlight table ────────────────────────────────────────── */}
            <HighlightTable />
        </div>
    );
});
