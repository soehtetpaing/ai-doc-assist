import { RequestHandler } from "express";
import { UnauthorizedError } from "../utils/errors.js";
import jwt from "jsonwebtoken";
import { env } from "../configs/env.js";
import { AuthPayload } from "../types/index.js";

export const requireAuth: RequestHandler = (req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing bearer token');
    }

    const token = auth.slice(7);

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        req.user = { id: payload.sub, email: payload.email };
        next();
    } catch (error) {
        throw new UnauthorizedError('Invalid or expired token');
    }
};
