import { Copy, PauseCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import type {
    CoachState,
} from '../../types/speaking.types';

interface Props {
    lastRequestedModelName: string;
    lastModelName: string;
    targetLanguage: string;
    voiceId: string;
    roleName: string;
    sessionId: string;
    lastUsedFallback: boolean;
    lastLatencyMs: number | null;
    lastTokenUsage: number | null;
    coachState: CoachState;
    rawRealtimeEvents: { ts: number; type: string }[];
    onForceInterrupt: () => void;
}

const TelemetryRow = ({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) => (
    <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-0.5 text-sm font-semibold break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
);

export const SandboxTelemetryPanel = ({
    lastRequestedModelName,
    lastModelName,
    targetLanguage,
    voiceId,
    roleName,
    sessionId,
    lastUsedFallback,
    lastLatencyMs,
    lastTokenUsage,
    coachState,
    rawRealtimeEvents,
    onForceInterrupt,
}: Props) => {
    const copySessionId = () => {
        if (sessionId && sessionId !== '—') void navigator.clipboard.writeText(sessionId);
    };

    const eventLogRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (eventLogRef.current) {
            eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
        }
    }, [rawRealtimeEvents]);

    return (
        <div className="flex h-full flex-col bg-muted/20">
            <div className="border-b px-6 py-4">
                <p className="text-xs text-muted-foreground">THE DEBUG CONSOLE (X-RAY)</p>
                <h3 className="text-lg font-semibold">OpenAI Telemetry</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">

                    {/* Session identity */}
                    <div className="rounded-md border bg-background p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Session</p>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Session ID</p>
                                <p className="mt-0.5 text-xs font-mono break-all text-muted-foreground">{sessionId}</p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={copySessionId}
                                title="Copy session ID"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                        <TelemetryRow label="Role Name" value={roleName} />
                    </div>

                    {/* Model info */}
                    <div className="rounded-md border bg-background p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</p>
                        <TelemetryRow label="Requested" value={lastRequestedModelName} mono />
                        <TelemetryRow label="Actual Response" value={lastModelName} mono />
                        {lastUsedFallback && (
                            <p className="text-xs text-amber-600">Realtime bị lỗi tạm thời, đang fallback sang model khác.</p>
                        )}
                    </div>

                    {/* Language & Voice */}
                    <div className="rounded-md border bg-background p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Language &amp; Voice</p>
                        <TelemetryRow label="Target Language" value={targetLanguage} />
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Voice ID</p>
                                <Badge variant="secondary" className="mt-0.5 font-mono text-sm">{voiceId}</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="rounded-md border bg-background p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Latency</p>
                                <p className={`mt-0.5 text-sm font-semibold ${
                                    lastLatencyMs !== null && lastLatencyMs > 800 ? 'text-destructive' : 'text-emerald-600'
                                }`}>
                                    {lastLatencyMs !== null ? `${lastLatencyMs}ms` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tokens / turn</p>
                                <p className="mt-0.5 text-sm font-semibold">{lastTokenUsage ?? '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI State */}
                    <div className="rounded-md border bg-background p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI State Machine</p>
                        <p className="text-lg font-semibold">{coachState}</p>
                        <Button type="button" variant="outline" className="w-full" onClick={onForceInterrupt}>
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Force Interrupt
                        </Button>
                    </div>

                    {/* Raw event log */}
                    <div className="rounded-md border bg-background p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Live Events ({rawRealtimeEvents.length})
                        </p>
                        {rawRealtimeEvents.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Chưa có events — bật Realtime để xem.</p>
                        ) : (
                            <div
                                ref={eventLogRef}
                                className="max-h-48 overflow-y-auto space-y-0.5 font-mono text-[11px]"
                            >
                                {rawRealtimeEvents.map((ev, i) => (
                                    <div key={i} className="flex gap-2 leading-5">
                                        <span className="shrink-0 text-muted-foreground">
                                            {new Date(ev.ts).toISOString().substring(11, 23)}
                                        </span>
                                        <span className={`break-all ${
                                            ev.type.startsWith('error')
                                                ? 'text-destructive'
                                                : ev.type.startsWith('response.audio')
                                                ? 'text-emerald-600'
                                                : ev.type === 'session.created' || ev.type === 'session.updated'
                                                ? 'text-blue-500'
                                                : 'text-foreground'
                                        }`}>
                                            {ev.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
