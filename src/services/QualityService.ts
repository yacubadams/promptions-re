import { ClaudeService } from "./ClaudeService";
import { DraftedStory, QualityInUse } from "../types";

/**
 * Stage 5 (FR-12). One scoped LLM call grades each drafted story against the
 * three downstream activities that consume it \u2014 implement, verify, maintain \u2014
 * following ABRE-QM. Quality is fitness for those activities, not an abstract
 * property. A story that could be built but not tested, or not maintained,
 * is flagged rather than passed; the RE decides at the gate.
 */
export class QualityService {
    constructor(private claude: ClaudeService) {}

    async grade(stories: DraftedStory[], signal?: AbortSignal): Promise<Record<string, QualityInUse>> {
        if (stories.length === 0) return {};

        const list = stories
            .map(
                (s) =>
                    `${s.id}: As a ${s.role}, I want ${s.want}, so that ${s.soThat}.` +
                    (s.acceptanceCriteria.length
                        ? `\n   AC: ${s.acceptanceCriteria.join(" | ")}`
                        : "\n   AC: (none)"),
            )
            .join("\n");

        const system = `You are a requirements reviewer applying activity-based quality (ABRE-QM),
using classic CPRE / ISO 29148 criteria as your vocabulary. Grade each story on
the three activities its readers perform. Judge each INDEPENDENTLY; give each its
own grade, the single quality criterion it turns on, and one concrete reason.

Activities:
- implement: could a developer build exactly this from the story as written?
- verify: could a tester objectively confirm it from the acceptance criteria?
- maintain: could a future RE understand and safely change it later?

grade: "pass" | "warn" | "fail".
criterion: the CPRE-style quality criterion this grade turns on — choose the best
  fit in your own words, e.g. "unambiguous", "verifiable", "complete", "consistent",
  "feasible", "atomic". For a passing grade use "adequate" or the criterion it meets.
reason: one concrete sentence, referring to the actual story text, justifying THAT
  grade. Never leave it empty — even a pass states briefly why it is adequate.

Return ONLY a JSON object keyed by story id, each value shaped exactly:
{ "implement": {"grade":"...","criterion":"...","reason":"..."},
  "verify":    {"grade":"...","criterion":"...","reason":"..."},
  "maintain":  {"grade":"...","criterion":"...","reason":"..."} }

Example:
{ "US-01": {
    "implement": {"grade":"warn","criterion":"unambiguous","reason":"'Real time' has no defined latency, so a developer must guess the target."},
    "verify":    {"grade":"fail","criterion":"verifiable","reason":"No measurable threshold is given, so a tester cannot objectively confirm it."},
    "maintain":  {"grade":"pass","criterion":"adequate","reason":"Roles and intent are clear enough for a future RE to revise safely."}
} }`;

        return this.claude.json<Record<string, QualityInUse>>(
            [
                { role: "system", content: system },
                { role: "user", content: `STORIES:\n${list}\n\nGrade every id.` },
            ],
            { signal },
        );
    }
}
