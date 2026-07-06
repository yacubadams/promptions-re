import { ClaudeService } from "./ClaudeService";
import { DraftedStory, ElicitationCandidate, Turn } from "../types";

interface RawStory {
    role: string;
    want: string;
    soThat: string;
    acceptanceCriteria: string[];
    trace: string;
}


/**
 * Stage 4 (FR-11). One scoped LLM call turns the approved goal model into
 * candidate requirements written as Corona-Warn-App user stories
 * ("As a <role>, I want <goal>, so that <reason>") with acceptance criteria.
 *
 * Grounding is enforced here, not trusted from the model (FR-4, FR-9): each
 * story's trace must be a verbatim substring of the transcript, or the story
 * is flagged ungrounded. The model proposes; a human accepts at the gate.
 */
export class DraftingService {
    constructor(private claude: ClaudeService) {}

    private normalize(s: string): string {
        return s
            .toLowerCase()
            .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
            .replace(/\s+/g, " ")
            .trim();
    }

    private locate(trace: string, turns: Turn[]): Turn | undefined {
        const needle = this.normalize(trace);
        if (!needle) return undefined;
        return turns.find((t) => this.normalize(t.text).includes(needle));
    }

    async draft(
        goals: ElicitationCandidate[],
        turns: Turn[],
        signal?: AbortSignal,
        scopePrefix = "US",
    ): Promise<DraftedStory[]> {
        if (goals.length === 0) return [];

        const goalList = goals
            .map((g, i) => `${i + 1}. [${g.kind}] ${g.statement}${g.trace ? `  (quote: "${g.trace}")` : ""}`)
            .join("\n");
        const transcript = turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");

        const system = `You draft requirements from an approved goal model, using the Corona-Warn-App
user-story format. Produce one story per distinct requirement.

Each story has:
- role: the actor, phrased for "As a <role>"
- want: the capability, phrased for "I want <goal>" (implementation-free)
- soThat: the benefit, phrased for "so that <reason>"
- acceptanceCriteria: 1\u20133 concrete, testable conditions
- trace: an EXACT verbatim substring copied from the transcript that grounds the story.
  If no verbatim quote supports it, set trace to "" \u2014 never invent or approximate a quote.

Rules:
- One requirement per story; keep it atomic and testable.
- Do not introduce facts, systems, or actors absent from the transcript and goals.
- Prefer stories a developer could implement and a tester could verify as written.

Return ONLY a JSON array (no prose, no markdown fence) of:
{"role": string, "want": string, "soThat": string, "acceptanceCriteria": string[], "trace": string}`;

        const user = `APPROVED GOALS:\n${goalList}\n\nTRANSCRIPT:\n${transcript}\n\nDraft the user stories now.`;

        const raw = await this.claude.json<RawStory[]>(
            [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            { signal },
        );

        if (!Array.isArray(raw)) return [];

        return raw
            .map((r): Omit<DraftedStory, "id"> => {
                const claimed = (r.trace ?? "").trim();
                const host = claimed ? this.locate(claimed, turns) : undefined;
                const grounded = Boolean(host);
                return {
                    role: (r.role ?? "").trim(),
                    want: (r.want ?? "").trim(),
                    soThat: (r.soThat ?? "").trim(),
                    acceptanceCriteria: Array.isArray(r.acceptanceCriteria)
                        ? r.acceptanceCriteria.map((a) => a.trim()).filter(Boolean)
                        : [],
                    trace: grounded ? claimed : "",
                    traceSpeaker: host?.speaker,
                    grounded,
                    status: "pending",
                    ts: Date.now(),
                };
            })
            .filter((s) => s.want.length > 0)
            .map((s, i): DraftedStory => ({ ...s, id: `${scopePrefix}-${String(i + 1).padStart(2, "0")}` }));
    }
}
