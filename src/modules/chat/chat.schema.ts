import { z } from "zod";

export const chatSchema = z.object({
    documentId: z.uuid(),
    conversationId: z.uuid().optional(),
    question: z.string().min(1).max(2000)
});

export const renameChatSchema = z.object({
    title: z.string().min(1).max(120)
});
