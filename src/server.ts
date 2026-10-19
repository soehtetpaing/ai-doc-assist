import { init } from "./app.js";
import { env } from "./configs/env.js";
import { pool } from "./db/pool.js";
import { logger } from "./utils/logger.js";

async function start() {
    // sanity check db
    await pool.query('SELECT 1');
    logger.info('Database connected');

    const app = init();
    app.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });
}

start().catch((err) => {
    logger.error({ err }, 'Server startup error');
    process.exit(1);
});
