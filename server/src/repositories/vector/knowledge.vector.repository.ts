import { BaseVectorRepository, type VectorQueryOptions } from '../base/base.vector.repository.js';
import type {
    KnowledgeVectorMetadata,
    KnowledgeType,
    CEFRLevel,
    VectorSearchMatch,
} from '../../models/vector/knowledge-vector.js';
import { generateVectorId } from '../../models/vector/knowledge-vector.js';
import { logger } from '../../utils/logger.js';

/**
 * Filter options for knowledge vector search
 */
export interface KnowledgeVectorFilter {
    /** Filter by knowledge type */
    type?: KnowledgeType;

    /** Filter by CEFR level */
    cefr_level?: CEFRLevel;

    /** Filter by tags (all must match) */
    tags?: string[];

    /** Filter by MongoDB ID */
    mongo_id?: string;
}

/**
 * Repository for Knowledge Vector operations
 * Handles vocabulary, grammar, lessons, and concepts in Pinecone
 */
export class KnowledgeVectorRepository extends BaseVectorRepository<KnowledgeVectorMetadata> {
    constructor() {
        super();
    }

    /**
     * Find similar knowledge items by embedding vector
     * @param embedding - Query embedding vector (1536 dimensions)
     * @param limit - Maximum number of results (default: 10)
     * @param filter - Optional metadata filters
     * @returns Array of similar vectors with scores
     */
    async findSimilar(
        embedding: number[],
        limit: number = 10,
        filter?: KnowledgeVectorFilter
    ): Promise<VectorSearchMatch[]> {
        // Build Pinecone metadata filter
        const metadataFilter: Record<string, unknown> = {};

        if (filter?.type) {
            metadataFilter.type = { $eq: filter.type };
        }

        if (filter?.cefr_level) {
            metadataFilter.cefr_level = { $eq: filter.cefr_level };
        }

        if (filter?.mongo_id) {
            metadataFilter.mongo_id = { $eq: filter.mongo_id };
        }

        if (filter?.tags && filter.tags.length > 0) {
            // Pinecone supports $in operator for array fields
            metadataFilter.tags = { $in: filter.tags };
        }

        const result = await this.query(embedding, {
            topK: limit,
            ...(Object.keys(metadataFilter).length > 0 && { filter: metadataFilter }),
            includeMetadata: true,
            includeValues: false,
        });

        return result.matches.map(match => ({
            id: match.id,
            score: match.score ?? 0,
            metadata: match.metadata as KnowledgeVectorMetadata,
        })) as VectorSearchMatch[];
    }

    /**
     * Upsert a single knowledge vector
     * @param type - Knowledge type
     * @param uniqueId - Unique identifier (e.g., MongoDB ObjectId)
     * @param embedding - 1536-dimensional vector
     * @param metadata - Vector metadata
     */
    async upsertKnowledge(
        type: KnowledgeType,
        uniqueId: string,
        embedding: number[],
        metadata: Omit<KnowledgeVectorMetadata, 'type'>
    ): Promise<void> {
        const vectorId = generateVectorId(type, uniqueId);

        const vector = {
            id: vectorId,
            values: embedding,
            metadata: {
                ...metadata,
                type,
                created_at: metadata.created_at || new Date().toISOString(),
            } as KnowledgeVectorMetadata,
        };

        await this.upsert([vector]);
        logger.info(`✅ Upserted ${type} vector: ${vectorId}`);
    }

    /**
     * Upsert multiple knowledge vectors in batch
     * More efficient than calling upsertKnowledge multiple times
     */
    async upsertBatch(
        vectors: Array<{
            type: KnowledgeType;
            uniqueId: string;
            embedding: number[];
            metadata: Omit<KnowledgeVectorMetadata, 'type'>;
        }>
    ): Promise<void> {
        const formattedVectors = vectors.map(v => ({
            id: generateVectorId(v.type, v.uniqueId),
            values: v.embedding,
            metadata: {
                ...v.metadata,
                type: v.type,
                created_at: v.metadata.created_at || new Date().toISOString(),
            } as KnowledgeVectorMetadata,
        }));

        await this.upsert(formattedVectors);
    }

    /**
     * Delete knowledge vectors by type
     * @param type - Knowledge type to delete
     */
    async deleteByType(type: KnowledgeType): Promise<void> {
        await this.deleteByFilter({ type: { $eq: type } });
        logger.info(`✅ Deleted all vectors of type: ${type}`);
    }

    /**
     * Delete knowledge vector by MongoDB ID
     * @param mongoId - MongoDB ObjectId
     */
    async deleteByMongoId(mongoId: string): Promise<void> {
        await this.deleteByFilter({ mongo_id: { $eq: mongoId } });
        logger.info(`✅ Deleted vectors linked to MongoDB ID: ${mongoId}`);
    }

    /**
     * Delete knowledge vectors by CEFR level
     * @param level - CEFR level to delete
     */
    async deleteByCEFRLevel(level: CEFRLevel): Promise<void> {
        await this.deleteByFilter({ cefr_level: { $eq: level } });
        logger.info(`✅ Deleted all vectors for CEFR level: ${level}`);
    }

    /**
     * Get count of vectors by type
     */
    async getCountByType(type: KnowledgeType): Promise<number> {
        const stats = await this.getStats();

        // Note: Pinecone doesn't provide filtered counts directly
        // This returns total vectors in the index
        // For exact counts by type, you'd need to query with metadata filter

        return stats.totalRecordCount ?? 0;
    }
}
