
import mongoose from 'mongoose';
import { SystemSetting } from '../models/mongo/system-setting.model.js'; // Adjust path if needed
import { connectDB } from '../config/database.mongo.js'; // Adjusted to match export
import type { SubscriptionConfig } from '../types/config.type.js'; // Type-only import
import { logger } from '../utils/logger.js';

const CONFIG_VALUE: SubscriptionConfig = {
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

const run = async () => {
    try {
        await connectDB();
        logger.info('Connected to MongoDB');

        await SystemSetting.findOneAndUpdate(
            { key: 'SUBSCRIPTION_CONFIG' },
            {
                value: CONFIG_VALUE,
                description: 'Cấu hình giới hạn và giá cho Free/Premium (Update 2026)'
            },
            { upsert: true, new: true }
        );

        logger.info('✅ Successfully updated SUBSCRIPTION_CONFIG');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error updating config:', error);
        process.exit(1);
    }
};

run();
