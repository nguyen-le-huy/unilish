import { useState, useCallback } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings2, CheckCircle2, FileText, Mic, BookOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CEFR_LEVELS, CEFR_LEVEL_LABELS } from '../../constants';
import type { ICEFRMapping, IPlacementTest, IPlacementTestModule, IModuleMCQ, IModuleEssay, IModuleSpeaking } from '../../types';

// ─── CEFR Mapping Modal ───────────────────────────────────────────────────────

const cefrMappingSchema = z.object({
    weightMcq: z.coerce.number().min(0).max(1),
    weightWriting: z.coerce.number().min(0).max(1),
    weightSpeaking: z.coerce.number().min(0).max(1),
});

type CEFRMappingFormValues = z.infer<typeof cefrMappingSchema>;

interface CEFRMappingModalProps {
    open: boolean;
    mapping: ICEFRMapping;
    onSave: (mapping: ICEFRMapping) => void;
    onClose: () => void;
}

function CEFRMappingModal({ open, mapping, onSave, onClose }: CEFRMappingModalProps) {
    const form = useForm<CEFRMappingFormValues>({
        resolver: zodResolver(cefrMappingSchema) as Resolver<CEFRMappingFormValues>,
        defaultValues: {
            weightMcq: mapping.weights.mcq,
            weightWriting: mapping.weights.writing,
            weightSpeaking: mapping.weights.speaking,
        },
    });

    const total = (
        Number(form.watch('weightMcq') ?? 0) +
        Number(form.watch('weightWriting') ?? 0) +
        Number(form.watch('weightSpeaking') ?? 0)
    );
    const totalOk = Math.abs(total - 1.0) < 0.001;

    function onSubmit(values: CEFRMappingFormValues) {
        onSave({
            ...mapping,
            weights: { mcq: values.weightMcq, writing: values.weightWriting, speaking: values.weightSpeaking },
        });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Cấu hình trọng số CEFR</DialogTitle>
                    <DialogDescription>
                        Tổng trọng số phải bằng 1.0. Bỏ qua các module không có trong bài kiểm tra.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { key: 'weightMcq' as const, label: 'MCQ' },
                                { key: 'weightWriting' as const, label: 'Writing' },
                                { key: 'weightSpeaking' as const, label: 'Speaking' },
                            ] as const).map(({ key, label }) => (
                                <FormField key={key} control={form.control} name={key} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">{label}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step={0.1}
                                                min={0}
                                                max={1}
                                                className="h-8 text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            ))}
                        </div>
                        <div className={`flex items-center gap-2 text-sm rounded-lg p-2 ${totalOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {totalOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            Tổng: {total.toFixed(2)} {totalOk ? '✓ hợp lệ' : '— phải bằng 1.00'}
                        </div>

                        <Separator />

                        {/* Threshold table */}
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                Ngưỡng CEFR (chỉ đọc — chỉnh từ backend)
                            </p>
                            <div className="space-y-1">
                                {mapping.thresholds.map((t) => (
                                    <div key={t.level} className="flex items-center gap-3 text-xs">
                                        <Badge variant="outline" className="w-8 justify-center font-mono">{t.level}</Badge>
                                        <span className="text-muted-foreground">
                                            MCQ {t.mcqMin}–{t.mcqMax} | Writing {t.writingMin}–{t.writingMax} | Speaking {t.speakingMin}–{t.speakingMax}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
                            <Button type="submit" disabled={!totalOk}>Lưu trọng số</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Module type icon ─────────────────────────────────────────────────────────

const MODULE_ICON: Record<string, React.ElementType> = {
    mcq: BookOpen,
    essay: FileText,
    speaking: Mic,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    step1: Pick<IPlacementTest, 'name' | 'language' | 'standard' | 'outputFramework' | 'description' | 'settings'>;
    modules: IPlacementTestModule[];
    cefrMapping: ICEFRMapping;
    onCefrMappingChange: (m: ICEFRMapping) => void;
    onBack: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step4Preview({
    step1,
    modules,
    cefrMapping,
    onCefrMappingChange,
    onBack,
    onSubmit,
    isSubmitting,
}: Props) {
    const [cefrModalOpen, setCefrModalOpen] = useState(false);

    const handleCefrSave = useCallback(
        (m: ICEFRMapping) => {
            onCefrMappingChange(m);
            setCefrModalOpen(false);
        },
        [onCefrMappingChange],
    );

    return (
        <div className="space-y-6">
            {/* General info */}
            <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 text-sm font-semibold">Thông tin chung</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 px-4 py-4 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground">Ngôn ngữ</p>
                        <p className="font-medium uppercase">{step1.language}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Tên bài kiểm tra</p>
                        <p className="font-medium">{step1.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Output Framework</p>
                        <p className="font-medium">{step1.outputFramework ?? 'CEFR'}</p>
                    </div>
                    {step1.description && (
                        <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Mô tả</p>
                            <p>{step1.description}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xs text-muted-foreground">Thi lại</p>
                        <p>{step1.settings?.allowRetake ? `Có (${step1.settings.retakeCooldownDays} ngày)` : 'Không'}</p>
                    </div>
                </div>
            </div>

            {/* Modules */}
            <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/30 px-4 py-2 text-sm font-semibold">
                    Modules ({modules.length})
                </div>
                <div className="divide-y">
                    {modules.map((m, idx) => {
                        const Icon = MODULE_ICON[m.type] ?? BookOpen;
                        return (
                            <div key={idx} className="flex items-start gap-3 px-4 py-3">
                                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 mt-0.5">
                                    <Icon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{m.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {m.type === 'mcq'
                                            ? `${(m as IModuleMCQ).parts?.length ?? 0} parts`
                                            : m.type === 'essay'
                                                ? `${(m as IModuleEssay).timeLimitMinutes} phút`
                                                : `${(m as IModuleSpeaking).totalMinutes} phút`
                                        }
                                    </p>
                                </div>
                                <Badge variant="outline" className="ml-auto text-xs">{m.type.toUpperCase()}</Badge>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CEFR Mapping */}
            <div className="rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
                    <span className="text-sm font-semibold">Trọng số CEFR</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        onClick={() => setCefrModalOpen(true)}
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        Chỉnh sửa
                    </Button>
                </div>
                <div className="flex gap-6 px-4 py-3">
                    {Object.entries(cefrMapping.weights).map(([k, v]) => (
                        <div key={k} className="text-center">
                            <p className="text-xs text-muted-foreground capitalize">{k}</p>
                            <p className="text-lg font-bold">{(v * 100).toFixed(0)}%</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-6 gap-1 px-4 pb-3">
                    {CEFR_LEVELS.map((level) => (
                        <div key={level} className="flex flex-col items-center rounded border bg-muted/20 py-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono">{level}</Badge>
                            <span className="text-[9px] text-muted-foreground mt-0.5">
                                {CEFR_LEVEL_LABELS[level].split(' ')[2]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                    Bài kiểm tra sẽ được lưu dưới dạng <strong>nháp</strong>. Bạn có thể kích hoạt sau khi đã bổ sung đủ câu hỏi vào ngân hàng.
                </AlertDescription>
            </Alert>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                <Button onClick={onSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu…' : 'Tạo bài kiểm tra'}
                </Button>
            </div>

            <CEFRMappingModal
                open={cefrModalOpen}
                mapping={cefrMapping}
                onSave={handleCefrSave}
                onClose={() => setCefrModalOpen(false)}
            />
        </div>
    );
}
