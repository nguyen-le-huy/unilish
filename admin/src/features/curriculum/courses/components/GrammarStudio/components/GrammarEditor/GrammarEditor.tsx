import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
    GrammarBlogBlock,
    GrammarLessonFormValues,
    CEFRLevel,
} from '../../../../types/course.types';
import type { GrammarPanel } from '../../hooks/useGrammarStudioState';

interface Props {
    activePanel: GrammarPanel;
    activeBlockId: string | null;
}

function HeroEditor() {
    const { register, watch, setValue } = useFormContext<GrammarLessonFormValues>();
    const level = watch('level');
    const contextSentences = watch('hero.contextSentences');

    return (
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label>CEFR Level</Label>
                    <Select
                        value={level}
                        onValueChange={(next) => setValue('level', next as CEFRLevel, { shouldDirty: true })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((item) => (
                                <SelectItem key={item} value={item}>
                                    {item}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="reading-time">Reading time (min)</Label>
                    <Input id="reading-time" type="number" min={1} max={60} {...register('readingTime', { valueAsNumber: true })} />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="concept-name">Concept name</Label>
                <Input id="concept-name" {...register('conceptName')} placeholder="Adjectives with Prepositions" />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="hero-hook">Hook</Label>
                <Textarea id="hero-hook" rows={3} {...register('hero.hook')} />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="hero-context">Context sentences (mỗi dòng 1 câu)</Label>
                <Textarea
                    id="hero-context"
                    rows={5}
                    value={contextSentences.join('\n')}
                    onChange={(event) => {
                        const next = event.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean);
                        setValue('hero.contextSentences', next, { shouldDirty: true });
                    }}
                />
            </div>
        </div>
    );
}

function SummaryEditor() {
    const { watch, setValue } = useFormContext<GrammarLessonFormValues>();
    const columns = watch('summaryTable.columns');
    const rows = watch('summaryTable.rows');

    return (
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-3 gap-2">
                {columns.map((column, index) => (
                    <Input
                        key={`column-${index}`}
                        value={column}
                        onChange={(event) => {
                            const next: [string, string, string] = [...columns] as [string, string, string];
                            next[index] = event.target.value;
                            setValue('summaryTable.columns', next, { shouldDirty: true });
                        }}
                    />
                ))}
            </div>

            <div className="space-y-2">
                {rows.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2">
                        {row.map((cell, cellIndex) => (
                            <Input
                                key={`cell-${rowIndex}-${cellIndex}`}
                                value={cell}
                                onChange={(event) => {
                                    const next = rows.slice();
                                    const nextRow: [string, string, string] = [...next[rowIndex]] as [string, string, string];
                                    nextRow[cellIndex] = event.target.value;
                                    next[rowIndex] = nextRow;
                                    setValue('summaryTable.rows', next, { shouldDirty: true });
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function BlockEditor({ block, index }: { block: GrammarBlogBlock; index: number }) {
    const { watch, setValue } = useFormContext<GrammarLessonFormValues>();

    if (block.type === 'EXPLANATION') {
        const examples = watch(`blocks.${index}.examples`);

        return (
            <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                    <Label>Heading</Label>
                    <Input
                        value={block.heading}
                        onChange={(event) => setValue(`blocks.${index}.heading`, event.target.value, { shouldDirty: true })}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>Body</Label>
                    <Textarea
                        rows={4}
                        value={block.body}
                        onChange={(event) => setValue(`blocks.${index}.body`, event.target.value, { shouldDirty: true })}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Examples</Label>
                    {examples.map((example, exampleIndex) => (
                        <div key={`${block.id}-example-${exampleIndex}`} className="grid grid-cols-2 gap-2">
                            <Input
                                value={example.en}
                                placeholder="English"
                                onChange={(event) => {
                                    const next = examples.slice();
                                    next[exampleIndex] = { ...next[exampleIndex], en: event.target.value };
                                    setValue(`blocks.${index}.examples`, next, { shouldDirty: true });
                                }}
                            />
                            <Input
                                value={example.vi}
                                placeholder="Vietnamese"
                                onChange={(event) => {
                                    const next = examples.slice();
                                    next[exampleIndex] = { ...next[exampleIndex], vi: event.target.value };
                                    setValue(`blocks.${index}.examples`, next, { shouldDirty: true });
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <Label>Highlight pattern</Label>
                    <Input
                        value={block.highlightPattern}
                        onChange={(event) => setValue(`blocks.${index}.highlightPattern`, event.target.value, { shouldDirty: true })}
                    />
                </div>
            </div>
        );
    }

    if (block.type === 'INLINE_QUIZ') {
        return (
            <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                    <Label>Instruction</Label>
                    <Input
                        value={block.instruction}
                        onChange={(event) => setValue(`blocks.${index}.instruction`, event.target.value, { shouldDirty: true })}
                    />
                </div>

                <p className="text-xs text-muted-foreground">Inline quiz questions được tạo/chỉnh qua AI workflow. Editor này giữ lightweight để tránh UX phức tạp.</p>
            </div>
        );
    }

    if (block.type === 'CALLOUT') {
        return (
            <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                    <Label>Variant</Label>
                    <Select
                        value={block.variant}
                        onValueChange={(value) => setValue(`blocks.${index}.variant`, value as 'TIP' | 'WARNING' | 'EXAMPLE' | 'UNIT_CONTEXT', { shouldDirty: true })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TIP">TIP</SelectItem>
                            <SelectItem value="WARNING">WARNING</SelectItem>
                            <SelectItem value="EXAMPLE">EXAMPLE</SelectItem>
                            <SelectItem value="UNIT_CONTEXT">UNIT_CONTEXT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label>Text</Label>
                    <Textarea
                        rows={4}
                        value={block.text}
                        onChange={(event) => setValue(`blocks.${index}.text`, event.target.value, { shouldDirty: true })}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            <div className="space-y-1.5">
                <Label>Heading</Label>
                <Input
                    value={block.heading}
                    onChange={(event) => setValue(`blocks.${index}.heading`, event.target.value, { shouldDirty: true })}
                />
            </div>

            <div className="space-y-1.5">
                <Label>Note</Label>
                <Textarea
                    rows={3}
                    value={block.note}
                    onChange={(event) => setValue(`blocks.${index}.note`, event.target.value, { shouldDirty: true })}
                />
            </div>
        </div>
    );
}

export const GrammarEditor = memo(function GrammarEditor({
    activePanel,
    activeBlockId,
}: Props) {
    const { watch } = useFormContext<GrammarLessonFormValues>();
    const blocks = watch('blocks');

    const activeIndex = activeBlockId
        ? blocks.findIndex((item) => item.id === activeBlockId)
        : -1;

    return (
        <ScrollArea className="h-full">
            {activePanel === 'hero' && <HeroEditor />}
            {activePanel === 'summary' && <SummaryEditor />}
            {activePanel === 'block' && activeIndex >= 0 ? (
                <BlockEditor block={blocks[activeIndex]!} index={activeIndex} />
            ) : null}
        </ScrollArea>
    );
});
