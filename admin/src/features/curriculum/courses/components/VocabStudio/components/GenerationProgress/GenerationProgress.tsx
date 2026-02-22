import { memo } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Music2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { VocabGenerationStatus } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    status: VocabGenerationStatus;
    itemCount: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
    VocabGenerationStatus,
    { label: string; icon: React.ReactNode; progress: number; variant: 'default' | 'done' | 'error' }
> = {
    IDLE: {
        label: 'Chờ tạo nội dung',
        icon: null,
        progress: 0,
        variant: 'default',
    },
    GENERATING: {
        label: 'GPT đang tạo từ vựng…',
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-hidden="true" />,
        progress: 33,
        variant: 'default',
    },
    GENERATING_AUDIO: {
        label: 'Đang tạo âm thanh TTS…',
        icon: <Music2 className="h-4 w-4 animate-pulse text-purple-500" aria-hidden="true" />,
        progress: 66,
        variant: 'default',
    },
    DONE: {
        label: 'Hoàn tất!',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />,
        progress: 100,
        variant: 'done',
    },
    ERROR: {
        label: 'Lỗi tạo nội dung',
        icon: <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />,
        progress: 0,
        variant: 'error',
    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const GenerationProgress = memo(function GenerationProgress({ status, itemCount }: Props) {
    const config = STATUS_CONFIG[status];

    if (status === 'IDLE') return null;

    return (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
                {config.icon}
                <span className="text-sm font-medium">{config.label}</span>
                {itemCount > 0 && status === 'DONE' && (
                    <span className="ml-auto text-xs text-muted-foreground">
                        {itemCount} từ vựng
                    </span>
                )}
            </div>
            <Progress value={config.progress} className="h-1.5" />
        </div>
    );
});
