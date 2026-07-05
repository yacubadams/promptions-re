// ClaudeService is the Claude (Anthropic) counterpart to the chat app's ChatService.
// It exposes the SAME surface — streamChat / sendMessage — so the rest of the app
// (and any promptions-llm OptionSet code) stays provider-agnostic.
//
// Two modes, chosen the same way the chat app switches OpenAI -> Azure:
//   - VITE_PROXY_URL set        -> POST to your backend proxy (key stays server-side). Recommended.
//   - VITE_ANTHROPIC_API_KEY    -> POST directly to api.anthropic.com from the browser. DEV ONLY:
//                                  this bundles the key into client JS and requires the
//                                  anthropic-dangerous-direct-browser-access header.

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_DIRECT_ENDPOINT = "https://api.anthropic.com/v1/messages";

export class ClaudeService {
    private model: string;
    private proxyUrl?: string;
    private apiKey?: string;

    constructor() {
        this.model = import.meta.env.VITE_ANTHROPIC_MODEL || "claude-sonnet-4-6";
        this.proxyUrl = import.meta.env.VITE_PROXY_URL;
        this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

        if (!this.proxyUrl && !this.apiKey) {
            throw new Error(
                "Set VITE_PROXY_URL (recommended) or VITE_ANTHROPIC_API_KEY (dev only) in your .env",
            );
        }
    }

    private endpoint(): string {
        return this.proxyUrl ?? ANTHROPIC_DIRECT_ENDPOINT;
    }

    private headers(): Record<string, string> {
        if (this.proxyUrl) {
            return { "content-type": "application/json" };
        }
        return {
            "content-type": "application/json",
            "x-api-key": this.apiKey as string,
            "anthropic-version": ANTHROPIC_VERSION,
            "anthropic-dangerous-direct-browser-access": "true",
        };
    }

    // Anthropic takes the system prompt as a top-level field, not a message.
    // The chat app builds OpenAI-style system messages, so we lift them out here —
    // that's the one shape difference between the two providers.
    private toAnthropic(messages: ChatMessage[]): {
        system?: string;
        messages: { role: "user" | "assistant"; content: string }[];
    } {
        const system = messages
            .filter((m) => m.role === "system")
            .map((m) => m.content)
            .join("\n\n");
        const rest = messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        return { system: system || undefined, messages: rest };
    }

    async streamChat(
        messages: ChatMessage[],
        onContent: (content: string, done: boolean) => void,
        options?: { signal?: AbortSignal },
    ): Promise<void> {
        const { system, messages: msgs } = this.toAnthropic(messages);

        const res = await fetch(this.endpoint(), {
            method: "POST",
            headers: this.headers(),
            signal: options?.signal,
            body: JSON.stringify({
                model: this.model,
                max_tokens: 8192,
                system,
                messages: msgs,
                stream: true,
            }),
        });

        if (!res.ok || !res.body) {
            throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const data = trimmed.slice(5).trim();
                if (!data || data === "[DONE]") continue;
                try {
                    const evt = JSON.parse(data);
                    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                        accumulated += evt.delta.text;
                        onContent(accumulated, false);
                    }
                } catch {
                    // ignore keep-alive / non-JSON lines
                }
            }
        }

        onContent(accumulated, true);
    }

    async sendMessage(messages: ChatMessage[], options?: { signal?: AbortSignal }): Promise<string> {
        const { system, messages: msgs } = this.toAnthropic(messages);

        const res = await fetch(this.endpoint(), {
            method: "POST",
            headers: this.headers(),
            signal: options?.signal,
            body: JSON.stringify({
                model: this.model,
                max_tokens: 8192,
                system,
                messages: msgs,
            }),
        });

        if (!res.ok) {
            throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        return (data.content ?? [])
            .filter((b: { type: string }) => b.type === "text")
            .map((b: { text: string }) => b.text)
            .join("\n");
    }

    // Convenience: run a prompt that must return JSON and parse it.
    async json<T>(messages: ChatMessage[], options?: { signal?: AbortSignal }): Promise<T> {
        const raw = await this.sendMessage(messages, options);
        return parseLenientJson<T>(raw);
    }
}

// Tolerant JSON extraction. LLM output is usually clean, but occasionally it
// wraps JSON in markdown fences, adds a stray sentence, leaves a trailing
// comma, or (if truncated) cuts off mid-structure. A strict JSON.parse throws
// on any of these. This recovers from the common cases and only fails loudly
// when the output truly isn't usable.
export function parseLenientJson<T>(raw: string): T {
    let text = raw.trim();

    // 1) strip a markdown code fence if present
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced) text = fenced[1].trim();

    // 2) drop any prose before the first bracket
    const start = text.search(/[[{]/);
    if (start > 0) text = text.slice(start);

    // 3) direct parse
    try {
        return JSON.parse(text) as T;
    } catch {
        /* fall through */
    }

    // 4) remove trailing commas before a closing bracket
    const noTrailing = text.replace(/,\s*([}\]])/g, "$1");
    try {
        return JSON.parse(noTrailing) as T;
    } catch {
        /* fall through */
    }

    // 5) best-effort repair of a truncated array/object: cut back to the last
    //    complete top-level element and close the container.
    const repaired = closeToLastComplete(noTrailing);
    try {
        return JSON.parse(repaired) as T;
    } catch {
        throw new Error(
            "The model's response could not be read as JSON (it may have been cut off). Please try again.",
        );
    }
}

function closeToLastComplete(text: string): string {
    const opener = text[0];
    if (opener !== "[" && opener !== "{") return text;
    // Walk with string/bracket awareness to find the last index where the
    // top-level container held a complete element.
    let depth = 0;
    let inString = false;
    let escape = false;
    let lastComplete = -1;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escape) escape = false;
            else if (ch === "\\") escape = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
            depth--;
            if (depth === 1) lastComplete = i; // just closed a top-level element
        }
    }
    if (lastComplete === -1) return text;
    const body = text.slice(0, lastComplete + 1).replace(/,\s*$/, "");
    return body + (opener === "[" ? "]" : "}");
}
