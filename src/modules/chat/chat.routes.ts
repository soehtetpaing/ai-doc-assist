import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { chatLimiter } from "../../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as chatController from "./chat.controller.js";

export const chatRouter = Router();

chatRouter.use(requireAuth);
// static paths before dynamic paths
chatRouter.get('/conversations', asyncHandler(chatController.list));
chatRouter.post('/', chatLimiter, asyncHandler(chatController.chat));
chatRouter.get('/:id/history', asyncHandler(chatController.history));
chatRouter.patch('/:id', asyncHandler(chatController.rename));
chatRouter.delete('/:id', asyncHandler(chatController.remove));
