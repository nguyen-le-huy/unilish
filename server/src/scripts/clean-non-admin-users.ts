
import mongoose from 'mongoose';
import { connectDB } from '../config/database.mongo.js';
import driver from '../config/database.neo4j.js';
import { User, EUserRole } from '../models/mongo/user.model.js';
import { logger } from '../utils/logger.js';

const cleanNonAdminUsers = async () => {
    try {
        // 1. Connect to MongoDB
        await connectDB();

        // 2. Connect to Neo4j
        await driver.verifyConnectivity();
        logger.info('Neo4j Connected');

        // 3. Find non-admin users
        logger.info('Finding non-admin users...');
        const allUsers = await User.find({}).select('_id email role');
        logger.info(`Total users in DB: ${allUsers.length}`);

        const usersToDelete = allUsers.filter(u => u.role !== EUserRole.ADMIN);

        const count = usersToDelete.length;
        if (count === 0) {
            logger.info('No non-admin users found.');
            process.exit(0);
        }

        const userIds = usersToDelete.map(u => u._id.toString());
        logger.info(`Found ${count} users to delete.`);

        // 4. Delete from MongoDB
        const mongoResult = await User.deleteMany({ _id: { $in: userIds } });
        logger.info(`[MongoDB] Deleted ${mongoResult.deletedCount} users.`);

        // 5. Delete from Neo4j
        const session = driver.session();
        try {
            const neo4jResult = await session.run(
                `
                MATCH (u:User)
                WHERE u.userId IN $userIds
                DETACH DELETE u
                RETURN count(u) as deletedCount
                `,
                { userIds }
            );
            const record = neo4jResult.records[0];
            const deletedNodes = record ? record.get('deletedCount').toNumber() : 0;
            logger.info(`[Neo4j] Deleted ${deletedNodes} user nodes.`);
        } finally {
            await session.close();
        }

        logger.info('Cleanup complete.');
    } catch (error) {
        logger.error('Error cleaning users:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        await driver.close();
        process.exit(0);
    }
};

cleanNonAdminUsers();
