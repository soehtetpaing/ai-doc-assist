import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function init() {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations 
            (name TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`
    );
}

async function applied(): Promise<Set<string>> {
    const result = await pool.query('SELECT name FROM schema_migrations');
    return new Set(result.rows.map((r) => r.name));
}

async function migrate(name: string, sql: string) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
            `INSERT INTO schema_migrations (name) VALUES ($1)`,
            [name]
        );
        await client.query('COMMIT');
        console.log(`Migrated: ${name}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed: ${name}`)
        throw error;
    } finally {
        client.release();
    }
}

async function run() {
    console.log('Migration running...');

    await init();
    const migrated = await applied();

    const files = (await readdir(MIGRATIONS_DIR))
        .filter((f) => f.endsWith('.sql'))
        .sort();

    if (files.length === 0) {
        console.log(`No migration files found: ${MIGRATIONS_DIR}`);
        return;
    }

    let count = 0;
    for (const file of files) {
        if (migrated.has(file)) {
            console.log(`Skipped (already applied): ${file}`);
            continue;
        }

        const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
        await migrate(file, sql);
        count++;
    }

    if (count === 0) {
        console.log('Up to date');
    }
    else {
        console.log('Migration complete');
    }
}

run().then(() => pool.end())
    .catch((err) => {
        console.error('Migration failed', err);
        pool.end()
            .finally(() => process.exit(1));
    });
