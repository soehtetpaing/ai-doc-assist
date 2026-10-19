import { query } from "../../db/pool.js";
import { NotFoundError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { LLMMessage, streamWithFallback } from "../llm/llm.factory.js";
import { rerank } from "../llm/reranker.service.js";
import { buildPrompt, retrieveContextRRF, RetrievedChunk } from "./rag.service.js";

export async function getOrCreateConversation(
    userId: string,
    documentId: string,
    conversationId?: string
) {
    if (conversationId) {
        const existing = await query(
            `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        if (existing.rows[0]) {
            return existing.rows[0];
        }
    }

    // verify document ownership
    const doc = await query(
        `SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND status = 'ready'`,
        [documentId, userId]
    );
    if (!doc.rows[0]) {
        throw new NotFoundError('Document not ready or not found');
    }

    const created = await query(
        `INSERT INTO conversations 
            (user_id, document_id, title) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [userId, documentId, 'New conversation']
    );

    return created.rows[0];
}

export async function getHistory(conversationId: string, userId: string) {
    const conv = await query(
        `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
        [conversationId, userId]
    );
    if (!conv.rows[0]) {
        throw new NotFoundError('Conversation not found');
    }

    const msgs = await query(
        `SELECT id, role, content, sources, created_at 
         FROM messages 
         WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
    );

    return msgs.rows;
}

interface StreamChatOptions {
    userId: string;
    documentId: string;
    conversationId?: string;
    question: string;
    onToken: (token: string) => void;
}

export async function streamChat(opts: StreamChatOptions) {
    const conv = await getOrCreateConversation(opts.userId, opts.documentId, opts.conversationId);
    
    // persist user message
    await query(
        `INSERT INTO messages 
            (conversation_id, role, content) 
         VALUES ($1, 'user', $2)`,
        [conv.id, opts.question]
    );

    // auto title
    if (!conv.title || conv.title === 'New conversation') {
        const title = opts.question.slice(0, 60) + (opts.question.length > 60 ? '…' : '');
        await query(
            `UPDATE conversations SET title = $1 WHERE id = $2`,
            [title, conv.id]
        );
    }

    // retrieve context
    // const chunks = await retrieveContext(opts.documentId, opts.question);

    // retrieve context and rerank context
    const candidates = await retrieveContextRRF(opts.documentId, opts.question, 20);
    const chunks = await rerank(opts.question, candidates, 5);
    logger.debug({ chunks: chunks.length, topSimilarity: chunks[0]?.similarity, topScore: chunks[0]?.score }, 'Retrieved context');

    // load recent history for LLM content
    const historyResult = await query<{ role: string; content: string }>(
        `SELECT role, content FROM messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC 
         LIMIT 10`,
        [conv.id]
    );

    const { system, user } = buildPrompt(opts.question, chunks);
    const messages: LLMMessage[] = [
        { role: 'system', content: system },
        ...historyResult.rows.filter((m) => m.role !== 'system')
            .slice(0, -1) // exclude just inserted user messaage
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: user }
    ];

    const { full, provider } = await streamWithFallback(messages, opts.onToken);
    logger.info({ conversationId: conv.id, provider }, 'Chat completed');

    const sources = chunks.map((c) => ({
        id: c.id,
        chunkIndex: c.chunkIndex,
        similarity: Number(c.similarity.toFixed(4)),
        content: c.content,
        filename: c.filename,
        score: Number(c.score.toFixed(4))
    }));

    // persist assistant message
    await query(
        `INSERT INTO messages 
            (conversation_id, role, content, sources) 
         VALUES ($1, 'assistant', $2, $3)`,
        [conv.id, full, JSON.stringify(sources)]
    );

    return {
        conversationId: conv.id,
        answer: full,
        sources,
        provider
    };
}

export async function getConversations(userId: string) {
    const result = await query(
        `SELECT c.id, c.document_id, c.title, c.created_at, d.filename, 
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id)::int AS message_count 
         FROM conversations c 
         JOIN documents d ON d.id = c.document_id 
         WHERE c.user_id = $1 
         ORDER BY c.created_at DESC 
         LIMIT 50`,
        [userId]
    );

    return result.rows;
}

export async function renameConversation(conversationId: string, userId: string, title: string) {
    const result = await query(
        `UPDATE conversations SET title = $1 
         WHERE id = $2 AND user_id = $3 
         RETURNING *`,
        [title, conversationId, userId]
    );

    return result.rows[0];
}

export async function deleteConversation(conversationId: string, userId: string) {
    const result = await query(
        `DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id`,
        [conversationId, userId]
    );

    if (result.rowCount === 0) throw new NotFoundError('Conversation not found');
}
