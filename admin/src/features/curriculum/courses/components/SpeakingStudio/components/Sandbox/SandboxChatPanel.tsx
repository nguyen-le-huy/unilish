import { useLayoutEffect, useRef, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CoachChatMessage } from '../../types/speaking.types';

interface Props {
    missionTitle: string;
    messages: CoachChatMessage[];
    // liveTranscript removed — no longer shown in chat panel
}

type GoogleTranslateChunk = [string, ...unknown[]];

/** Gọi Google Translate API không cần key (free endpoint) */
const translateToVietnamese = async (text: string): Promise<string> => {
    const query = encodeURIComponent(text);
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + query;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation failed');

    const data = await res.json() as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('Unexpected translation payload');
    }

    const chunks = data[0].filter((chunk): chunk is GoogleTranslateChunk => {
        return Array.isArray(chunk) && typeof chunk[0] === 'string';
    });

    return chunks.map((chunk) => chunk[0]).join('');
};

export const SandboxChatPanel = ({
    missionTitle,
    messages,
}: Props) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const timelineStart = messages[0]?.createdAt ?? 0;

    // translationMap: messageId → translated text | 'loading' | 'error'
    const [translationMap, setTranslationMap] = useState<Record<string, string>>({});

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [messages]);

    const formatElapsed = (createdAt: number) => {
        const elapsedMs = Math.max(0, createdAt - timelineStart);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const ss = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    };

    const handleTranslate = async (messageId: string, content: string) => {
        if (translationMap[messageId]) return;
        setTranslationMap((prev) => ({ ...prev, [messageId]: 'loading' }));
        try {
            const translated = await translateToVietnamese(content);
            setTranslationMap((prev) => ({ ...prev, [messageId]: translated }));
        } catch {
            setTranslationMap((prev) => ({ ...prev, [messageId]: 'error' }));
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="border-b px-6 py-3">
                <p className="text-xs text-muted-foreground">KHU VỰC LUYỆN TẬP</p>
                <h3 className="text-base font-semibold">Nhiệm vụ: {missionTitle}</h3>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Nhấn nút mic bên dưới để bắt đầu một lượt nói mới.
                        </p>
                    ) : (
                        messages.map((message) => {
                            const isAssistant = message.role === 'assistant';
                            const translation = translationMap[message.id];

                            return (
                                <div key={message.id} className="grid grid-cols-[48px_1fr] gap-3">
                                    <div className="pt-0.5 font-mono text-[11px] text-muted-foreground">
                                        {formatElapsed(message.createdAt)}
                                    </div>

                                    <div className="space-y-1">
                                        <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                                            isAssistant ? 'text-blue-500' : 'text-emerald-600'
                                        }`}>
                                            {isAssistant ? 'Trợ lý AI' : 'Học viên'}
                                        </p>
                                        <p className="text-base leading-relaxed text-foreground">
                                            {message.content}
                                        </p>

                                        {/* Nút dịch — chỉ cho assistant */}
                                        {isAssistant && message.content && (
                                            <div className="pt-1">
                                                {!translation && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                                        onClick={() => void handleTranslate(message.id, message.content)}
                                                    >
                                                        <Languages className="h-3 w-3" />
                                                        Dịch sang tiếng Việt
                                                    </Button>
                                                )}
                                                {translation === 'loading' && (
                                                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Đang dịch...
                                                    </p>
                                                )}
                                                {translation === 'error' && (
                                                    <p className="text-[11px] text-destructive">
                                                        Không thể dịch, vui lòng thử lại.
                                                    </p>
                                                )}
                                                {translation && translation !== 'loading' && translation !== 'error' && (
                                                    <div className="rounded-md border-l-2 border-blue-300 bg-blue-50 px-3 py-1.5 dark:border-blue-700 dark:bg-blue-950/30">
                                                        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Dịch nghĩa:</p>
                                                        <p className="text-sm leading-relaxed text-foreground">{translation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
