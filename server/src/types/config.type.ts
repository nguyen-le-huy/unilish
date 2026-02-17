export interface PlanConfig {
    price?: number;
    pricing?: {
        monthly: number;
        yearly: number;
        currency: string;
    };
    regionalPricing?: {
        regionCode: string; // 'VN', 'US', etc.
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
