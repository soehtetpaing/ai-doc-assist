import multer from "multer";
import { BadRequestError } from "../../utils/errors.js";
import { Request, Response } from "express";
import * as documentService from "./documents.service.js";

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20mb
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new BadRequestError('Only PDF files are allowed'));
        }

        cb(null, true);
    }
});

export async function create(req: Request, res: Response) {
    if (!req.file) {
        throw new BadRequestError('No file uploaded');
    }

    const doc = await documentService.createDocument(
        req.user!.id,
        req.file.originalname,
        req.file.size,
        req.file.buffer
    );
    res.status(202).json(doc);
}

export async function list(req: Request, res: Response) {
    res.json(await documentService.getDocuments(req.user!.id));
}

export async function get(req: Request, res: Response) {
    res.json(await documentService.getDocument(req.user!.id, getDocumentId(req)));
}

export async function remove(req: Request, res: Response) {
    await documentService.deleteDocument(req.user!.id, getDocumentId(req));
    res.status(204).send();
}

function getDocumentId(req: Request): string {
    const id = req.params.id;
    if (typeof id !== 'string' || !id) {
        throw new BadRequestError('Invalid document ID')
    }

    return id;
}
