import { memo } from 'react';
import { CheckCircle2, AlertCircle, Music2, Cpu } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { VocabGenerationStatus } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    status: VocabGenerationStatus;
    completedCount: number;
    totalCount: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type StatusVariant = 'default' | 'done' | 'error';

interface StatusStep {
    label: string;
    icon: React.ReactNode;
    baseProgress: number;
    variant: StatusVariant;
}

const STATUS_CONFIG: Record<VocabGenerationStatus, StatusStep> = {
    IDLE: {
        label: 'Chờ tạo nội dung',
        icon: null,
        baseProgress: 0,
        variant: 'default',
    },
    GENERATING: {
        label: 'GPT-5.1 đang sinh từ vựng…',
        icon: <Cpu className="h-4 w-4 animate-pulse text-blue-500" aria-hidden="true" />,
        baseProgress: 33,
        variant: 'default',
    },
    GENERATING_AUDIO: {
        label: 'BullMQ đang xử lý TTS audio…',
        icon: <Music2 className="h-4 w-4 animate-pulse text-purple-500" aria-hidden="true" />,
        baseProgress: 66,
        variant: 'default',
    },
    DONE: {
        label: 'Hoàn tất!',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />,
        baseProgress: 100,
        variant: 'done',
    },
    ERROR: {
        label: 'Lỗi — vui lòng thử lại',
        icon: <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />,
        baseProgress: 0,
        variant: 'error',
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const GenerationProgress = memo(function GenerationProgress({
    status,
    completedCount,
    totalCount,
}: Props) {
    const config = STATUS_CONFIG[status];

    if (status === 'IDLE') return null;

    // For GENERATING_AUDIO, show fine-grained progress from BullMQ completedCount
    const showAudioProgress =
        status === 'GENERATING_AUDIO' && totalCount > 0;
    const displayProgress = showAudioProgress
        ? 66 + Math.round((completedCount / totalCount) * 33)
        : config.baseProgress;

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
                {config.icon}
                <span className="text-sm font-medium">{config.label}</span>

                {showAudioProgress && (
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {completedCount} / {totalCount} file
                    </span>
                )}
                {status === 'DONE' && totalCount > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">
                        {totalCount} từ vựng
                    </span>
                )}
            </div>
            <Progress value={displayProgress} className="h-1.5" />
        </div>
    );
});
