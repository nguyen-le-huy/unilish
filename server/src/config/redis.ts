import { createClient } from 'redis';
import { env } from './env.js';

const redisClient = createClient({
    url: env.REDIS_URI || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export const connectRedis = async () => {
    try {
        if (!env.REDIS_URI) {
            console.warn('Redis URI not provided, skipping Redis connection');
            return;
        }
        await redisClient.connect();
    } catch (error) {
        console.error('Error connecting to Redis:', error);
        // We might not want to exit process if Redis fails, depending on criticality
        // For now, let's just log it.
    }
};

export default redisClient;
