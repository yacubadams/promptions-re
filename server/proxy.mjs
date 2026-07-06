// Minimal zero-dependency Anthropic proxy.
// Holds ANTHROPIC_API_KEY server-side so the browser bundle never contains it.
// Forwards POST /api/messages -> https://api.anthropic.com/v1/messages, streaming included.
//
// Local dev:  yarn workspace @promptions/promptions-re proxy   (listens on :8787)
// Vercel/Netlify: adapt this into a serverless function with the same body passthrough.

import { createServer } from "node:http";

const PORT = process.env.PROXY_PORT || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_VERSION = "2023-06-01";

if (!API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY. Set it in apps/promptions-re/.env");
    process.exit(1);
}

const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOW_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") return res.writeHead(204).end();

    if (req.method !== "POST" || !req.url?.endsWith("/messages")) {
        return res.writeHead(404).end("Not found");
    }

    let body = "";
    for await (const chunk of req) body += chunk;

    try {
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": API_KEY,
                "anthropic-version": ANTHROPIC_VERSION,
            },
            body,
        });

        res.writeHead(upstream.status, {
            "content-type": upstream.headers.get("content-type") || "application/json",
        });

        if (upstream.body) {
            const reader = upstream.body.getReader();
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                res.write(value);
            }
        }
        res.end();
    } catch (err) {
        res.writeHead(502).end(JSON.stringify({ error: String(err) }));
    }
});

server.listen(PORT, () => console.log(`Claude proxy listening on http://localhost:${PORT}/api/messages`));
