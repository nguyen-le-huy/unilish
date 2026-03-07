import { useState, useRef, type KeyboardEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { ICreateQuestionPayload } from '../../../types';

export function TagsField() {
    const { control, watch, setValue } = useFormContext<ICreateQuestionPayload>();
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const tags: string[] = watch('tags') ?? [];

    function addTag(raw: string) {
        const tag = raw.trim().toLowerCase();
        if (!tag || tags.includes(tag) || tags.length >= 20) return;
        setValue('tags', [...tags, tag], { shouldValidate: true });
        setInputValue('');
    }

    function removeTag(tag: string) {
        setValue(
            'tags',
            tags.filter((t) => t !== tag),
            { shouldValidate: true },
        );
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    }

    return (
        <FormField
            control={control}
            name="tags"
            render={() => (
                <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <div
                        className="flex flex-wrap gap-1.5 min-h-[40px] rounded-md border border-input bg-background px-3 py-2 cursor-text"
                        onClick={() => inputRef.current?.focus()}
                        role="group"
                        aria-label="Tags input"
                    >
                        {tags.map((tag) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1 pl-2 pr-1 h-6 text-xs"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeTag(tag);
                                    }}
                                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                                    aria-label={`Xoá tag ${tag}`}
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </Badge>
                        ))}
                        <input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => addTag(inputValue)}
                            placeholder={tags.length === 0 ? 'Nhập tag rồi nhấn Enter...' : ''}
                            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            aria-label="Nhập tag mới"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Nhấn <kbd className="rounded border px-1 text-xs">Enter</kbd> hoặc dấu phẩy để thêm tag. Tối đa 20 tags.
                    </p>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
