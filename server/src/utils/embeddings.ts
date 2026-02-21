import OpenAI from 'openai';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * OpenAI Client for generating text embeddings
 * Uses text-embedding-3-small model (1536 dimensions) for cost efficiency
 */
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

/**
 * Configuration for embedding generation
 */
const EMBEDDING_CONFIG = {
    model: 'text-embedding-3-small' as const, // 1536 dimensions, cost-effective
    maxTokens: 8191, // Model limit
    dimensions: 1536, // Output vector size
} as const;

/**
 * Generate OpenAI text embedding vector
 * @param text - Input text to embed (max 8191 tokens)
 * @returns 1536-dimensional embedding vector
 * @throws Error if API call fails
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        throw new Error('Cannot generate embedding for empty text');
    }

    try {
        const response = await openai.embeddings.create({
            model: EMBEDDING_CONFIG.model,
            input: text.trim(),
            dimensions: EMBEDDING_CONFIG.dimensions,
        });

        const firstItem = response.data[0];
        if (!firstItem) {
            throw new Error('No embedding returned from OpenAI');
        }

        const embedding = firstItem.embedding;

        if (!embedding || embedding.length !== EMBEDDING_CONFIG.dimensions) {
            throw new Error(`Invalid embedding dimension: expected ${EMBEDDING_CONFIG.dimensions}, got ${embedding?.length}`);
        }

        return embedding;
    } catch (error) {
        logger.error('Failed to generate embedding:', { error, textLength: text.length });
        throw error;
    }
}

/**
 * Generate embeddings for multiple texts in a single API call (batch processing)
 * More efficient than calling generateEmbedding() in a loop
 * @param texts - Array of texts to embed (max 2048 inputs per batch)
 * @returns Array of embedding vectors
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
        return [];
    }

    // OpenAI batch limit: 2048 inputs
    const BATCH_SIZE = 2048;
    if (texts.length > BATCH_SIZE) {
        logger.warn(`Batch size ${texts.length} exceeds limit ${BATCH_SIZE}. Processing in chunks...`);

        const batches: number[][][] = [];
        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const chunk = texts.slice(i, i + BATCH_SIZE);
            const embeddings = await generateBatchEmbeddings(chunk);
            batches.push(embeddings);
        }

        return batches.flat();
    }

    try {
        const response = await openai.embeddings.create({
            model: EMBEDDING_CONFIG.model,
            input: texts.map(t => t.trim()),
            dimensions: EMBEDDING_CONFIG.dimensions,
        });

        return response.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
        logger.error('Failed to generate batch embeddings:', { error, batchSize: texts.length });
        throw error;
    }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param vec1 - First embedding vector
 * @param vec2 - Second embedding vector
 * @returns Similarity score (0 to 1, where 1 is identical)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
        throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
        const v1 = vec1[i];
        const v2 = vec2[i];
        if (v1 === undefined || v2 === undefined) continue;

        dotProduct += v1 * v2;
        norm1 += v1 * v1;
        norm2 += v2 * v2;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Truncate text to fit within token limits (rough estimate)
 * @param text - Text to truncate
 * @param maxTokens - Maximum allowed tokens (default: 8000 to leave buffer)
 * @returns Truncated text
 */
export function truncateText(text: string, maxTokens: number = 8000): string {
    // Rough estimate: 1 token ≈ 4 characters for English
    const estimatedChars = maxTokens * 4;

    if (text.length <= estimatedChars) {
        return text;
    }

    return text.substring(0, estimatedChars) + '...';
}
