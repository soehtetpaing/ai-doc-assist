import { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const requestId = req.id;

    if (err instanceof AppError) {
        logger.warn({ err, requestId }, err.message);
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message, details: err.details },
            requestId
        });
    }

    logger.error({ err, requestId }, 'Unhandled error');
    res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
        requestId
    });
};
