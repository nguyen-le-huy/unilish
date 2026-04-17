import { Badge } from '@/components/ui/badge';
import type { ExamFormat } from '../../types';
import { EXAM_FORMAT_BADGE_CLASSES, EXAM_FORMAT_LABELS } from '../../constants';

interface Props {
    format: ExamFormat;
}

export function FormatBadge({ format }: Props) {
    return (
        <Badge variant="outline" className={EXAM_FORMAT_BADGE_CLASSES[format]}>
            {EXAM_FORMAT_LABELS[format]}
        </Badge>
    );
}
