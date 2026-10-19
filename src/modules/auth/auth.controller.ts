import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema.js";
import * as authService from "./auth.service.js";

export async function register(req: Request, res: Response) {
    const { email, password } = registerSchema.parse(req.body);
    const result = await authService.register(email, password);
    res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
}

export async function me(req: Request, res: Response) {
    res.json({ user: req.user });
}
