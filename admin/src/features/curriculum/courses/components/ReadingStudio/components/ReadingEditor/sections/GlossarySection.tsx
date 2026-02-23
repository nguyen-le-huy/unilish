import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import { BookMarked, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    ReadingLessonFormValues,
    ReadingPartOfSpeech,
} from '../../../../../types/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PART_OF_SPEECH_OPTIONS: { value: ReadingPartOfSpeech; label: string }[] = [
    { value: 'noun',      label: 'Danh từ' },
    { value: 'verb',      label: 'Động từ' },
    { value: 'adjective', label: 'Tính từ' },
    { value: 'adverb',    label: 'Trạng từ' },
    { value: 'phrase',    label: 'Cụm từ' },
    { value: 'other',     label: 'Khác' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const GlossarySection = memo(function GlossarySection() {
    const { watch, register, setValue } = useFormContext<ReadingLessonFormValues>();
    const glossary = watch('glossary') ?? {};
    const entries = Object.entries(glossary);

    if (entries.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <BookMarked
                    className="h-12 w-12 text-muted-foreground/30"
                    aria-hidden="true"
                />
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        Chưa có từ vựng nào được đánh dấu
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                        Sử dụng{' '}
                        <code className="rounded bg-muted px-1 py-0.5">
                            {'<mark data-concept="gen_1">'}
                        </code>{' '}
                        trong phần văn bản để thêm từ vào glossary.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Từ vựng (Glossary)</h3>
                <Badge variant="secondary" className="text-xs">
                    {entries.length} từ
                </Badge>
            </div>

            {/* Hint */}
            <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                    Mỗi thẻ tương ứng với một từ được đánh dấu trong văn bản. Sử dụng "AI điền nghĩa" để tự động điền định nghĩa.
                </span>
            </div>

            {/* Glossary Cards */}
            <ul className="space-y-3" role="list">
                {entries.map(([key, item]) => (
                    <li
                        key={key}
                        className="rounded-lg border bg-card p-3 shadow-sm"
                        aria-label={`Từ vựng: ${item.word}`}
                    >
                        {/* Key + Word */}
                        <div className="mb-2 flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">
                                {key}
                            </Badge>
                            <span className="text-sm font-semibold">{item.word}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {/* Definition */}
                            <div className="col-span-2 space-y-1">
                                <Label
                                    htmlFor={`glossary-def-${key}`}
                                    className="text-xs text-muted-foreground"
                                >
                                    Định nghĩa (Tiếng Việt)
                                </Label>
                                <Input
                                    id={`glossary-def-${key}`}
                                    className="h-8 text-xs"
                                    placeholder="Nhập định nghĩa..."
                                    aria-label={`Định nghĩa của ${item.word}`}
                                    {...register(`glossary.${key}.definition`)}
                                />
                            </div>

                            {/* IPA */}
                            <div className="space-y-1">
                                <Label
                                    htmlFor={`glossary-ipa-${key}`}
                                    className="text-xs text-muted-foreground"
                                >
                                    IPA
                                </Label>
                                <Input
                                    id={`glossary-ipa-${key}`}
                                    className="h-8 font-mono text-xs"
                                    placeholder="/ˈwɜːrd/"
                                    aria-label={`IPA của ${item.word}`}
                                    {...register(`glossary.${key}.ipa`)}
                                />
                            </div>

                            {/* Part of Speech */}
                            <div className="space-y-1">
                                <Label
                                    htmlFor={`glossary-pos-${key}`}
                                    className="text-xs text-muted-foreground"
                                >
                                    Từ loại
                                </Label>
                                <Select
                                    value={item.type}
                                    onValueChange={(v) =>
                                        setValue(
                                            `glossary.${key}.type`,
                                            v as ReadingPartOfSpeech,
                                            { shouldDirty: true },
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id={`glossary-pos-${key}`}
                                        className="h-8 text-xs"
                                        aria-label={`Từ loại của ${item.word}`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PART_OF_SPEECH_OPTIONS.map(({ value, label }) => (
                                            <SelectItem key={value} value={value} className="text-xs">
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
});
