import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import neo4j from 'neo4j-driver';
import { User } from '../models/mongo/user.model.js';
import { logger } from '../utils/logger.js';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const cleanAllUsers = async () => {
    let mongoConnected = false;
    let neo4jDriver;

    try {
        console.log('🚀 Starting clean up script...');

        // 1. Connect MongoDB
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
        await mongoose.connect(process.env.MONGO_URI);
        mongoConnected = true;
        console.log('✅ Connected to MongoDB');

        // 2. Connect Neo4j
        const neo4jUri = process.env.NEO4J_URI || 'neo4j://localhost:7687';
        const neo4jUser = process.env.NEO4J_USER || 'neo4j';
        const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

        neo4jDriver = neo4j.driver(
            neo4jUri,
            neo4j.auth.basic(neo4jUser, neo4jPassword)
        );
        await neo4jDriver.verifyConnectivity();
        console.log('✅ Connected to Neo4j');

        // 3. Delete ALL Users in MongoDB
        const mongoResult = await User.deleteMany({});
        console.log(`🗑️  Deleted ${mongoResult.deletedCount} users from MongoDB`);

        // 4. Delete ALL User nodes in Neo4j
        const session = neo4jDriver.session();
        try {
            const neo4jResult = await session.run('MATCH (u:User) DETACH DELETE u');
            const nodesDeleted = neo4jResult.summary.counters.updates().nodesDeleted;
            console.log(`🗑️  Deleted ${nodesDeleted} User nodes from Neo4j`);
        } finally {
            await session.close();
        }

        console.log('✨ Clean up completed successfully!');

    } catch (error) {
        console.error('❌ Error cleaning users:', error);
    } finally {
        if (mongoConnected) await mongoose.connection.close();
        if (neo4jDriver) await neo4jDriver.close();
        process.exit(0);
    }
};

cleanAllUsers();
