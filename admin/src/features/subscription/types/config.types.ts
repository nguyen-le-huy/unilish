export interface PlanConfig {
    price?: number;
    pricing?: {
        monthly: number;
        yearly: number;
        currency: string;
    };
    regionalPricing?: {
        regionCode: string;
        pricing: {
            monthly: number;
            yearly: number;
            currency: string;
        };
    }[];
    limits: {
        ai_chat_daily: number;
        ai_speaking_daily: number;
        unit_access_limit: number;
    };
    features: {
        offline_download: boolean;
        verified_certificate: boolean;
        ads_enabled: boolean;
        advanced_analytics: boolean;
    };
}

export interface SubscriptionConfig {
    FREE: PlanConfig;
    PREMIUM: PlanConfig;
}

export interface SubscriptionStats {
    totalUsers: number;
    freeUsers: number;
    premiumUsers: number;
    conversionRate: number;
}

export const EAuditAction = {
    UPDATE_DRAFT: 'update_draft',
    PUBLISH_CONFIG: 'publish_config',
    REVERT_CONFIG: 'revert_config',
} as const;

export interface IAuditLog {
    _id: string;
    actorId: {
        _id: string;
        fullName: string;
        email: string;
    };
    action: typeof EAuditAction[keyof typeof EAuditAction];
    target: string;
    diff?: {
        oldValue: unknown;
        newValue: unknown;
    };
    createdAt: string;
}
