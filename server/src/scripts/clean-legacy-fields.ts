import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import { User } from '../models/mongo/user.model.js';
import { logger } from '../utils/logger.js';

const cleanLegacyFields = async () => {
    try {
        await connectDB();
        logger.info('Connected to MongoDB');

        // Access native collection to bypass schema strictness
        // @ts-ignore
        const collection = User.collection;

        const query = {
            $or: [
                { streak: { $exists: true } },
                { coins: { $exists: true } },
                { xp: { $exists: true } },
                { stats: { $exists: true } },
                { longestStreak: { $exists: true } }
            ]
        };

        const total = await collection.countDocuments(query);
        logger.info(`Found ${total} users with legacy fields (streak, coins, xp, stats, longestStreak).`);

        if (total > 0) {
            const result = await collection.updateMany(query, {
                $unset: {
                    streak: "",
                    coins: "",
                    xp: "",
                    stats: "",
                    longestStreak: ""
                }
            });
            logger.info(`Cleaned legacy fields from ${result.modifiedCount} users.`);
        } else {
            logger.info('Database is clean. No legacy fields found.');
        }

    } catch (error) {
        logger.error('Error cleaning legacy fields:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

cleanLegacyFields();
