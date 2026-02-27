import { useLayoutEffect, useRef } from 'react';

import type { CoachChatMessage } from '../../types/speaking.types';

interface Props {
    missionTitle: string;
    messages: CoachChatMessage[];
    liveTranscript: string;
}

export const SandboxChatPanel = ({
    missionTitle,
    messages,
    liveTranscript,
}: Props) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const timelineStart = messages.length > 0 ? messages[0].createdAt : Date.now();

    // Auto-scroll to bottom on new message or live transcript change
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (el) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        }
    }, [messages, liveTranscript]);

    const formatElapsed = (createdAt: number) => {
        const elapsedMs = Math.max(0, createdAt - timelineStart);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const ss = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="border-b px-6 py-3">
                <p className="text-xs text-muted-foreground">THE STUDENT PLAYGROUND</p>
                <h3 className="text-base font-semibold">Mission: {missionTitle}</h3>
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                <div className="space-y-4">
                    {messages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Bấm "Bắt đầu luyện tập" để AI chào và bắt đầu hội thoại.
                        </p>
                    ) : (
                        messages.map((message) => (
                            <div key={message.id} className="grid grid-cols-[48px_1fr] gap-3">
                                <div className="pt-0.5 font-mono text-[11px] text-muted-foreground">
                                    {formatElapsed(message.createdAt)}
                                </div>

                                <div className="space-y-0.5">
                                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                                        message.role === 'assistant'
                                            ? 'text-blue-500'
                                            : 'text-emerald-600'
                                    }`}>
                                        {message.role === 'assistant' ? 'Assistant' : 'User'}
                                    </p>
                                    <p className="text-base leading-relaxed text-foreground">
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}

                    {liveTranscript && (
                        <div className="grid grid-cols-[48px_1fr] gap-3">
                            <div className="pt-0.5 font-mono text-[11px] text-muted-foreground">LIVE</div>
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                                    User (interim)
                                </p>
                                <p className="text-base leading-relaxed text-emerald-600">
                                    {liveTranscript}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
