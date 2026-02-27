import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ListeningLessonFormValues } from '../../../../types/course.types';

// ─── Component ────────────────────────────────────────────────────────────────

export const MediaSettingsPanel = memo(function MediaSettingsPanel() {
    const { control } = useFormContext<ListeningLessonFormValues>();

    return (
        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4">
            <FormField
                control={control}
                name="media.accent"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-medium">Giọng đọc (Accent)</FormLabel>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <FormControl>
                                <SelectTrigger aria-label="Chọn giọng đọc">
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="en-US">🇺🇸 American English</SelectItem>
                                <SelectItem value="en-UK">🇬🇧 British English</SelectItem>
                                <SelectItem value="mixed">🌍 Mixed Accents</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="media.noiseLevel"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-medium">Tạp âm nền (Noise)</FormLabel>
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}
                        >
                            <FormControl>
                                <SelectTrigger aria-label="Chọn mức độ tạp âm">
                                    <SelectValue />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">🔇 Không có tạp âm</SelectItem>
                                <SelectItem value="low">🔉 Thấp (Coffee shop)</SelectItem>
                                <SelectItem value="medium">🔊 Trung bình (Office)</SelectItem>
                                <SelectItem value="high">📢 Cao (Sân bay / Ga)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
});
