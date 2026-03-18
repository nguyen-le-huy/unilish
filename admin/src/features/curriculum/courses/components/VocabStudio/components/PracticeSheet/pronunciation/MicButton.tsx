import { AlertTriangle, CheckCircle2, Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PronunciationTestStatus } from '../../../../../types/course.types';

interface MicButtonProps {
    status: PronunciationTestStatus;
    onStart: () => void;
    onStop: () => void;
    disabled?: boolean;
}

const STATUS_UI: Record<PronunciationTestStatus, { label: string; toneClass: string }> = {
    idle: {
        label: 'Nhấn để đọc',
        toneClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
    recording: {
        label: 'Đang ghi…',
        toneClass: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
    processing: {
        label: 'Đang phân tích…',
        toneClass: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100',
    },
    done: {
        label: 'Đọc lại',
        toneClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
    error: {
        label: 'Thử lại',
        toneClass: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
    },
};

function StatusIcon({ status }: { status: PronunciationTestStatus }) {
    if (status === 'recording') {
        return <MicOff className="h-4 w-4" aria-hidden="true" />;
    }

    if (status === 'processing') {
        return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    }

    if (status === 'done') {
        return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
    }

    if (status === 'error') {
        return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    }

    return <Mic className="h-4 w-4" aria-hidden="true" />;
}

export function MicButton({ status, onStart, onStop, disabled }: MicButtonProps) {
    const ui = STATUS_UI[status];

    const handleClick = () => {
        if (status === 'recording') {
            onStop();
            return;
        }

        if (status === 'processing') {
            return;
        }

        onStart();
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="lg"
            className={`relative w-full justify-center gap-2 border ${ui.toneClass}`}
            aria-label={ui.label}
            aria-pressed={status === 'recording'}
            disabled={disabled || status === 'processing'}
            onClick={handleClick}
        >
            {status === 'recording' && (
                <span className="absolute -left-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
            )}
            <StatusIcon status={status} />
            {ui.label}
        </Button>
    );
}
