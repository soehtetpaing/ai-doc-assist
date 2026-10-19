import express from "express";
import helmet from "helmet";
import cors from "cors";
import { requestId } from "./middlewares/request-id.middleware.js";
import { apiLimiter } from "./middlewares/rate-limit.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { documentRouter } from "./modules/documents/documents.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import path from "node:path";
import { env } from "./configs/env.js";

const PUBLIC_DIR = path.join(process.cwd(), 'public');

export function init() {
    const app = express();

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"]
            }
        }
    }));
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '1mb' }));
    app.use(requestId);
    app.use(apiLimiter);

    app.use(express.static(PUBLIC_DIR, { maxAge: '1h', index: 'index.html' }));

    app.get('/health', (_req, res) => res.json({
        status: 'ok',
        service: env.PJ_NAME ?? 'ai-doc-assist',
        version: env.VERSION ?? '1.0.0'
    }));

    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/documents', documentRouter);
    app.use('/api/v1/chat', chatRouter);

    app.use(errorHandler);

    return app;
}
