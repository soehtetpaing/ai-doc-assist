import { z } from "zod";

export const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(128)
});

export const loginSchema = registerSchema;
