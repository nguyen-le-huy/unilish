import { ConfigService } from './config.service.js';
import redisClient from '../config/redis.js';
import { logger } from '../utils/logger.js';
import type { SubscriptionConfig } from '../types/config.type.js';

export class QuotaService {
    /**
     * Check if user has quota for a feature
     * @param userId User ID
     * @param userPlan User Plan ('FREE' | 'PREMIUM')
     * @param feature Feature key ('ai_chat' | 'ai_speaking') or 'unit_access'
     */
    static async checkQuota(
        userId: string,
        userPlan: 'FREE' | 'PREMIUM',
        feature: 'ai_chat' | 'ai_speaking'
    ): Promise<boolean> {
        try {
            // 1. Get Dynamic Config
            const config = await ConfigService.getSubscriptionConfig();
            const planConfig = config[userPlan];

            if (!planConfig) {
                logger.error(`Invalid plan config for user ${userId} with plan ${userPlan}`);
                return false; // Fail safe
            }

            // 2. Check Unlimited (-1)
            const limitKey = `${feature}_daily` as keyof typeof planConfig.limits;
            const limit = planConfig.limits[limitKey];

            if (limit === -1) {
                return true; // Unlimited
            }

            // 3. Check Redis Counter
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
            // In case of error, maybe allow or deny? Secure default implies deny, but for UX maybe allow?
            // Let's deny for now to force fix.
            return false;
        }
    }

    /**
     * Increment usage counter for a feature
     */
    static async incrementUsage(
        userId: string,
        feature: 'ai_chat' | 'ai_speaking'
    ): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const redisKey = `quota:${userId}:${feature}:${today}`;

            // Increment and set expiry (24 hours + buffer)
            await redisClient.incr(redisKey);
            await redisClient.expire(redisKey, 86400 * 2); // 48 hours to be safe
        } catch (error) {
            logger.error('Error incrementing usage:', error);
        }
    }

    /**
     * Check unit access limit
     * @param userPlan 
     * @param unitIndex 0-based index of the unit
     */
    static async checkUnitAccess(userPlan: 'FREE' | 'PREMIUM', unitIndex: number): Promise<boolean> {
        try {
            const config = await ConfigService.getSubscriptionConfig();
            const planConfig = config[userPlan];

            const limit = planConfig.limits.unit_access_limit;

            if (limit === -1) return true;

            // If limit is 3, user can access unit 0, 1, 2. So index < limit.
            return unitIndex < limit;
        } catch (error) {
            logger.error('Error checking unit access:', error);
            return false;
        }
    }
}
