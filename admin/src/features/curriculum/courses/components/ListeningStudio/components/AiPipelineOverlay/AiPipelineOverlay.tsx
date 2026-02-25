import { memo } from 'react';
import { Loader2, CheckCircle2, Circle, Music2, AudioWaveform, Mic, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    isVisible: boolean;
    progress: number;     // 0-100
    step: 1 | 2 | 3;
    isCancelling: boolean;
    onCancel: () => void;
}

interface PipelineStep {
    id: 1 | 2 | 3;
    label: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS: PipelineStep[] = [
    {
        id: 1,
        label: 'ElevenLabs TTS',
        description: 'Tổng hợp giọng đọc từng speaker bằng AI',
        Icon: Mic,
    },
    {
        id: 2,
        label: 'FFmpeg Mix & Upload',
        description: 'Ghép audio + nền nhạc, upload lên R2/Cloudinary',
        Icon: Music2,
    },
    {
        id: 3,
        label: 'Deepgram Word Sync',
        description: 'Đồng bộ word-level timestamps cho karaoke',
        Icon: AudioWaveform,
    },
];

// ─── Sub-component: StepRow ───────────────────────────────────────────────────

interface StepRowProps {
    step: PipelineStep;
    currentStep: 1 | 2 | 3;
}

const StepRow = memo(function StepRow({ step, currentStep }: StepRowProps) {
    const isDone = step.id < currentStep;
    const isActive = step.id === currentStep;
    const isPending = step.id > currentStep;

    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                isActive && 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20',
                isDone && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10',
                isPending && 'border-border bg-muted/10 opacity-50',
            )}
            aria-current={isActive ? 'step' : undefined}
        >
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
                {isDone ? (
                    <CheckCircle2
                        className="h-5 w-5 text-emerald-500"
                        aria-label="Hoàn thành"
                    />
                ) : isActive ? (
                    <Loader2
                        className="h-5 w-5 animate-spin text-violet-600"
                        aria-label="Đang xử lý"
                    />
                ) : (
                    <Circle
                        className="h-5 w-5 text-muted-foreground/30"
                        aria-label="Chờ"
                    />
                )}
            </div>

            {/* Step icon + text */}
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    <step.Icon
                        className={cn(
                            'h-3.5 w-3.5',
                            isActive ? 'text-violet-600' : isDone ? 'text-emerald-500' : 'text-muted-foreground/50',
                        )}
                        aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{step.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{step.description}</span>
            </div>
        </div>
    );
});

// ─── Component ────────────────────────────────────────────────────────────────

export const AiPipelineOverlay = memo(function AiPipelineOverlay({
    isVisible,
    progress,
    step,
    isCancelling,
    onCancel,
}: Props) {
    return (
        <Dialog open={isVisible} onOpenChange={() => { /* non-dismissable while running */ }}>
            <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Loader2
                            className="h-4 w-4 animate-spin text-violet-600"
                            aria-hidden="true"
                        />
                        Đang xử lý AI Pipeline…
                    </DialogTitle>
                    <DialogDescription>
                        Hệ thống đang tạo audio và đồng bộ timestamps cho bài nghe.
                    </DialogDescription>
                </DialogHeader>

                {/* Progress bar */}
                <div className="flex flex-col gap-1.5">
                    <Progress
                        value={progress}
                        className="h-2"
                        aria-label={`Tiến độ: ${progress}%`}
                    />
                    <p className="text-right text-xs tabular-nums text-muted-foreground">
                        {progress}%
                    </p>
                </div>

                {/* Pipeline steps */}
                <div className="flex flex-col gap-2" role="list" aria-label="Các bước xử lý">
                    {PIPELINE_STEPS.map((pipelineStep) => (
                        <StepRow
                            key={pipelineStep.id}
                            step={pipelineStep}
                            currentStep={step}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Vui lòng không đóng tab này trong quá trình xử lý.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={isCancelling}
                        className="shrink-0 text-destructive hover:text-destructive"
                    >
                        {isCancelling ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <X className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isCancelling ? 'Đang huỷ...' : 'Huỷ'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
});
