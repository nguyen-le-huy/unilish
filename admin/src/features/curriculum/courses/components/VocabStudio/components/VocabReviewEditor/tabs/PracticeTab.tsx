import { memo } from 'react';
import { Construction } from 'lucide-react';

// ─── Component ────────────────────────────────────────────────────────────────

export const PracticeTab = memo(function PracticeTab() {
    return (
        <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="space-y-3">
                <Construction className="mx-auto h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">Bảng luyện tập</p>
                <p className="text-xs text-muted-foreground">
                    Tính năng tạo câu hỏi luyện tập sẽ ra mắt trong Sprint tiếp theo.
                </p>
            </div>
        </div>
    );
});
