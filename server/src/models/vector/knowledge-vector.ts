/**
 * Pinecone Vector Model Definitions
 * Type-safe interfaces for knowledge vectors stored in Pinecone
 */

/**
 * Knowledge item types supported in the vector database
 */
export type KnowledgeType = 'vocabulary' | 'grammar' | 'lesson' | 'concept';

/**
 * CEFR Proficiency Levels (Common European Framework of Reference)
 */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Metadata attached to each vector in Pinecone
 * Used for filtering and contextual retrieval
 */
export interface KnowledgeVectorMetadata {
    /** Type of knowledge item */
    type: KnowledgeType;

    /** Display name of the knowledge item */
    name: string;

    /** CEFR proficiency level (optional for some types) */
    cefr_level?: CEFRLevel;

    /** Tags for categorization and filtering */
    tags: string[];

    /** Original text content (used for context in search results) */
    content: string;

    /** Reference to MongoDB document ID (for cross-database linking) */
    mongo_id?: string;

    /** Timestamp when vector was created */
    created_at: string;

    /** Allow additional metadata fields (no undefined allowed for Pinecone compatibility) */
    [key: string]: string | string[];
}

/**
 * Complete knowledge vector structure in Pinecone
 */
export interface KnowledgeVector {
    /** Unique identifier (format: {type}_{id}) */
    id: string;

    /** 1536-dimensional embedding vector from OpenAI */
    values: number[];

    /** Searchable metadata */
    metadata: KnowledgeVectorMetadata;
}

/**
 * Query result from Pinecone similarity search
 */
export interface VectorSearchMatch {
    /** Vector ID */
    id: string;

    /** Similarity score (0-1, higher is more similar) */
    score: number;

    /** Metadata from the matched vector */
    metadata?: KnowledgeVectorMetadata;
}

/**
 * Query response from Pinecone
 */
export interface VectorSearchResult {
    matches: VectorSearchMatch[];
    namespace?: string;
}

/**
 * Type guard to check if metadata is for vocabulary
 */
export function isVocabularyVector(metadata: KnowledgeVectorMetadata): boolean {
    return metadata.type === 'vocabulary';
}

/**
 * Type guard to check if metadata is for grammar
 */
export function isGrammarVector(metadata: KnowledgeVectorMetadata): boolean {
    return metadata.type === 'grammar';
}

/**
 * Type guard to check if metadata is for lesson
 */
export function isLessonVector(metadata: KnowledgeVectorMetadata): boolean {
    return metadata.type === 'lesson';
}

/**
 * Type guard to check if metadata is for concept
 */
export function isConceptVector(metadata: KnowledgeVectorMetadata): boolean {
    return metadata.type === 'concept';
}

/**
 * Helper to generate vector ID from type and unique identifier
 */
export function generateVectorId(type: KnowledgeType, uniqueId: string): string {
    return `${type}_${uniqueId}`;
}

/**
 * Helper to parse vector ID into components
 */
export function parseVectorId(vectorId: string): { type: KnowledgeType; id: string } | null {
    const parts = vectorId.split('_');

    if (parts.length < 2) {
        return null;
    }

    const [type, ...idParts] = parts;

    // Type guard to ensure type is defined
    if (typeof type !== 'string') {
        return null;
    }

    if (!['vocabulary', 'grammar', 'lesson', 'concept'].includes(type)) {
        return null;
    }

    return {
        type: type as KnowledgeType,
        id: idParts.join('_'),
    };
}
