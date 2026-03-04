import { Badge } from '@/components/ui/badge';
import type { PlacementTestStatus } from '../../types';
import { PLACEMENT_STATUS_LABELS } from '../../constants';

// ─── Variant Map ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
    PlacementTestStatus,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    active: 'default',
    draft: 'secondary',
    paused: 'outline',
    archived: 'destructive',
};

const STATUS_CLASS: Record<PlacementTestStatus, string> = {
    active: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
    draft: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
    archived: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    status: PlacementTestStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: Props) {
    return (
        <Badge
            variant={STATUS_VARIANT[status]}
            className={STATUS_CLASS[status]}
        >
            {PLACEMENT_STATUS_LABELS[status]}
        </Badge>
    );
}
