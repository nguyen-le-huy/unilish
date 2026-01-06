import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
    url: env.REDIS_URI || 'redis://localhost:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));

export const connectRedis = async () => {
    try {
        if (!env.REDIS_URI) {
            logger.warn('Redis URI not provided, skipping Redis connection');
            return;
        }
        await redisClient.connect();
    } catch (error) {
        logger.error('Error connecting to Redis:', error);
        // We might not want to exit process if Redis fails, depending on criticality
    }
};

export default redisClient;
