import { Lightbulb, Mic, MicOff, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { SpeakingHint } from '../../types/speaking.types';

interface Props {
    isVoiceRealtimeOn: boolean;
    isListening: boolean;
    lastMicError: string;
    chatInput: string;
    showHints: boolean;
    hints: SpeakingHint[];
    isSendingDisabled: boolean;
    onChatInputChange: (value: string) => void;
    onSendMessage: () => void;
    onToggleVoiceRealtime: () => void;
    onToggleHints: () => void;
}

export const SandboxControls = ({
    isVoiceRealtimeOn,
    isListening,
    lastMicError,
    chatInput,
    showHints,
    hints,
    isSendingDisabled,
    onChatInputChange,
    onSendMessage,
    onToggleVoiceRealtime,
    onToggleHints,
}: Props) => {
    return (
        <div className="border-t bg-background px-6 py-4">
            <div className="mb-3 flex items-center justify-center gap-3">
                <Button
                    type="button"
                    size="lg"
                    variant={isVoiceRealtimeOn ? 'destructive' : 'default'}
                    className="h-14 rounded-full px-6"
                    onClick={onToggleVoiceRealtime}
                >
                    {isVoiceRealtimeOn ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
                    {isVoiceRealtimeOn ? 'Kết thúc luyện tập' : 'Bắt đầu luyện tập'}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={onToggleHints}
                >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Hint
                </Button>
            </div>

            <div className="mb-2 flex items-center gap-2">
                <Input
                    value={chatInput}
                    onChange={(event) => onChatInputChange(event.target.value)}
                    placeholder="Type as student..."
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            onSendMessage();
                        }
                    }}
                />
                <Button
                    type="button"
                    onClick={onSendMessage}
                    disabled={isSendingDisabled}
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                {isListening ? 'Mic listening...' : 'Mic idle'}
            </p>

            {lastMicError && (
                <p className="mt-1 text-xs text-destructive">{lastMicError}</p>
            )}

            {showHints && hints.length > 0 && (
                <div className="mt-3 rounded-md border bg-muted/40 p-3">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Hints</p>
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
    );
};
