import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as authController from "./auth.controller.js"
import { requireAuth } from "../../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.post('/register', asyncHandler(authController.register));
authRouter.post('/login', asyncHandler(authController.login));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
