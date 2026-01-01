import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000'),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
    REDIS_URI: z.string().optional(),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    JWT_EXPIRES_IN: z.string().default('7d'),
});

const envServer = envSchema.safeParse(process.env);

if (!envServer.success) {
    console.error('❌ Invalid environment variables:', envServer.error.format());
    process.exit(1);
}

export const env = envServer.data;
