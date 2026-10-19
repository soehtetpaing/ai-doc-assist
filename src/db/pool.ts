import pg from "pg";
import { env } from "../configs/env.js";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
    ssl: env.SSL_REJECT_UNAUTHORIZED_USE 
        ? { rejectUnauthorized: false } 
        : false
});

pool.on('error', (err) => {
    console.error('Connection pool error', err);
    process.exit(1);
});

export const query = <T extends pg.QueryResultRow = any>(
    text: string, 
    params?: any[]
) => pool.query<T>(text, params);
