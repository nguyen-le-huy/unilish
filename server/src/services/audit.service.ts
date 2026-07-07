import mongoose from 'mongoose';
import { AuditLog, EAuditAction } from '../models/mongo/audit-log.model.js';

type AuditAction = (typeof EAuditAction)[keyof typeof EAuditAction];

/**
 * Write an audit log entry.
 */
export async function writeAuditLog(params: {
    actorId: string;
    action: AuditAction;
    target: string;
    diff?: { oldValue?: unknown; newValue?: unknown };
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        await AuditLog.create({
            actorId: new mongoose.Types.ObjectId(params.actorId),
            action: params.action,
            target: params.target,
            ...(params.diff ? { diff: params.diff } : {}),
            ...(params.metadata ? { metadata: params.metadata } : {}),
        });
    } catch (error) {
        // Audit logging should never break the main operation
        console.error('[AuditLog] Failed to write audit entry:', error);
    }
}

/**
 * Convenience: write an IELTS practice audit event.
 */
export async function auditIeltsEvent(params: {
    actorId: string;
    event: 'created' | 'updated' | 'published' | 'paused' | 'archived' | 'rollback_created';
    testId: string;
    testName: string;
    version?: number;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
        created: EAuditAction.IELTS_TEST_CREATED,
        updated: EAuditAction.IELTS_TEST_UPDATED,
        published: EAuditAction.IELTS_TEST_PUBLISHED,
        paused: EAuditAction.IELTS_TEST_PAUSED,
        archived: EAuditAction.IELTS_TEST_ARCHIVED,
        rollback_created: EAuditAction.IELTS_TEST_ROLLBACK_CREATED,
    };

    const action = actionMap[params.event];
    if (!action) return;

    await writeAuditLog({
        actorId: params.actorId,
        action,
        target: `examtest:${params.testId}`,
        metadata: {
            testName: params.testName,
            ...(params.version !== undefined ? { version: params.version } : {}),
            ...params.metadata,
        },
    });
}
