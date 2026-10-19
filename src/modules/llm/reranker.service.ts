import { env } from '../../configs/env.js';
import { logger } from '../../utils/logger.js';

let reranker: any = null;

async function getReranker() {
    if (!reranker) {
        const { pipeline } = await import('@huggingface/transformers');
        reranker = await pipeline('text-classification', env.RERANKER_MODEL);
        logger.info(`Loaded re-ranker model: ${env.RERANKER_MODEL}`);
    }

    return reranker;
}

export async function rerank<T extends { id: string; content: string }>(
    query: string,
    candidates: T[],
    topK: number
): Promise<Array<T & { score: number }>> {
    if (candidates.length === 0 || topK <= 0) return [];

    const model = await getReranker();

    const scored = await Promise.all(
        candidates.map(async (candidate) => {
            const output = await model(
                { text: query, text_pair: candidate.content.slice(0, 512) },
                { top_k: 1 }
            );

            return { ...candidate, score: output[0]?.score ?? 0 };
        })
    );

    return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, topK);
}
