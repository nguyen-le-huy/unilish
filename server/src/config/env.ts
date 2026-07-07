import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(process.cwd(), '.env') });


const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000'),
    // Support legacy key MONGODB_URI used by old deploy docs.
    MONGO_URI: z.string().optional(),
    MONGODB_URI: z.string().optional(),
    REDIS_URI: z.string().optional(),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    ADMIN_URL: z.string().default('http://localhost:5174'),
    SERVER_URL: z.string().default('http://localhost:5432'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string().optional(), // Falls back to JWT_SECRET if not set

    // Cloudinary
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Cloudflare R2
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_DOMAIN: z.string().optional(),

    // Pinecone (Vector Database)
    PINECONE_API_KEY: z.string().min(1, 'Pinecone API Key is required for vector search'),
    PINECONE_ENVIRONMENT: z.string().default('us-east1-gcp'),
    PINECONE_INDEX_NAME: z.string().default('unilish-knowledge'),
    /** @deprecated Kept for backward compatibility */
    PINECONE_COURSE_SERIES_INDEX_NAME: z.string().default('unilish-course-series'),
    PINECONE_COURSE_INDEX_NAME: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key is required for embeddings'),
    OPENAI_MODEL: z.string().default('gpt-5.4-mini-2026-03-17'),
    AI_ANALYSIS_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),
    OPENAI_GRADING_MODEL: z.string().default('gpt-5.4-mini-2026-03-17'),
    OPENAI_GRADING_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('low'),

    // OpenAI Realtime API — V1 Conversational Core
    // ALL realtime config is server-controlled. Client/Admin MUST NOT override at runtime.
    OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime-mini-2025-12-15'),
    OPENAI_REALTIME_VOICE: z.string().default('marin'),
    OPENAI_REALTIME_TURN_DETECTION_MODE: z.enum(['normal', 'semantic', 'disabled', 'server_vad']).default('normal'),
    OPENAI_REALTIME_TURN_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
    OPENAI_REALTIME_PREFIX_PADDING_MS: z.coerce.number().default(300),
    OPENAI_REALTIME_SILENCE_DURATION_MS: z.coerce.number().default(500),
    OPENAI_REALTIME_TRANSCRIPT_MODEL: z.string().default('gpt-4o-mini-transcribe'),
    OPENAI_REALTIME_NOISE_REDUCTION: z.enum(['far_field', 'near_field']).default('far_field'),
    OPENAI_REALTIME_MAX_OUTPUT_TOKENS: z.coerce.number().default(4096),
    // Session lifecycle — server-enforced, cannot be changed by client
    OPENAI_REALTIME_SESSION_TTL_MS: z.coerce.number().default(1_800_000),  // 30 minutes
    OPENAI_REALTIME_IDLE_CUTOFF_MS: z.coerce.number().default(15_000),     // 15 sec silence → auto-end

    SPEECH_COACH_DISABLE_AZURE_ASSESSMENT: z.string().default('true'),
    OPENAI_TTS_MODEL: z.string().default('gpt-4o-mini-tts-2025-12-15'),

    // Azure Speech (Pronunciation Assessment)
    AZURE_SPEECH_KEY: z.string().min(1, 'AZURE_SPEECH_KEY is required'),
    AZURE_SPEECH_REGION: z.string().min(1, 'AZURE_SPEECH_REGION is required'),
    AZURE_SPEECH_ENDPOINT: z.string().optional(),
    AZURE_SPEECH_LANGUAGE: z.string().default('en-US'),
    AZURE_SPEECH_ENABLE_PROSODY: z.string().default('true'),

    // ElevenLabs (Listening TTS)
    ELEVENLABS_API_KEY: z.string().optional(),
    ELEVENLABS_DEFAULT_VOICE_ID: z.string().default('EXAVITQu4vr4xnSDxMaL'), // "Sarah" — neutral EN voice

    // Deepgram (Word-level timestamp sync)
    DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY is required'),

    // IELTS Practice — skill-level feature flags (Phase 5 rollout)
    IELTS_PRACTICE_LISTENING_ENABLED: z.string().default('true'),
    IELTS_PRACTICE_READING_ENABLED: z.string().default('true'),
    IELTS_PRACTICE_WRITING_ENABLED: z.string().default('true'),
    IELTS_PRACTICE_SPEAKING_ENABLED: z.string().default('true'),

    // Auth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CALLBACK_URL: z.string().optional(),
    SESSION_SECRET: z.string().default('unilish-secret-key'),
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
    console.error('❌ Invalid environment variables:', envServer.error.format());
    process.exit(1);
}

const resolvedMongoUri = envServer.data.MONGO_URI ?? envServer.data.MONGODB_URI;

if (!resolvedMongoUri || resolvedMongoUri.trim().length === 0) {
    console.error('❌ Invalid environment variables: MONGO_URI (or legacy MONGODB_URI) is required');
    process.exit(1);
}

// Backward compatibility: fallback to the old env var name
const resolvedCourseIndexName = envServer.data.PINECONE_COURSE_INDEX_NAME
    ?? envServer.data.PINECONE_COURSE_SERIES_INDEX_NAME;

export const env = {
    ...envServer.data,
    MONGO_URI: resolvedMongoUri,
    PINECONE_COURSE_INDEX_NAME: resolvedCourseIndexName,
};
