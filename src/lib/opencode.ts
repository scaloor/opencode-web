import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
})

export const openCodeService = {
    async createSession() {
        const response = await client.session.create();
        return response.data || response;
    },

    async sendMessage(sessionId: string, content: string, providerID: string = "anthropic", modelID: string = "claude-3-5-sonnet-20241022") {
        const response = await (client.session.chat as (params: Record<string, unknown>) => Promise<unknown>)({
            id: sessionId,
            providerID,
            modelID,
            parts: [{ type: "text", text: content }]
        });
        return response as { data?: unknown; [key: string]: unknown };
    },

    async getMessages(sessionId: string) {
        const response = await (client.session.messages as (params: Record<string, unknown>) => Promise<unknown>)({
            id: sessionId
        });
        return response as { data?: unknown; [key: string]: unknown };
    },

    async getSessions() {
        return await client.session.list()
    },

    async getAppInfo() {
        return await client.app.get()
    }
}

export function handleOpencodeError(error: unknown): string {
    if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number; message?: string }
        return `API Error (${apiError.status}): ${apiError.message || 'Unknown error'}`
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return (error as { message: string }).message
    }
    return 'Unknown error occurred'
}
