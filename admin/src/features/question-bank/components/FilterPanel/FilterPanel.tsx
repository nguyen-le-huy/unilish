import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { IQuestionFilters, QuestionDifficulty, QuestionStatus } from '../../types';
import { QuestionSkill, QuestionSource } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: { value: QuestionDifficulty; label: string }[] = [
    { value: 'easy', label: 'Dễ' },
    { value: 'medium', label: 'Trung bình' },
    { value: 'hard', label: 'Khó' },
    { value: 'very_hard', label: 'Rất khó' },
];

const STATUS_OPTIONS: { value: QuestionStatus; label: string }[] = [
    { value: 'draft', label: 'Nháp' },
    { value: 'in_review', label: 'Chờ duyệt' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

const SKILL_OPTIONS: { value: string; label: string }[] = [
    { value: QuestionSkill.GRAMMAR, label: 'Ngữ pháp' },
    { value: QuestionSkill.VOCABULARY, label: 'Từ vựng' },
    { value: QuestionSkill.LISTENING, label: 'Nghe' },
    { value: QuestionSkill.READING, label: 'Đọc' },
    { value: QuestionSkill.WRITING, label: 'Viết' },
    { value: QuestionSkill.SPEAKING, label: 'Nói' },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
    { value: QuestionSource.PLACEMENT, label: 'Placement Test' },
    { value: QuestionSource.COURSE, label: 'Khoá học' },
    { value: QuestionSource.PRACTICE, label: 'Luyện tập' },
];

// ─── Multi-toggle for difficulties ────────────────────────────────────────────

interface MultiToggleProps {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    colorMap?: Record<string, string>;
}

function MultiToggle({ options, selected, onChange, colorMap }: MultiToggleProps) {
    function toggle(value: string) {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {options.map(({ value, label }) => {
                const isActive = selected.includes(value);
                return (
                    <button
                        key={value}
                        type="button"
                        onClick={() => toggle(value)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors ${
                            isActive
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        } ${colorMap?.[value] ?? ''}`}
                        aria-pressed={isActive}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Checkbox group ───────────────────────────────────────────────────────────

interface CheckboxGroupProps {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    id: string;
}

function CheckboxGroup({ options, selected, onChange, id }: CheckboxGroupProps) {
    function toggle(value: string) {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {options.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                    <Checkbox
                        id={`${id}-${value}`}
                        checked={selected.includes(value)}
                        onCheckedChange={() => toggle(value)}
                    />
                    <Label htmlFor={`${id}-${value}`} className="text-sm cursor-pointer">
                        {label}
                    </Label>
                </div>
            ))}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    filters: IQuestionFilters;
    onFiltersChange: (filters: IQuestionFilters) => void;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterPanel({ isOpen, filters, onFiltersChange, onClose }: Props) {
    const [draft, setDraft] = useState<IQuestionFilters>({ ...filters });

    function patchDraft(partial: Partial<IQuestionFilters>) {
        setDraft((prev) => ({ ...prev, ...partial }));
    }

    function handleApply() {
        onFiltersChange(draft);
        onClose();
    }

    function handleReset() {
        const empty: IQuestionFilters = { page: 1, limit: 20 };
        setDraft(empty);
        onFiltersChange(empty);
        onClose();
    }

    // Count active filters (excluding page/limit/search/sortBy/sortOrder)
    const activeCount = [
        (draft.source?.length ?? 0) > 0,
        (draft.skill?.length ?? 0) > 0,
        (draft.difficulty?.length ?? 0) > 0,
        (draft.status?.length ?? 0) > 0,
    ].filter(Boolean).length;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="flex flex-col w-80 p-0 gap-0">
                <SheetHeader className="px-6 py-4 border-b shrink-0">
                    <SheetTitle className="flex items-center gap-2">
                        Bộ lọc nâng cao
                        {activeCount > 0 && (
                            <Badge variant="secondary" className="h-5 text-xs">
                                {activeCount}
                            </Badge>
                        )}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
                    {/* Source */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Nguồn
                        </Label>
                        <CheckboxGroup
                            id="source"
                            options={SOURCE_OPTIONS}
                            selected={draft.source ?? []}
                            onChange={(values) => patchDraft({ source: values })}
                        />
                    </div>

                    <Separator />

                    {/* Skill */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Kỹ năng
                        </Label>
                        <CheckboxGroup
                            id="skill"
                            options={SKILL_OPTIONS}
                            selected={draft.skill ?? []}
                            onChange={(values) => patchDraft({ skill: values })}
                        />
                    </div>

                    <Separator />

                    {/* Difficulty */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Độ khó
                        </Label>
                        <MultiToggle
                            options={DIFFICULTY_OPTIONS}
                            selected={draft.difficulty ?? []}
                            onChange={(values) => patchDraft({ difficulty: values as QuestionDifficulty[] })}
                        />
                    </div>

                    <Separator />

                    {/* Status */}
                    <div className="flex flex-col gap-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Trạng thái
                        </Label>
                        <CheckboxGroup
                            id="status"
                            options={STATUS_OPTIONS}
                            selected={draft.status ?? []}
                            onChange={(values) => patchDraft({ status: values as QuestionStatus[] })}
                        />
                    </div>
                </div>

                <SheetFooter className="px-6 py-4 border-t shrink-0 gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                        Đặt lại
                    </Button>
                    <Button className="flex-1" onClick={handleApply}>
                        Áp dụng
                        {activeCount > 0 && ` (${activeCount})`}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
