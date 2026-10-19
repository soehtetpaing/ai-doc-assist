import type { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            id: string;
            user?: { id: string; email: string };
        }
    }
}

export interface AuthPayload {
    sub: string;
    email: string;
}

export interface DocumentRow {
    id: string;
    user_id: string;
    filename: string;
    file_size: number;
    page_count: number;
    status: string;
    created_at: Date;
}
