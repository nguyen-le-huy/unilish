import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import redisClient, { connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
    // Connect to Databases
    await connectDB();
    await connectRedis();

    const PORT = env.PORT;

    const server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
        logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
        logger.error(`${err.name}: ${err.message}`);
        server.close(() => {
            process.exit(1);
        });
    });

    // Graceful Shutdown
    const gracefulShutdown = async () => {
        logger.info('SIGTERM/SIGINT received. Shutting down gracefully...');
        server.close(async () => {
            logger.info('Http server closed.');
            try {
                await mongoose.connection.close(false);
                logger.info('MongoDB connection closed.');
                if (redisClient.isOpen) {
                    await redisClient.quit();
                    logger.info('Redis connection closed.');
                }
                process.exit(0);
            } catch (err) {
                logger.error('Error during shutdown', err);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
};

startServer();
