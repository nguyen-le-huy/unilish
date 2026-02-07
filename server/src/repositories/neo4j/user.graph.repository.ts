import { BaseNeo4jRepository } from '../base/base.neo4j.repository.js';
import { type IUserNode, UserLabel } from '../../models/neo4j/user.model.js';
import { logger } from '../../utils/logger.js';

export class UserGraphRepository extends BaseNeo4jRepository {

    /**
     * Sync User from MongoDB to Neo4j
     * - Uses MERGE to Create or Update (Idempotent)
     * - Only updates properties, preserves existing relationships
     */
    async syncUser(user: Partial<IUserNode> & { userId: string }): Promise<void> {
        const query = `
            MERGE (u:${UserLabel} {userId: $userId})
            SET u += $props,
                u.updatedAt = datetime()
            RETURN u
        `;

        // Separate identity ($userId) from other props ($props)
        // to prevent overwriting userId or strict typing issues
        const { userId, ...props } = user;

        try {
            await this.executeQuery(query, { userId, props });
            logger.info(`[Neo4j] Synced User: ${userId}`);
        } catch (error) {
            logger.error(`[Neo4j] Failed to sync user ${userId}`, error);
            throw error;
        }
    }

    /**
     * Delete User from Neo4j
     * - Uses DETACH DELETE to remove node and all relationships
     */
    async deleteUser(userId: string): Promise<void> {
        const query = `
            MATCH (u:${UserLabel} {userId: $userId})
            DETACH DELETE u
        `;

        try {
            await this.executeQuery(query, { userId });
            logger.info(`[Neo4j] Deleted User: ${userId}`);
        } catch (error) {
            logger.error(`[Neo4j] Failed to delete user ${userId}`, error);
            throw error;
        }
    }

    /**
     * Ensure constraints exist (Critical for Data Integrity)
     * Should be called on server startup
     */
    async ensureConstraints(): Promise<void> {
        // Create Unique Constraint on userId
        const query = `
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:${UserLabel}) REQUIRE u.userId IS UNIQUE
        `;

        try {
            await this.executeQuery(query);
            logger.info('[Neo4j] User constraints ensured');
        } catch (error) {
            logger.error('[Neo4j] Failed to create constraints', error);
        }
    }
}
