import { Pinecone, type Index } from '@pinecone-database/pinecone';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Pinecone Client Singleton
 * Manages vector database connection for semantic search operations
 */
class PineconeClient {
    private static instance: Pinecone | null = null;
    private static knowledgeIndexInstance: Index | null = null;
    private static courseIndexInstance: Index | null = null;

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

            const indexNames = Array.from(new Set([
                env.PINECONE_INDEX_NAME,
                env.PINECONE_COURSE_INDEX_NAME,
            ]));

            await Promise.all(indexNames.map((indexName) => this.validateIndex(indexName)));

            return this.instance;
        } catch (error) {
            logger.error('❌ Pinecone connection failed:', error);
            throw new Error('Failed to connect to Pinecone vector database');
        }
    }

    private static async validateIndex(indexName: string): Promise<void> {
        if (!this.instance) {
            throw new Error('Pinecone client is not initialized');
        }

        try {
            const indexDescription = await this.instance.describeIndex(indexName);
            logger.info(
                `✅ Pinecone Connected | Index: ${indexName} | Dimension: ${indexDescription.dimension} | Metric: ${indexDescription.metric}`
            );
        } catch (error) {
            if (this.isNotFoundError(error)) {
                logger.warn(
                    `⚠️ Pinecone index "${indexName}" not found. Server will continue booting, but features using this index will fail until the index is created.`
                );
                return;
            }

            throw error;
        }
    }

    private static isNotFoundError(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const maybeError = error as { name?: unknown; message?: unknown; status?: unknown; statusCode?: unknown };
        const name = typeof maybeError.name === 'string' ? maybeError.name : '';
        const message = typeof maybeError.message === 'string' ? maybeError.message : '';
        const status = maybeError.status;
        const statusCode = maybeError.statusCode;

        return name === 'PineconeNotFoundError'
            || message.includes('HTTP status 404')
            || status === 404
            || statusCode === 404;
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

        if (!this.knowledgeIndexInstance) {
            this.knowledgeIndexInstance = this.instance.index(env.PINECONE_INDEX_NAME);
        }

        return this.knowledgeIndexInstance;
    }

    /**
     * Get Course Pinecone index instance for recommendation vectors.
     * Replaces the old Course Series index.
     * @returns Pinecone Index instance
     * @throws Error if Pinecone is not initialized
     */
    static getCourseIndex(): Index {
        if (!this.instance) {
            throw new Error('Pinecone not initialized. Call PineconeClient.connect() first.');
        }

        if (!this.courseIndexInstance) {
            this.courseIndexInstance = this.instance.index(env.PINECONE_COURSE_INDEX_NAME);
        }

        return this.courseIndexInstance;
    }

    /**
     * Disconnect from Pinecone (cleanup)
     */
    static async disconnect(): Promise<void> {
        this.instance = null;
        this.knowledgeIndexInstance = null;
        this.courseIndexInstance = null;
        logger.info('✅ Pinecone disconnected');
    }
}

// Named exports for backward compatibility
export const connectPinecone = PineconeClient.connect.bind(PineconeClient);
export const getPineconeIndex = PineconeClient.getIndex.bind(PineconeClient);
export const getCourseIndex = PineconeClient.getCourseIndex.bind(PineconeClient);
export const disconnectPinecone = PineconeClient.disconnect.bind(PineconeClient);

