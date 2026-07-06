import { ClaudeService } from "./ClaudeService";
import { ElicitationCandidate, ElicitationKind, Turn } from "../types";

// The raw shape we ask the model for. We deliberately keep it minimal —
// the model proposes; WE decide what is grounded.
interface RawCandidate {
    kind: string;
    statement: string;
    trace: string;
}

const KIND_MAP: Record<string, ElicitationKind> = {
    goal: "goal",
    gap: "gap",
    obstacle: "obstacle",
    openissue: "openIssue",
    "open issue": "openIssue",
    open_issue: "openIssue",
};

let seq = 0;

/**
 * Stage 2 of the workbench. ONE scoped LLM call turns a transcript into
 * candidate elicitation items (goals, gaps, obstacles, open issues).
 *
 * The anti-hallucination guarantee is enforced here, not in the prompt:
 * after the model responds, every claimed trace is checked against the
 * actual transcript. If the quote is not a verbatim substring, the
 * candidate is marked `grounded: false` and its trace is cleared, so the
 * UI can flag it as "review carefully" rather than presenting a fabricated
 * quote as fact. This is the single most important safety property of the
 * stage — approving a hallucinated requirement is the stakeholder's stated
 * worst case.
 */
export class ElicitationService {
    constructor(private claude: ClaudeService) {}

    private transcript(turns: Turn[]): string {
        return turns.map((t) => `[${t.id}] ${t.speaker}: ${t.text}`).join("\n");
    }

    // Normalise for comparison only — never for display.
    private normalize(s: string): string {
        return s
            .toLowerCase()
            .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // smart quotes -> '
            .replace(/\s+/g, " ")
            .trim();
    }

    // Find the turn whose text actually contains the quote.
    private locate(trace: string, turns: Turn[]): Turn | undefined {
        const needle = this.normalize(trace);
        if (!needle) return undefined;
        return turns.find((t) => this.normalize(t.text).includes(needle));
    }

    async analyze(turns: Turn[], signal?: AbortSignal): Promise<ElicitationCandidate[]> {
        if (turns.length === 0) return [];

        const system = `You analyse a requirements-elicitation interview transcript using GORE/KAOS
discipline and extract candidate items for a requirements engineer to review.

Extract items of four kinds:
- "goal": an intention the stakeholders want the system to achieve.
- "gap": something needed but not yet defined or answered in the interview.
- "obstacle": a condition that currently blocks a goal (KAOS obstacle).
- "openIssue": an unresolved question or conflict that must be settled later.

Hard rules:
- For every item, provide a "trace": an EXACT, verbatim substring copied from the
  transcript that motivates it. Copy it character-for-character. Do not paraphrase.
- If no verbatim quote supports an item but it is still worth surfacing, set trace to
  an empty string "" — never invent or approximate a quote.
- Do not introduce facts, systems, numbers, or stakeholders absent from the transcript.
- Keep each statement atomic and self-contained.
- Produce at most 8 items; prefer the highest-value few.

Return ONLY a JSON array (no prose, no markdown fence) of objects:
{"kind": "goal"|"gap"|"obstacle"|"openIssue", "statement": string, "trace": string}`;

        const user = `TRANSCRIPT:\n${this.transcript(turns)}\n\nExtract the candidate elicitation items now.`;

        const raw = await this.claude.json<RawCandidate[]>(
            [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            { signal },
        );

        if (!Array.isArray(raw)) return [];

        return raw
            .map((r): ElicitationCandidate => {
                const kind = KIND_MAP[this.normalize(r.kind ?? "")] ?? "openIssue";
                const claimedTrace = (r.trace ?? "").trim();
                const hostTurn = claimedTrace ? this.locate(claimedTrace, turns) : undefined;
                const grounded = Boolean(hostTurn);
                return {
                    id: `ec-${Date.now().toString(36)}-${(seq++).toString(36)}`,
                    kind,
                    statement: (r.statement ?? "").trim(),
                    trace: grounded ? claimedTrace : "",
                    traceSpeaker: hostTurn?.speaker,
                    traceTurnId: hostTurn?.id,
                    grounded,
                    status: "pending",
                    ts: Date.now(),
                };
            })
            .filter((c) => c.statement.length > 0);
    }
}
