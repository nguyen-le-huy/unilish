import neo4j, { Driver } from 'neo4j-driver';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const driver: Driver = neo4j.driver(
    env.NEO4J_URI,
    neo4j.auth.basic(
        env.NEO4J_USER,
        env.NEO4J_PASSWORD
    )
);

export const connectNeo4j = async (): Promise<void> => {
    try {
        await driver.verifyConnectivity();
        logger.info('Neo4j Connected');
    } catch (error) {
        logger.error('Error connecting to Neo4j:', error);
    }
};

export default driver;
