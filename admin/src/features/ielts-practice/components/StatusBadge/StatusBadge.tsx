import { Badge } from '@/components/ui/badge';
import type { ContentStatus } from '../../types';
import { STATUS_LABELS } from '../../types';

const STATUS_CLASS: Record<ContentStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100',
  active: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  archived: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
};

interface Props {
  status: ContentStatus;
}

export function IeltsStatusBadge({ status }: Props) {
  return (
    <Badge variant="outline" className={STATUS_CLASS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
