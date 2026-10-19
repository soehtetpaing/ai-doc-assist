import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import * as documentController from "./documents.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const documentRouter = Router();

documentRouter.use(requireAuth);
documentRouter.post(
    '/', 
    documentController.upload.single('file'), 
    asyncHandler(documentController.create)
);
documentRouter.get('/', asyncHandler(documentController.list));
documentRouter.get('/:id', asyncHandler(documentController.get));
documentRouter.delete('/:id', asyncHandler(documentController.remove));
