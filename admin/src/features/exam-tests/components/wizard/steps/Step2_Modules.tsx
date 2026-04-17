import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createDefaultExamModules } from '../../../constants';
import type {
    ICreateExamTestPayload,
    IExamModule,
    IExamModuleListening,
    IExamModuleReading,
    IExamModuleSpeaking,
    IExamModuleWriting,
} from '../../../types';

interface Props {
    defaultValues: Partial<ICreateExamTestPayload>;
    onDone: (data: Partial<ICreateExamTestPayload>) => void;
    onBack: () => void;
    nextLabel?: string;
    isSubmitting?: boolean;
}

const parseLineItems = (value: string): string[] => {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
};

const isPartModule = (
    module: IExamModule,
): module is IExamModuleListening | IExamModuleReading => {
    return module.type === 'listening' || module.type === 'reading';
};

const deepCloneModules = (modules: IExamModule[]): IExamModule[] => {
    return JSON.parse(JSON.stringify(modules)) as IExamModule[];
};

export function Step2_Modules({
    defaultValues,
    onDone,
    onBack,
    nextLabel = 'Tiếp theo',
    isSubmitting = false,
}: Props) {
    const format = defaultValues.format;
    const [modules, setModules] = useState<IExamModule[]>(() => {
        if (defaultValues.modules && defaultValues.modules.length > 0) {
            return deepCloneModules(defaultValues.modules);
        }
        if (format) {
            return createDefaultExamModules(format);
        }
        return [];
    });

    if (!format) {
        return (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Vui lòng chọn định dạng ở bước trước để cấu hình modules.
            </div>
        );
    }

    const updateModuleTime = (moduleIndex: number, nextValue: number) => {
        setModules((prev) =>
            prev.map((module, index) => (
                index === moduleIndex ? { ...module, timeLimitMinutes: Math.max(1, nextValue) } : module
            )),
        );
    };

    const updatePartField = (
        moduleIndex: number,
        partIndex: number,
        field: 'questionsCount' | 'poolTag',
        value: number | string,
    ) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex || !isPartModule(module)) {
                    return module;
                }

                return {
                    ...module,
                    parts: module.parts.map((part, pIndex) => {
                        if (pIndex !== partIndex) {
                            return part;
                        }

                        if (field === 'questionsCount' && typeof value === 'number') {
                            return { ...part, questionsCount: Math.max(0, value) };
                        }

                        if (field === 'poolTag' && typeof value === 'string') {
                            return { ...part, poolTag: value };
                        }

                        return part;
                    }),
                };
            }),
        );
    };

    const updatePartRawText = (moduleIndex: number, partIndex: number, value: string) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex || !isPartModule(module)) {
                    return module;
                }

                return {
                    ...module,
                    parts: module.parts.map((part, pIndex) => (
                        pIndex === partIndex
                            ? {
                                ...part,
                                manualContent: {
                                    ...part.manualContent,
                                    rawText: value,
                                },
                            }
                            : part
                    )),
                };
            }),
        );
    };

    const updateWritingTask = (
        moduleIndex: number,
        taskIndex: number,
        field: 'minWords' | 'topics',
        value: number | string,
    ) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex || module.type !== 'writing') {
                    return module;
                }

                const writingModule = module as IExamModuleWriting;
                return {
                    ...writingModule,
                    tasks: writingModule.tasks.map((task, tIndex) => {
                        if (tIndex !== taskIndex) {
                            return task;
                        }

                        if (field === 'minWords' && typeof value === 'number') {
                            return { ...task, minWords: Math.max(1, value) };
                        }

                        if (field === 'topics' && typeof value === 'string') {
                            return { ...task, topics: parseLineItems(value) };
                        }

                        return task;
                    }),
                };
            }),
        );
    };

    const updateSpeakingField = (
        moduleIndex: number,
        field: 'part1Topics' | 'part2CueCards' | 'part3Topics',
        value: string,
    ) => {
        setModules((prev) =>
            prev.map((module, index) => {
                if (index !== moduleIndex || module.type !== 'speaking') {
                    return module;
                }

                const speakingModule = module as IExamModuleSpeaking;
                const lines = parseLineItems(value);

                if (field === 'part2CueCards') {
                    return {
                        ...speakingModule,
                        part2CueCards: lines.map((text) => ({ text })),
                    };
                }

                if (field === 'part1Topics') {
                    return {
                        ...speakingModule,
                        part1Topics: lines.map((text) => ({ text })),
                    };
                }

                return {
                    ...speakingModule,
                    part3Topics: lines.map((text) => ({ text })),
                };
            }),
        );
    };

    const handleSubmit = () => {
        onDone({ modules });
    };

    return (
        <div className="space-y-6">
            {modules.map((module, moduleIndex) => (
                <div key={`${module.type}-${moduleIndex}`} className="space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-semibold">{module.name}</p>
                            <p className="text-xs text-muted-foreground">Module: {module.type}</p>
                        </div>
                        {'timeLimitMinutes' in module && (
                            <label className="space-y-1 text-sm">
                                <span className="text-muted-foreground">Thời gian (phút)</span>
                                <Input
                                    type="number"
                                    min={1}
                                    value={module.timeLimitMinutes}
                                    onChange={(event) =>
                                        updateModuleTime(
                                            moduleIndex,
                                            Number(event.target.value) || module.timeLimitMinutes,
                                        )}
                                />
                            </label>
                        )}
                    </div>

                    {isPartModule(module) && (
                        <div className="space-y-3">
                            {module.parts.map((part, partIndex) => (
                                <div key={`${part.part}-${partIndex}`} className="rounded-md border bg-muted/20 p-3">
                                    <p className="text-sm font-medium">{part.name}</p>
                                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <label className="space-y-1 text-sm">
                                            <span className="text-muted-foreground">Số câu hỏi</span>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={part.questionsCount}
                                                onChange={(event) =>
                                                    updatePartField(
                                                        moduleIndex,
                                                        partIndex,
                                                        'questionsCount',
                                                        Number(event.target.value) || 0,
                                                    )}
                                            />
                                        </label>
                                        <label className="space-y-1 text-sm">
                                            <span className="text-muted-foreground">Pool Tag</span>
                                            <Input
                                                value={part.poolTag}
                                                onChange={(event) =>
                                                    updatePartField(
                                                        moduleIndex,
                                                        partIndex,
                                                        'poolTag',
                                                        event.target.value,
                                                    )}
                                                placeholder="vd: toeic-reading-part7"
                                            />
                                        </label>
                                    </div>
                                    <label className="mt-3 block space-y-1 text-sm">
                                        <span className="text-muted-foreground">
                                            Nhập câu hỏi thủ công (placeholder)
                                        </span>
                                        <Textarea
                                            rows={4}
                                            value={part.manualContent?.rawText ?? ''}
                                            onChange={(event) =>
                                                updatePartRawText(moduleIndex, partIndex, event.target.value)}
                                            placeholder="Paste nội dung câu hỏi thô tại đây..."
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    {module.type === 'writing' && (
                        <div className="space-y-3">
                            {module.tasks.map((task, taskIndex) => (
                                <div key={`${task.task}-${taskIndex}`} className="rounded-md border bg-muted/20 p-3">
                                    <p className="text-sm font-medium">Task {task.task}</p>
                                    <label className="mt-2 block space-y-1 text-sm">
                                        <span className="text-muted-foreground">Tối thiểu số từ</span>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={task.minWords}
                                            onChange={(event) =>
                                                updateWritingTask(
                                                    moduleIndex,
                                                    taskIndex,
                                                    'minWords',
                                                    Number(event.target.value) || task.minWords,
                                                )}
                                        />
                                    </label>
                                    <label className="mt-3 block space-y-1 text-sm">
                                        <span className="text-muted-foreground">Topics (mỗi dòng 1 topic)</span>
                                        <Textarea
                                            rows={4}
                                            value={task.topics.join('\n')}
                                            onChange={(event) =>
                                                updateWritingTask(
                                                    moduleIndex,
                                                    taskIndex,
                                                    'topics',
                                                    event.target.value,
                                                )}
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}

                    {module.type === 'speaking' && (
                        <div className="space-y-3">
                            <label className="block space-y-1 text-sm">
                                <span className="text-muted-foreground">Part 1 Topics (mỗi dòng 1 topic)</span>
                                <Textarea
                                    rows={3}
                                    value={module.part1Topics.map((item) => item.text).join('\n')}
                                    onChange={(event) =>
                                        updateSpeakingField(moduleIndex, 'part1Topics', event.target.value)}
                                />
                            </label>
                            <label className="block space-y-1 text-sm">
                                <span className="text-muted-foreground">Part 2 Cue Cards (mỗi dòng 1 cue card)</span>
                                <Textarea
                                    rows={3}
                                    value={module.part2CueCards.map((item) => item.text).join('\n')}
                                    onChange={(event) =>
                                        updateSpeakingField(moduleIndex, 'part2CueCards', event.target.value)}
                                />
                            </label>
                            <label className="block space-y-1 text-sm">
                                <span className="text-muted-foreground">Part 3 Topics (mỗi dòng 1 topic)</span>
                                <Textarea
                                    rows={3}
                                    value={module.part3Topics.map((item) => item.text).join('\n')}
                                    onChange={(event) =>
                                        updateSpeakingField(moduleIndex, 'part3Topics', event.target.value)}
                                />
                            </label>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                <Button disabled={isSubmitting} onClick={handleSubmit}>
                    {isSubmitting ? 'Đang xử lý...' : nextLabel}
                </Button>
            </div>
        </div>
    );
}
