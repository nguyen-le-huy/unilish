import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
};

export function Loading({ size = 'md', className }: Props) {
    return (
        <div className={cn('flex items-center justify-center text-muted-foreground', className)} role="status" aria-live="polite">
            <Loader2 className={cn('animate-spin', sizeClasses[size])} aria-hidden="true" />
            <span className="sr-only">Đang tải dữ liệu</span>
        </div>
    );
}