import { memo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { Control } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UnitFormValues } from '../../hooks/useUnitForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    control: Control<UnitFormValues>;
    keywords: string[];
    onAddKeyword: (kw: string) => void;
    onRemoveKeyword: (index: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ContextSeedCard = memo(function ContextSeedCard({
    control,
    keywords,
    onAddKeyword,
    onRemoveKeyword,
}: Props) {
    const [kwInput, setKwInput] = useState('');

    const handleKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && kwInput.trim()) {
            e.preventDefault();
            onAddKeyword(kwInput.trim());
            setKwInput('');
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ngữ cảnh hỗ trợ AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Scenario */}
                <FormField
                    control={control}
                    name="contextSeed.scenario"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tình huống</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Mô tả tình huống thực tế cho chương này..."
                                    rows={2}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Keywords tag input */}
                <div className="space-y-2">
                    <FormLabel>Từ khóa</FormLabel>
                    <div className="flex flex-wrap gap-1 rounded-md border bg-background p-2 min-h-[2.5rem]">
                        {keywords.map((kw, i) => (
                            <Badge key={`${kw}-${i}`} variant="secondary" className="gap-1 pr-1">
                                {kw}
                                <button
                                    type="button"
                                    onClick={() => onRemoveKeyword(i)}
                                    className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                                    aria-label={`Xóa từ khóa ${kw}`}
                                >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </Badge>
                        ))}
                        <Input
                            value={kwInput}
                            onChange={(e) => setKwInput(e.target.value)}
                            onKeyDown={handleKeywordKeyDown}
                            placeholder="Nhập & nhấn Enter..."
                            className="h-6 flex-1 min-w-[8rem] border-none p-0 shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">Nhấn Enter hoặc dấu phẩy để thêm</p>
                </div>

                {/* Cultural Notes */}
                <FormField
                    control={control}
                    name="contextSeed.culturalNotes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ghi chú văn hóa</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Ghi chú ngữ cảnh văn hóa..."
                                    rows={2}
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
});
