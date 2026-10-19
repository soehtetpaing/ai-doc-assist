import { env } from '../../configs/env.js';
import { logger } from '../../utils/logger.js';

// lazy-loaded local pipeline
let localPipeline: any = null;

async function getLocalPipeline() {
    if (!localPipeline) {
        const { pipeline } = await import('@huggingface/transformers');
        localPipeline = await pipeline('feature-extraction', env.EMBEDDING_MODEL);
        logger.info(`Loaded local embedding model: ${env.EMBEDDING_MODEL} (${env.EMBEDDING_DIMENSION}d)`);
    }

    return localPipeline;
}

export async function embed(text: string): Promise<number[]> {
    if (env.EMBEDDING_PROVIDER === 'local') {
        const pipe = await getLocalPipeline();
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data as Float32Array);
    }

    throw new Error('OpenAI embeddings not configured')
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
    // sequential for performance - could batch
    const results: number[][] = [];
    for (const t of texts) {
        results.push(await embed(t));
    }
    return results;
}
