/**
 * @module structured-log.fields
 * @description Shared structured log field definitions for the Speech Coach module.
 * Ensures consistent log shape across all module files for log aggregation (Datadog/Sentry).
 */

export interface SpeechCoachLogContext {
    readonly sessionId: string;
    readonly userId?: string;
    readonly lessonId?: string;
    readonly traceId: string;
    readonly personaId?: string;
    readonly event?: string;
    readonly errorCode?: string;
    readonly durationMs?: number;
    readonly sequenceNumber?: number;
    readonly latencyMs?: number;
    readonly provider?: 'azure' | 'openai';
    readonly module: string; // e.g. '[StartSessionOrchestrator]'
}

export function buildLogContext(
    module: string,
    context: Omit<SpeechCoachLogContext, 'module'>,
): SpeechCoachLogContext {
    return { module, ...context };
}
