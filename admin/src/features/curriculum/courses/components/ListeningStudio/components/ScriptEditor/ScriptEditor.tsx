import { memo, useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    ListeningLessonFormValues,
    ListeningScriptFormat,
} from '../../../../types/course.types';
import { MediaSettingsPanel } from './MediaSettingsPanel';
import { TranscriptLineItem } from './TranscriptLineItem';

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    desiredPrompt: string;
    scriptFormat: ListeningScriptFormat;
    onDesiredPromptChange: (value: string) => void;
    onScriptFormatChange: (value: ListeningScriptFormat) => void;
}

export const ScriptEditor = memo(function ScriptEditor({
    desiredPrompt,
    scriptFormat,
    onDesiredPromptChange,
    onScriptFormatChange,
}: Props) {
    const { control } = useFormContext<ListeningLessonFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'transcript',
        keyName: 'fieldId', // use custom key to avoid conflict with our 'id' field
    });

    const handleAddLine = useCallback(() => {
        append({
            id: crypto.randomUUID(),
            speaker: '',
            role: '',
            text: '',
            translation: '',
            startTime: 0,
            endTime: 0,
            words: [],
        });
    }, [append]);

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <h3 className="text-sm font-semibold text-foreground">Nội dung mong muốn cho kịch bản AI</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Select
                        value={scriptFormat}
                        onValueChange={(value) => onScriptFormatChange(value as ListeningScriptFormat)}
                    >
                        <SelectTrigger aria-label="Chọn định dạng kịch bản AI">
                            <SelectValue placeholder="Chọn định dạng" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DIALOGUE">Hội thoại (Dialogue)</SelectItem>
                            <SelectItem value="PODCAST">Podcast</SelectItem>
                            <SelectItem value="NEWS">News / Bản tin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Input
                    value={desiredPrompt}
                    onChange={(event) => onDesiredPromptChange(event.target.value)}
                    placeholder="VD: Cuộc hội thoại giữa 2 người tại sân bay về thất lạc hành lý"
                    aria-label="Nội dung mong muốn cho kịch bản"
                />
                <p className="text-xs text-muted-foreground">
                    Để trống sẽ tự động dùng tên bài học làm chủ đề tạo nội dung.
                </p>
            </div>

            {/* Media settings */}
            <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                    Cài đặt Âm thanh
                </h3>
                <MediaSettingsPanel />
            </div>

            {/* Script editor */}
            <div>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                        Kịch bản hội thoại
                        {fields.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                ({fields.length} dòng)
                            </span>
                        )}
                    </h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddLine}
                        aria-label="Thêm dòng thoại"
                    >
                        <PlusCircle className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                        Thêm dòng
                    </Button>
                </div>

                {fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                        <p>Chưa có kịch bản.</p>
                        <p className="text-xs">
                            Nhấn&nbsp;
                            <span className="font-medium text-primary">AI Viết Kịch bản</span>
                            &nbsp;ở thanh trên hoặc tự thêm dòng thoại.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {fields.map((field, index) => (
                            <TranscriptLineItem
                                key={field.fieldId}
                                index={index}
                                onRemove={() => remove(index)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});
