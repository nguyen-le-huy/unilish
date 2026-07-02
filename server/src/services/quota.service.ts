import redisClient from '../config/redis.js';
import { logger } from '../utils/logger.js';

// ─── Global Daily Limits ─────────────────────────────────────────────────────
// These replace the old plan-based subscription config.
// All users receive the same non-commercial access to protect against AI-cost abuse.
// Configured via environment variables with safe defaults.

const getDailyLimit = (feature: 'ai_chat' | 'ai_speaking'): number => {
    const envKey = `GLOBAL_LIMIT_${feature.toUpperCase()}_DAILY`;
    const raw = process.env[envKey];
    if (raw) {
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= -1) {
            return parsed; // -1 = unlimited
        }
    }
    // Defaults
    return feature === 'ai_chat' ? 50 : 20;
};

const getUnitAccessLimit = (): number => {
    const raw = process.env['GLOBAL_LIMIT_UNIT_ACCESS'];
    if (raw) {
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= -1) {
            return parsed;
        }
    }
    return 3; // default: 3 units
};

export class QuotaService {
    /**
     * Check if user has quota remaining for a feature.
     * All users share the same global daily limit.
     */
    static async checkQuota(
        userId: string,
        _userPlan: 'FREE' | 'PREMIUM',
        feature: 'ai_chat' | 'ai_speaking',
    ): Promise<boolean> {
        try {
            const limit = getDailyLimit(feature);

            if (limit === -1) {
                return true; // Unlimited
            }

            const today = new Date().toISOString().split('T')[0];
            const redisKey = `quota:${userId}:${feature}:${today}`;

            const currentUsageStr = await redisClient.get(redisKey);
            const currentUsage = parseInt(currentUsageStr || '0', 10);

            if (currentUsage >= limit) {
                logger.info(`User ${userId} reached ${feature} limit (${currentUsage}/${limit})`);
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Error checking quota:', error);
            return false;
        }
    }

    /**
     * Increment usage counter for a feature.
     */
    static async incrementUsage(
        userId: string,
        feature: 'ai_chat' | 'ai_speaking',
    ): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const redisKey = `quota:${userId}:${feature}:${today}`;

            await redisClient.incr(redisKey);
            await redisClient.expire(redisKey, 86400 * 2); // 48 hours
        } catch (error) {
            logger.error('Error incrementing usage:', error);
        }
    }

    /**
     * Check unit access limit (all users same).
     */
    static async checkUnitAccess(_userPlan: 'FREE' | 'PREMIUM', unitIndex: number): Promise<boolean> {
        try {
            const limit = getUnitAccessLimit();
            if (limit === -1) return true;
            return unitIndex < limit;
        } catch (error) {
            logger.error('Error checking unit access:', error);
            return false;
        }
    }
}
