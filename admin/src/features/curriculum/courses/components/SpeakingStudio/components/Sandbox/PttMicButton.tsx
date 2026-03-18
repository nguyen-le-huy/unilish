import { AlertTriangle, Bot, Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PttStatus } from '../../types/pipeline.types';

interface Props {
    status: PttStatus;
    disabled?: boolean;
    onToggle: () => void;
}

const STATUS_UI: Record<PttStatus, { label: string; className: string }> = {
    idle: {
        label: 'Nhấn để nói',
        className: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
    recording: {
        label: 'Nhấn để dừng',
        className: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
    processing: {
        label: 'Đang phân tích...',
        className: 'border-amber-300 bg-amber-50 text-amber-700',
    },
    ai_speaking: {
        label: 'AI đang phản hồi...',
        className: 'border-blue-300 bg-blue-50 text-blue-700',
    },
    error: {
        label: 'Nhấn để thử lại',
        className: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
};

const StatusIcon = ({ status }: { status: PttStatus }) => {
    if (status === 'recording') {
        return <MicOff className="h-5 w-5" aria-hidden="true" />;
    }

    if (status === 'processing') {
        return <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />;
    }

    if (status === 'ai_speaking') {
        return <Bot className="h-5 w-5" aria-hidden="true" />;
    }

    if (status === 'error') {
        return <AlertTriangle className="h-5 w-5" aria-hidden="true" />;
    }

    return <Mic className="h-5 w-5" aria-hidden="true" />;
};

export const PttMicButton = ({ status, disabled, onToggle }: Props) => {
    const ui = STATUS_UI[status];
    const isLocked = status === 'processing' || status === 'ai_speaking';

    return (
        <Button
            type="button"
            size="lg"
            variant="outline"
            className={`relative h-14 w-full gap-2 rounded-xl text-base ${ui.className}`}
            onClick={onToggle}
            aria-label={ui.label}
            aria-pressed={status === 'recording'}
            disabled={disabled || isLocked}
        >
            {status === 'recording' && (
                <span className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
            )}
            <StatusIcon status={status} />
            {ui.label}
        </Button>
    );
};
