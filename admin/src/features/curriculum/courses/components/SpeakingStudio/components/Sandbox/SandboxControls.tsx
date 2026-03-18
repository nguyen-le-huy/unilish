import { Lightbulb, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PttMicButton } from './PttMicButton';
import type { SpeakingHint } from '../../types/speaking.types';
import type { PttStatus, TurnResult } from '../../types/pipeline.types';

interface Props {
    pttStatus: PttStatus;
    turnResult: TurnResult;
    hints: SpeakingHint[];
    showHints: boolean;
    onToggleMic: () => void;
    onToggleHints: () => void;
    onResetSession: () => void;
}

const statusText: Record<PttStatus, string> = {
    idle: 'Sẵn sàng ghi âm lượt mới.',
    recording: 'Đang ghi âm... nhấn lại để dừng.',
    processing: 'Đang xử lý STT, chấm phát âm và tạo phản hồi AI.',
    ai_speaking: 'AI đang phát phản hồi bằng giọng nói.',
    error: 'Có lỗi trong lượt trước, nhấn mic để thử lại.',
};

export const SandboxControls = ({
    pttStatus,
    turnResult,
    hints,
    showHints,
    onToggleMic,
    onToggleHints,
    onResetSession,
}: Props) => {
    return (
        <div className="border-t bg-background px-6 py-4">
            <div className="space-y-3">
                <PttMicButton status={pttStatus} onToggle={onToggleMic} />

                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={onToggleHints}>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Gợi ý
                    </Button>
                    <Button type="button" variant="ghost" onClick={onResetSession}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset session
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">{statusText[pttStatus]}</p>

                {turnResult.error && (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {turnResult.error}
                    </p>
                )}

                {showHints && hints.length > 0 && (
                    <div className="rounded-md border bg-muted/40 p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Gợi ý hội thoại</p>
                        <div className="space-y-2">
                            {hints.map((hint, index) => (
                                <div key={`${hint.en ?? ''}-${index}`} className="text-sm">
                                    <p className="font-medium">{hint.en}</p>
                                    <p className="text-muted-foreground">{hint.vi}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
