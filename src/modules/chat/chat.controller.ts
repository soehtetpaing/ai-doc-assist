import { Request, Response } from "express";
import { chatSchema, renameChatSchema } from "./chat.schema.js";
import * as chatService from "./chat.service.js";
import { BadRequestError } from "../../utils/errors.js";

export async function chat(req: Request, res: Response) {
    const body = chatSchema.parse(req.body);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const result = await chatService.streamChat({
            userId: req.user!.id,
            documentId: body.documentId,
            conversationId: body.conversationId,
            question: body.question,
            onToken: (token) => send('token', { token })
        });

        send('done', {
            conversationId: result.conversationId,
            sources: result.sources,
            provider: result.provider
        });

    } catch (error: any) {
        send('error', { message: error?.message ?? 'Unknown error' });
    } finally {
        res.end();
    }
}

export async function history(req: Request, res: Response) {
    res.json(await chatService.getHistory(getChatId(req), req.user!.id));
}

export async function list(req: Request, res: Response) {
    res.json(await chatService.getConversations(req.user!.id));
}

export async function rename(req: Request, res: Response) {
    const { title } = renameChatSchema.parse(req.body);
    res.json(await chatService.renameConversation(getChatId(req), req.user!.id, title));
}

export async function remove(req: Request, res: Response) {
    await chatService.deleteConversation(getChatId(req), req.user!.id);
    res.status(204).send();
}

function getChatId(req: Request): string {
    const id = req.params.id;
    if (typeof id !== 'string' || !id) {
        throw new BadRequestError('Invalid chat ID');
    }

    return id;
}
