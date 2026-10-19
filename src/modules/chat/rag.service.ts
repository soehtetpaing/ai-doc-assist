import { query } from "../../db/pool.js";
import { embed } from "../llm/embeddings.service.js";

export interface RetrievedChunk {
    id: string;
    content: string;
    similarity: number;
    chunkIndex: number;
    filename: string;
}

export async function retrieveContext(
    documentId: string,
    question: string,
    topK = 5
): Promise<RetrievedChunk[]> {
    const vector = await embed(question);
    const vecStr = `[${vector.join(',')}]`;

    const result = await query<{
        id: string,
        content: string,
        chunk_index: number,
        similarity: number,
        filename: string
    }>(
        `SELECT c.id, c.content, c.chunk_index, 
            1 - (c.embedding <=> $2::vector) AS similarity, 
            d.filename 
         FROM document_chunks c 
         JOIN documents d ON d.id = c.document_id 
         WHERE c.document_id = $1 
         ORDER BY c.embedding <=> $2::vector 
         LIMIT $3`,
        [documentId, vecStr, topK]
    );

    return result.rows.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: Number(r.similarity),
        chunkIndex: r.chunk_index,
        filename: r.filename
    }));
}

// RRF ~ Reciprocal Rank Fusion using
export async function retrieveContextRRF(
    documentId: string,
    question: string,
    topK = 5
): Promise<RetrievedChunk[]> {
    const vector = await embed(question);
    const vecStr = `[${vector.join(',')}]`;

    // RRF = sum over sources of 1 / (k + rank). k=60 is standard.
    const result = await query<{
        id: string;
        content: string;
        chunk_index: number;
        filename: string;
        similarity: number;
    }>(
        `WITH vec AS (
         SELECT id, content, chunk_index,
                 ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rnk,
                 1 - (embedding <=> $2::vector) AS similarity
         FROM document_chunks
         WHERE document_id = $1
         ORDER BY embedding <=> $2::vector
         LIMIT 30
         ),
         bm25 AS (
         SELECT id,
                 ROW_NUMBER() OVER (
                     ORDER BY ts_rank_cd(content_tsv, plainto_tsquery('english', $3)) DESC
                 ) AS rnk
         FROM document_chunks
         WHERE document_id = $1
             AND content_tsv @@ plainto_tsquery('english', $3)
         ORDER BY ts_rank_cd(content_tsv, plainto_tsquery('english', $3)) DESC
         LIMIT 30
         ),
         fused AS (
         SELECT COALESCE(v.id, b.id) AS id,
                 COALESCE(1.0 / (60 + v.rnk), 0) + COALESCE(1.0 / (60 + b.rnk), 0) AS rrf
         FROM vec v FULL OUTER JOIN bm25 b ON v.id = b.id
         )
         SELECT c.id, c.content, c.chunk_index, d.filename, v.similarity
         FROM fused f
         JOIN document_chunks c ON c.id = f.id
         JOIN documents d ON d.id = c.document_id
         LEFT JOIN vec v ON v.id = f.id
         ORDER BY f.rrf DESC
         LIMIT $4`,
        [documentId, vecStr, question, topK]
    );

    return result.rows.map((r) => ({
        id: r.id,
        content: r.content,
        similarity: Number(r.similarity ?? 0),
        chunkIndex: r.chunk_index,
        filename: r.filename,
    }));
}

export function buildPrompt(question: string, chunks: RetrievedChunk[]) {
    const context = chunks.map((c, i) => 
        `[Source ${i + 1} | chunk ${c.chunkIndex} | similarity ${c.similarity.toFixed(3)}]\n${c.content}`
    ).join('\n\n---\n\n');

    const system = `You are a precise document assistant. Answer the user's question using ONLY the provided context.
    If the answer cannot be found in the context, response exactly: "I could not find that in the document."
    Cite sources inline using the format [Source N]. Be concise and factual.`;
    
    const user = `Context:\n${context}\n\nQuestion: ${question}`;
    return { system, user };
}
