import { env } from "../../configs/env.js";
import { query } from "../../db/pool.js";
import { ConflictError, UnauthorizedError } from "../../utils/errors.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function register(email: string, password: string) {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
        throw new ConflictError('Email already registered');
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query<{ id: string; email: string }>(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, hash]
    );

    const user = result.rows[0];
    return {
        user,
        token: signToken(user.id, user.email)
    };
}

export async function login(email: string, password: string) {
    const result = await query<{ id: string; email: string; password_hash: string }>(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
    );

    const user = result.rows[0];
    if (!user) {
        throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        throw new UnauthorizedError('Invalid password');
    }
    
    return {
        user: { id: user.id, email: user.email },
        token: signToken(user.id, user.email)
    };
}

function signToken(sub: string, email: string) {
    return jwt.sign(
        { sub, email },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );
}
