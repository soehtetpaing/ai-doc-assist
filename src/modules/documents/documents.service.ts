import { query } from "../../db/pool.js";
import { DocumentRow } from "../../types/index.js";
import { NotFoundError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import { processPdf } from "./pdf.processor.js";

export async function createDocument(
    userId: string,
    filename: string,
    filesize: number,
    buffer: Buffer
) {
    const result = await query<DocumentRow>(
        `INSERT INTO documents 
            (user_id, filename, file_size, page_count, status) 
         VALUES ($1, $2, $3, 0, 'processing') 
         RETURNING *`,
        [userId, filename, filesize]
    );
    const doc = result.rows[0];

    // fire and forget in background - prod use a queue like BullMQ
    processPdf(doc.id, buffer).catch((err) => {
        logger.error({ err, documentId: doc.id }, 'PDF processing failed');
    });

    return doc;
}

export async function getDocuments(userId: string) {
    const result = await query<DocumentRow>(
        `SELECT id, filename, file_size, page_count, status, created_at 
         FROM documents WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
    );

    return result.rows;
}

export async function getDocument(userId: string, id: string) {
    const result = await query<DocumentRow>(
        `SELECT * 
         FROM documents 
         WHERE id = $1 and user_id = $2`,
        [id, userId]
    );

    if (!result.rows[0]) {
        throw new NotFoundError('Document not found');
    }

    return result.rows[0];
}

export async function deleteDocument(userId: string, id: string) {
    const result = await query(
        `DELETE FROM documents 
         WHERE id = $1 and user_id = $2 
         RETURNING id`,
        [id, userId]
    );

    if (result.rowCount === 0) {
        throw new NotFoundError('Document not found');
    }
}
