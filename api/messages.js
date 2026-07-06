// Vercel serverless function: POST /api/messages -> Anthropic /v1/messages.
// The API key lives ONLY here (server-side env var), never in the browser bundle.
// Set ANTHROPIC_API_KEY in the Vercel project's Environment Variables.

export default async function handler(req, res) {
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
        return;
    }

    try {
        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            // req.body is already parsed by Vercel when content-type is JSON.
            body: JSON.stringify(req.body),
        });

        const text = await upstream.text();
        res.status(upstream.status);
        res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
        res.send(text);
    } catch (err) {
        res.status(502).json({ error: String(err) });
    }
}
