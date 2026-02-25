import { memo } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { ListeningLessonFormValues, ListeningInteractiveMode } from '../../../../types/course.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODES: { value: ListeningInteractiveMode; label: string; description: string }[] = [
    {
        value: 'GAP_FILL',
        label: 'Gap-fill',
        description: 'Ẩn một số từ — học viên điền vào chỗ trống khi nghe.',
    },
    {
        value: 'SHADOWING',
        label: 'Shadowing',
        description: 'Học viên lặp lại từng câu để luyện phát âm.',
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const InteractiveConfigEditor = memo(function InteractiveConfigEditor() {
    const { control, watch, setValue } = useFormContext<ListeningLessonFormValues>();

    const { field: modeField } = useController({
        control,
        name: 'interactiveConfig.mode',
    });

    const { field: slowSpeedField } = useController({
        control,
        name: 'interactiveConfig.allowSlowSpeed',
    });

    const hidePercentage = watch('interactiveConfig.hidePercentage');
    const isGapFill = modeField.value === 'GAP_FILL';

    return (
        <div className="flex flex-col gap-6">
            {/* Mode selection */}
            <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Chế độ luyện tập</legend>
                <div className="mt-3 flex flex-col gap-3">
                    {MODES.map(({ value, label, description }) => (
                        <label
                            key={value}
                            htmlFor={`mode-${value}`}
                            className={cn(
                                'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                                modeField.value === value
                                    ? 'border-violet-500 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20'
                                    : 'border-border hover:bg-muted/40',
                            )}
                        >
                            <input
                                type="radio"
                                id={`mode-${value}`}
                                name="interactiveMode"
                                value={value}
                                checked={modeField.value === value}
                                onChange={() => modeField.onChange(value as ListeningInteractiveMode)}
                                className="mt-0.5 accent-violet-600"
                            />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{label}</span>
                                <span className="text-xs text-muted-foreground">{description}</span>
                            </div>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Gap-fill config — only visible when GAP_FILL is selected */}
            {isGapFill && (
                <fieldset className="rounded-lg border p-4">
                    <legend className="px-1 text-sm font-medium">Cấu hình Gap-fill</legend>
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hide-percentage" className="text-sm">
                                Tỉ lệ ẩn từ
                            </Label>
                            <span className="min-w-[3rem] text-right text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                                {hidePercentage}%
                            </span>
                        </div>
                        <Slider
                            id="hide-percentage"
                            min={0}
                            max={100}
                            step={5}
                            value={[hidePercentage]}
                            onValueChange={([v]) =>
                                setValue('interactiveConfig.hidePercentage', v, { shouldDirty: true })
                            }
                            aria-label="Tỉ lệ ẩn từ"
                            className="py-2"
                        />
                        <p className="text-xs text-muted-foreground">
                            Phần trăm số từ sẽ bị ẩn. Từ được ẩn ngẫu nhiên từ danh sách từ mục tiêu.
                        </p>
                    </div>
                </fieldset>
            )}

            {/* Slow speed toggle */}
            <fieldset className="rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Tốc độ nghe</legend>
                <div className="mt-3 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium">Cho phép nghe chậm</p>
                        <p className="text-xs text-muted-foreground">
                            Học viên có thể phát lại ở tốc độ 0.75×.
                        </p>
                    </div>
                    <Switch
                        id="allow-slow-speed"
                        checked={slowSpeedField.value}
                        onCheckedChange={slowSpeedField.onChange}
                        aria-label="Cho phép nghe chậm"
                    />
                </div>
            </fieldset>
        </div>
    );
});
