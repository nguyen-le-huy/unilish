import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import redisClient, { connectRedis } from './config/redis.js';

const startServer = async () => {
    // Connect to Databases
    await connectDB();
    await connectRedis();

    const PORT = env.PORT;

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
        console.log('UNHANDLED REJECTION! 💥 Shutting down...');
        console.log(err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });

    // Graceful Shutdown
    const gracefulShutdown = async () => {
        console.log('SIGTERM/SIGINT received. Shutting down gracefully...');
        server.close(async () => {
            console.log('Http server closed.');
            try {
                await mongoose.connection.close(false);
                console.log('MongoDB connection closed.');
                if (redisClient.isOpen) {
                    await redisClient.quit();
                    console.log('Redis connection closed.');
                }
                process.exit(0);
            } catch (err) {
                console.error('Error during shutdown', err);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
};

startServer();
