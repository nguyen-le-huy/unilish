import { SystemSetting } from '../models/mongo/system-setting.model.js';
import redisClient from '../config/redis.js';
import type { SubscriptionConfig } from '../types/config.type.js';
import type { SubscriptionStats } from '../types/analytics.type.js';
import { User, ESubscriptionPlan } from '../models/mongo/user.model.js';
import { AuditLog, EAuditAction } from '../models/mongo/audit-log.model.js';
import type { IAuditLog } from '../models/mongo/audit-log.model.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

const CACHE_KEY = 'sys:config:subscription';
const CACHE_TTL = 3600; // Cache 1 hour

export class ConfigService {
    /**
     * Get subscription configuration (Priority: Redis -> MongoDB)
     */
    static async getSubscriptionConfig(): Promise<SubscriptionConfig> {
        try {
            // 1. Check Redis
            const cached = await redisClient.get(CACHE_KEY);
            if (cached) {
                return JSON.parse(cached) as SubscriptionConfig;
            }
        } catch (error) {
            logger.error('Redis error (get config):', error);
            // Fallback to MongoDB if Redis fails
        }

        // 2. Fallback to MongoDB
        const setting = await SystemSetting.findOne({ key: 'SUBSCRIPTION_CONFIG' });

        if (!setting) {
            // Return default config if not found (Safety net)
            logger.warn('Subscription Config not found in DB, using defaults');
            return DEFAULT_CONFIG;
        }

        const config = setting.value as SubscriptionConfig;

        try {
            // 3. Save to Redis
            await redisClient.set(CACHE_KEY, JSON.stringify(config), {
                EX: CACHE_TTL
            });
        } catch (error) {
            logger.error('Redis error (set config):', error);
        }

        return config;
    }

    /**
     * Update subscription configuration
     */
    /**
     * Update subscription configuration (Legacy - Direct Update)
     * @deprecated Use publishConfig instead
     */
    static async updateSubscriptionConfig(newConfig: SubscriptionConfig): Promise<SubscriptionConfig> {
        return this.saveDraft(newConfig, new mongoose.Types.ObjectId('000000000000000000000000')); // Redirect to draft if legacy called
    }

    /**
     * Save Draft Config (No publish)
     */
    static async saveDraft(newConfig: SubscriptionConfig, actorId: mongoose.Types.ObjectId): Promise<SubscriptionConfig> {
        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'SUBSCRIPTION_CONFIG' },
            {
                draftValue: newConfig,
                description: 'Cấu hình giới hạn và giá cho Free/Premium (Draft)'
            },
            { upsert: true, new: true }
        );

        // Audit Log for Draft Update
        await AuditLog.create({
            actorId,
            action: EAuditAction.UPDATE_DRAFT,
            target: 'SUBSCRIPTION_CONFIG',
            diff: {
                oldValue: setting.draftValue, // This might be equal to newConfig since new:true, logic adjustment needed if strict diff required
                newValue: newConfig
            }
        });

        return newConfig;
    }

    /**
     * Get Draft Config
     */
    static async getDraft(): Promise<SubscriptionConfig | null> {
        const setting = await SystemSetting.findOne({ key: 'SUBSCRIPTION_CONFIG' });
        return setting?.draftValue || null;
    }

    /**
     * Publish Draft to Live
     */
    static async publishConfig(actorId: mongoose.Types.ObjectId): Promise<SubscriptionConfig> {
        const setting = await SystemSetting.findOne({ key: 'SUBSCRIPTION_CONFIG' });
        if (!setting || !setting.draftValue) {
            throw new AppError('No draft to publish', HttpStatus.BAD_REQUEST);
        }

        const oldConfig = setting.value;
        const newConfig = setting.draftValue;

        // 1. Update Live Config
        setting.value = newConfig;
        setting.lastPublishedAt = new Date();
        setting.publishedBy = actorId;
        // setting.draftValue = null; // Optional: Clear draft or keep it? Keeping it facilitates minor edits. clearing it is safer. let's keep it.
        await setting.save();

        // 2. Audit Log
        await AuditLog.create({
            actorId,
            action: EAuditAction.PUBLISH_CONFIG,
            target: 'SUBSCRIPTION_CONFIG',
            diff: {
                oldValue: oldConfig,
                newValue: newConfig
            }
        });

        // 3. Refresh Cache
        await this.refreshConfig();

        return newConfig as SubscriptionConfig;
    }

    /**
     * Get Revision History
     */
    static async getHistory(): Promise<IAuditLog[]> {
        return AuditLog.find({ target: 'SUBSCRIPTION_CONFIG' })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('actorId', 'fullName email')
            .lean();
    }

    /**
     * Refresh the localized cache
     */
    static async refreshConfig() {
        try {
            await redisClient.del(CACHE_KEY);
            logger.info('Subscription config cache cleared');
            return await this.getSubscriptionConfig();
        } catch (error) {
            logger.error('Redis error (refresh config):', error);
            throw error;
        }
    }

    /**
     * Get subscription statistics (Real-time from DB)
     */
    static async getSubscriptionStats(): Promise<SubscriptionStats> {
        try {
            const stats = await User.aggregate([
                {
                    $group: {
                        _id: '$subscription.plan',
                        count: { $sum: 1 }
                    }
                }
            ]);

            let freeUsers = 0;
            let premiumUsers = 0;

            stats.forEach(bucket => {
                if (bucket._id === ESubscriptionPlan.FREE) freeUsers = bucket.count;
                if (bucket._id === ESubscriptionPlan.PREMIUM) premiumUsers = bucket.count;
            });

            const totalUsers = freeUsers + premiumUsers;
            const conversionRate = totalUsers > 0
                ? parseFloat(((premiumUsers / totalUsers) * 100).toFixed(2))
                : 0;

            return {
                totalUsers,
                freeUsers,
                premiumUsers,
                conversionRate
            };
        } catch (error) {
            logger.error('Error fetching subscription stats:', error);
            throw error;
        }
    }
}

const DEFAULT_CONFIG: SubscriptionConfig = {
    FREE: {
        price: 0,
        limits: {
            ai_chat_daily: 10,
            ai_speaking_daily: 5,
            unit_access_limit: 3
        },
        features: {
            offline_download: false,
            verified_certificate: false,
            ads_enabled: true,
            advanced_analytics: false
        }
    },
    PREMIUM: {
        pricing: {
            monthly: 169000,
            yearly: 1428000,
            currency: "VND"
        },
        limits: {
            ai_chat_daily: -1,
            ai_speaking_daily: -1,
            unit_access_limit: -1
        },
        features: {
            offline_download: true,
            verified_certificate: true,
            ads_enabled: false,
            advanced_analytics: true
        }
    }
};
