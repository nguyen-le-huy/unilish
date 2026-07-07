import mongoose from 'mongoose';

export const EAuditAction = {
    UPDATE_DRAFT: 'update_draft',
    PUBLISH_CONFIG: 'publish_config',
    REVERT_CONFIG: 'revert_config',
    IELTS_TEST_CREATED: 'ielts_test.created',
    IELTS_TEST_UPDATED: 'ielts_test.updated',
    IELTS_TEST_PUBLISHED: 'ielts_test.published',
    IELTS_TEST_PAUSED: 'ielts_test.paused',
    IELTS_TEST_ARCHIVED: 'ielts_test.archived',
    IELTS_TEST_ROLLBACK_CREATED: 'ielts_test.rollback_created',
} as const;

export interface IAuditLog extends mongoose.Document {
    actorId: mongoose.Types.ObjectId;  // Who did it?
    action: typeof EAuditAction[keyof typeof EAuditAction]; // What action?
    target: string; // 'SUBSCRIPTION_CONFIG' etc.
    diff?: {
        oldValue: any;
        newValue: any;
    };
    metadata?: Record<string, any>; // IP, Device
    createdAt: Date;
}

const AuditLogSchema = new mongoose.Schema<IAuditLog>(
    {
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        action: {
            type: String,
            enum: Object.values(EAuditAction),
            required: true
        },
        target: {
            type: String,
            required: true,
            index: true
        },
        diff: {
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false } // Immutable logs
    }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
