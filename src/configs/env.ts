import 'dotenv/config';
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PJ_NAME: z.string().optional(),
    VERSION: z.string().optional(),
    PORT: z.coerce.number().default(3000),
    SECRET_KEY: z.string().min(4),
    API_URL: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    SSL_REJECT_UNAUTHORIZED_USE: z.stringbool().default(false),
    JWT_SECRET: z.string().min(16),
    JWT_EXPIRES_IN: z.string().default('7d'),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().optional(),
    EMBEDDING_PROVIDER: z.enum(['local', 'openai']).default('local'),
    EMBEDDING_MODEL: z.string().default('Xenova/all-MiniLM-L6-v2'),
    EMBEDDING_DIMENSION: z.coerce.number().default(384),
    RERANKER_MODEL: z.string().default('Xenova/ms-marco-MiniLM-L-6-v2')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(z.treeifyError(parsed.error));
    process.exit(1);
}

export const env = parsed.data;
