import { memo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AddNodeButton = memo(function AddNodeButton({
    label,
    onClick,
    disabled,
    className,
}: Props) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-7 w-full justify-start gap-1.5 rounded-md px-2 text-xs font-normal text-muted-foreground hover:text-foreground ${className ?? ''}`}
            aria-label={label}
        >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
        </Button>
    );
});
