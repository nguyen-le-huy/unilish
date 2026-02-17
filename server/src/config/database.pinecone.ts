import { Pinecone, type Index } from '@pinecone-database/pinecone';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Pinecone Client Singleton
 * Manages vector database connection for semantic search operations
 */
class PineconeClient {
    private static instance: Pinecone | null = null;
    private static indexInstance: Index | null = null;

    /**
     * Initialize and connect to Pinecone
     * @returns Configured Pinecone instance
     */
    static async connect(): Promise<Pinecone> {
        if (this.instance) {
            return this.instance;
        }

        try {
            this.instance = new Pinecone({
                apiKey: env.PINECONE_API_KEY,
            });

            // Validate index existence and configuration
            const indexDescription = await this.instance.describeIndex(env.PINECONE_INDEX_NAME);

            logger.info(
                `✅ Pinecone Connected | Index: ${env.PINECONE_INDEX_NAME} | Dimension: ${indexDescription.dimension} | Metric: ${indexDescription.metric}`
            );

            return this.instance;
        } catch (error) {
            logger.error('❌ Pinecone connection failed:', error);
            throw new Error('Failed to connect to Pinecone vector database');
        }
    }

    /**
     * Get Pinecone index instance for vector operations
     * @returns Pinecone Index instance
     * @throws Error if Pinecone is not initialized
     */
    static getIndex(): Index {
        if (!this.instance) {
            throw new Error('Pinecone not initialized. Call PineconeClient.connect() first.');
        }

        if (!this.indexInstance) {
            this.indexInstance = this.instance.index(env.PINECONE_INDEX_NAME);
        }

        return this.indexInstance;
    }

    /**
     * Disconnect from Pinecone (cleanup)
     */
    static async disconnect(): Promise<void> {
        // Pinecone SDK doesn't require explicit disconnection
        // but we reset instances for clean shutdown
        this.instance = null;
        this.indexInstance = null;
        logger.info('✅ Pinecone disconnected');
    }
}

// Named exports for backward compatibility
export const connectPinecone = PineconeClient.connect.bind(PineconeClient);
export const getPineconeIndex = PineconeClient.getIndex.bind(PineconeClient);
export const disconnectPinecone = PineconeClient.disconnect.bind(PineconeClient);
