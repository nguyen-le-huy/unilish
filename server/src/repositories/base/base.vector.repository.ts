import type { Index, RecordMetadata } from '@pinecone-database/pinecone';
import { getPineconeIndex } from '../../config/database.pinecone.js';
import { logger } from '../../utils/logger.js';

/**
 * Generic interface for vector operations
 */
export interface VectorRecord<T extends RecordMetadata = RecordMetadata> {
    id: string;
    values: number[];
    metadata: T;
}

/**
 * Query options for vector search
 */
export interface VectorQueryOptions {
    /** Number of results to return */
    topK?: number;

    /** Metadata filter */
    filter?: Record<string, unknown>;

    /** Include vector values in response */
    includeValues?: boolean;

    /** Include metadata in response */
    includeMetadata?: boolean;

    /** Namespace to query (optional) */
    namespace?: string;
}

/**
 * Base Repository for Pinecone Vector Operations
 * Provides common CRUD operations for vector embeddings
 * 
 * @template T - Metadata type (must extend RecordMetadata)
 */
export abstract class BaseVectorRepository<T extends RecordMetadata = RecordMetadata> {
    private index: Index | null;
    private readonly getIndexInstance: () => Index;

    constructor(indexFactory: () => Index = getPineconeIndex) {
        this.index = null;
        this.getIndexInstance = indexFactory;
    }

    protected ensureIndex(): Index {
        if (!this.index) {
            this.index = this.getIndexInstance();
        }

        return this.index;
    }

    /**
     * Upsert (insert or update) vectors into Pinecone
     * @param vectors - Array of vectors to upsert
     * @param namespace - Optional namespace for multi-tenancy
     * @returns Upsert operation result
     */
    async upsert(vectors: VectorRecord<T>[], namespace?: string): Promise<void> {
        if (vectors.length === 0) {
            logger.warn('BaseVectorRepository.upsert: No vectors provided');
            return;
        }

        try {
            await this.ensureIndex().namespace(namespace ?? '').upsert({ records: vectors });

            logger.info(`✅ Upserted ${vectors.length} vectors${namespace ? ` to namespace: ${namespace}` : ''}`);
        } catch (error) {
            logger.error('BaseVectorRepository.upsert failed:', { error, count: vectors.length });
            throw error;
        }
    }

    /**
     * Query vectors by similarity using embedding vector
     * @param vector - Query embedding vector
     * @param options - Query configuration
     * @returns Similar vectors with scores
     */
    async query(vector: number[], options: VectorQueryOptions = {}) {
        const {
            topK = 10,
            filter,
            includeValues = false,
            includeMetadata = true,
            namespace,
        } = options;

        try {
            const result = await this.ensureIndex().namespace(namespace ?? '').query({
                vector,
                topK,
                includeMetadata,
                includeValues,
                ...(filter && { filter }),
            });

            return result;
        } catch (error) {
            logger.error('BaseVectorRepository.query failed:', { error, topK, hasFilter: !!filter });
            throw error;
        }
    }

    /**
     * Fetch vectors by IDs
     * @param ids - Array of vector IDs
     * @param namespace - Optional namespace
     */
    async fetch(ids: string[], namespace?: string) {
        if (ids.length === 0) {
            return { records: {} };
        }

        try {
            return await this.ensureIndex().namespace(namespace ?? '').fetch({ ids });
        } catch (error) {
            logger.error('BaseVectorRepository.fetch failed:', { error, ids: ids.length });
            throw error;
        }
    }

    /**
     * Delete vectors by IDs
     * @param ids - Array of vector IDs to delete
     * @param namespace - Optional namespace
     */
    async delete(ids: string[], namespace?: string): Promise<void> {
        if (ids.length === 0) {
            logger.warn('BaseVectorRepository.delete: No IDs provided');
            return;
        }

        try {
            await this.ensureIndex().namespace(namespace ?? '').deleteMany(ids);

            logger.info(`✅ Deleted ${ids.length} vectors${namespace ? ` from namespace: ${namespace}` : ''}`);
        } catch (error) {
            logger.error('BaseVectorRepository.delete failed:', { error, ids: ids.length });
            throw error;
        }
    }

    /**
     * Delete vectors by metadata filter
     * @param filter - Metadata filter criteria
     * @param namespace - Optional namespace
     */
    async deleteByFilter(filter: Record<string, unknown>, namespace?: string): Promise<void> {
        try {
            await this.ensureIndex().namespace(namespace ?? '').deleteMany({ filter });

            logger.info(`✅ Deleted vectors by filter${namespace ? ` in namespace: ${namespace}` : ''}`, { filter });
        } catch (error) {
            logger.error('BaseVectorRepository.deleteByFilter failed:', { error, filter });
            throw error;
        }
    }

    /**
     * Delete all vectors in a namespace
     * WARNING: This is a destructive operation
     * @param namespace - Namespace to clear
     */
    async deleteAll(namespace?: string): Promise<void> {
        try {
            await this.ensureIndex().namespace(namespace ?? '').deleteAll();

            logger.warn(`⚠️ Deleted ALL vectors${namespace ? ` in namespace: ${namespace}` : ''}`);
        } catch (error) {
            logger.error('BaseVectorRepository.deleteAll failed:', { error });
            throw error;
        }
    }

    /**
     * Get index statistics
     */
    async getStats() {
        try {
            return await this.ensureIndex().describeIndexStats();
        } catch (error) {
            logger.error('BaseVectorRepository.getStats failed:', { error });
            throw error;
        }
    }
}
