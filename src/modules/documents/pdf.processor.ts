import { logger } from "../../utils/logger.js";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedBatch } from "../llm/embeddings.service.js";
import { pool, query } from "../../db/pool.js";
import { PoolClient } from "pg";

interface ProcessResult {
    pageCount: number;
    chunkCount: number;
}

export async function processPdf(documentId: string, buffer: Buffer): Promise<ProcessResult> {
    logger.info({ documentId }, "Parsing PDF");

    let parser: PDFParse | undefined;
    let client: PoolClient | undefined;
    let transactionStarted = false;

    try {
        parser = new PDFParse({ data: new Uint8Array(buffer) });
        const parsed = await parser.getText();

        const rawText = parsed.text?.trim() ?? '';
        const pageCount = parsed.total;

        if (!rawText) {
            throw new Error('PDF contains no extractable text');
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 800,
            chunkOverlap: 120,
            separators: ['\n\n', '\n', '. ', ' ', '']
        });

        const docs = await splitter.createDocuments([rawText]);
        const contents = docs.map((doc) => doc.pageContent);

        logger.info({ documentId, chunks: contents.length }, 'Embedding chunks');

        const embeddings = await embedBatch(contents);
        if (embeddings.length !== contents.length) {
            throw new Error('Embedding count does not match chunk count');
        }

        // insert chunks in a single transaction
        client = await pool.connect();

        await client.query('BEGIN');
        transactionStarted = true;

        for (let i = 0; i < contents.length; i++) {
            const vector = `[${embeddings[i].join(',')}]`;

            await client.query(
                `INSERT INTO document_chunks 
                    (document_id, chunk_index, content, embedding) 
                 VALUES ($1, $2, $3, $4::vector)`,
                [documentId, i, contents[i], vector]
            );
        }

        await client.query(
            `UPDATE documents 
             SET status = 'ready', page_count = $1 
             WHERE id = $2`,
            [pageCount, documentId]
        );

        await client.query('COMMIT');
        transactionStarted = false;

        return {
            pageCount,
            chunkCount: contents.length
        };
    } catch (error) {
        if (transactionStarted && client) {
            await client.query('ROLLBACK');
        }

        await query(
            `UPDATE documents SET status = 'failed' WHERE id = $1`,
            [documentId]
        );

        throw error;
    } finally {
        if (parser) {
            await parser.destroy();
        }

        client?.release();
    }
}
