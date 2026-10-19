import { RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";

export const requestId: RequestHandler = (req, res, next) => {
    const id = (req.headers['X-Request-Id'] as string) || uuidv4();
    req.id = id;
    res.setHeader('X-Request-Id', id);
    next();
};
