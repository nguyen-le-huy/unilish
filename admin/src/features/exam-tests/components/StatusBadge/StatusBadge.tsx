import { Badge } from '@/components/ui/badge';
import type { ExamTestStatus } from '../../types';
import { EXAM_STATUS_BADGE_CLASSES, EXAM_STATUS_LABELS } from '../../constants';

interface Props {
    status: ExamTestStatus;
}

export function StatusBadge({ status }: Props) {
    return (
        <Badge variant="outline" className={EXAM_STATUS_BADGE_CLASSES[status]}>
            {EXAM_STATUS_LABELS[status]}
        </Badge>
    );
}
