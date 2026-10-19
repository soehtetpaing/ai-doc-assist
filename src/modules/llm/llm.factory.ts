import { env } from "../../configs/env.js";
import OpenAI from "openai";
import { logger } from "../../utils/logger.js";

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMProvider {
    name: string;
    streamChat(messages: LLMMessage[], onToken: (t: string) => void): Promise<string>;
}

// Groq - OpenAI Compatible
function createGroqProvider(): LLMProvider | null {
    if (!env.GROQ_API_KEY) {
        return null;
    }

    const client = new OpenAI({
        apiKey: env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
    });

    return {
        name: 'groq',
        async streamChat(messages, onToken) {
            const stream = await client.chat.completions.create({
                model: env.GROQ_MODEL ?? '',
                messages,
                stream: true,
                temperature: 0.2
            });

            let full = '';
            for await (const chunk of stream) {
                const token = chunk.choices[0]?.delta?.content ?? '';
                if (token) {
                    full += token;
                    onToken(token);
                }
            }

            return full;
        }
    };
}

// OpenRouter - OpenAI Compatible
function createOpenRouterProvider(): LLMProvider | null {
    if (!env.OPENROUTER_API_KEY) {
        return null;
    }

    const client = new OpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'AI Doc Assist'
        }
    });

    return {
        name: 'openrouter',
        async streamChat(messages, onToken) {
            const stream = await client.chat.completions.create({
                model: env.OPENROUTER_MODEL ?? '',
                messages,
                stream: true,
                temperature: 0.2
            });

            let full = '';
            for await (const chunk of stream) {
                const token = chunk.choices[0]?.delta?.content ?? '';
                if (token) {
                    full += token;
                    onToken(token);
                }
            }

            return full;
        }
    };
}

export function getLLMChain(): LLMProvider[] {
    const providers = [createGroqProvider(), createOpenRouterProvider()].filter(
        (p): p is LLMProvider => p !== null
    );

    if (providers.length === 0) {
        throw new Error('No LLM provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY');
    }

    logger.info(`LLM providers available: ${providers.map((p) => p.name).join(', ')}`);
    return providers;
}

export async function streamWithFallback(
    messages: LLMMessage[], onToken: (t: string) => void
): Promise<{ full: string; provider: string }> {
    const providers = getLLMChain();
    let lastError: unknown;
    for (const provider of providers) {
        try {
            const full = await provider.streamChat(messages, onToken);
            return { full, provider: provider.name };
        } catch (error) {
            logger.warn({ error, provider: provider.name }, 'LLM provider failed, trying next');
            lastError = error;
        }
    }

    throw lastError ?? new Error('All LLM providers failed');
}
