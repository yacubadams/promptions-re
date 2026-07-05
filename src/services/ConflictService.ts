import { ClaudeService, ChatMessage, parseLenientJson } from "./ClaudeService";

export interface ConflictInput {
    id: string;
    role: string;
    want: string;
    soThat: string;
}

export interface ConflictPair {
    aId: string;
    bId: string;
    reason: string;
}

// Maps candidate conflicts between requirements. The LLM only DETECTS and
// explains; it never resolves. Every flagged pair is grounded to two real
// requirement ids (hallucinated ids are dropped in code). The human adjudicates.
export class ConflictService {
    constructor(private claude: ClaudeService) {}

    async check(reqs: ConflictInput[], signal?: AbortSignal): Promise<ConflictPair[]> {
        if (reqs.length < 2) return [];

        const system = `You are a requirements analyst checking a set of requirements for CONFLICTS.
A conflict is a genuine contradiction: two requirements that cannot both hold as
written (e.g. one restricts an action the other permits, or they impose
incompatible constraints). Do NOT flag mere overlap, similarity, or different
scope — only real contradictions.

For each conflict, reference the two requirement ids exactly as given, and explain
the contradiction in one concrete sentence. If there are no genuine conflicts,
return an empty array.

Return ONLY a JSON array, each item shaped exactly:
{ "aId": "<id>", "bId": "<id>", "reason": "<one sentence>" }`;

        const list = reqs
            .map((r) => `${r.id}: As a ${r.role}, I want ${r.want}, so that ${r.soThat}.`)
            .join("\n");

        const messages: ChatMessage[] = [
            { role: "system", content: system },
            { role: "user", content: `Requirements:\n${list}` },
        ];

        const raw = await this.claude.json<ConflictPair[]>(messages, { signal });
        const ids = new Set(reqs.map((r) => r.id));

        // Grounding: keep only pairs that reference two distinct, real ids.
        const seen = new Set<string>();
        const out: ConflictPair[] = [];
        for (const p of Array.isArray(raw) ? raw : []) {
            if (!p || typeof p.aId !== "string" || typeof p.bId !== "string") continue;
            if (p.aId === p.bId || !ids.has(p.aId) || !ids.has(p.bId)) continue;
            const key = [p.aId, p.bId].sort().join("|");
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ aId: p.aId, bId: p.bId, reason: String(p.reason ?? "").trim() });
        }
        return out;
    }
}

// exported for tests
export { parseLenientJson };
