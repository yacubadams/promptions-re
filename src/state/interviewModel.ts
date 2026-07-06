import { produce } from "immer";
import {
    ChangeLogEntry,
    CoverageArea,
    CpreVerdict,
    InterviewModel,
    SeslItem,
    Suggestion,
    Turn,
} from "../types";

let counter = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const emptyModel = (coverage: CoverageArea[] = []): InterviewModel => ({
    turns: [],
    suggestions: [],
    coverage,
    spec: [],
    changeLog: [],
});

const log = (m: InterviewModel, kind: string, detail: string): ChangeLogEntry => {
    const entry = { ts: Date.now(), kind, detail };
    m.changeLog.push(entry);
    return entry;
};

// Append a turn. Implements the FR-01 withdrawal mechanic: a still-pending suggestion
// raised at the previous boundary is WITHDRAWN if the same speaker simply resumes
// (i.e. the interviewer never got to ask it before the stakeholder kept talking).
export const appendTurn = (model: InterviewModel, turn: Turn): InterviewModel =>
    produce(model, (m) => {
        const prev = m.turns[m.turns.length - 1];
        m.turns.push(turn);
        log(m, "turn", `${turn.speaker}: ${turn.text.slice(0, 60)}`);

        if (prev && prev.speaker === turn.speaker) {
            for (const s of m.suggestions) {
                if (s.status === "pending" && s.boundaryTurnId === prev.id) {
                    s.status = "withdrawn";
                    log(m, "withdraw", `Withdrew "${s.question.slice(0, 50)}" — ${turn.speaker} resumed`);
                }
            }
        }
    });

export const addSuggestion = (model: InterviewModel, s: Suggestion): InterviewModel =>
    produce(model, (m) => {
        m.suggestions.push(s);
        log(m, "suggestion", s.question.slice(0, 60));
        if (s.coverageId) {
            const area = m.coverage.find((c) => c.id === s.coverageId);
            if (area && area.status === "open") area.status = "touched";
        }
    });

export const setSuggestionStatus = (
    model: InterviewModel,
    id: string,
    status: Suggestion["status"],
): InterviewModel =>
    produce(model, (m) => {
        const s = m.suggestions.find((x) => x.id === id);
        if (!s) return;
        s.status = status;
        if (status === "asked" && s.coverageId) {
            const area = m.coverage.find((c) => c.id === s.coverageId);
            if (area) area.status = "covered";
        }
    });

export const setSpec = (model: InterviewModel, spec: SeslItem[]): InterviewModel =>
    produce(model, (m) => {
        m.spec = spec;
        log(m, "spec", `Generated ${spec.length} SESL items`);
    });

export const applyCpre = (
    model: InterviewModel,
    verdicts: Record<string, CpreVerdict>,
): InterviewModel =>
    produce(model, (m) => {
        for (const item of m.spec) {
            if (verdicts[item.id]) item.cpre = verdicts[item.id];
        }
        log(m, "cpre", `Validated ${Object.keys(verdicts).length} requirements`);
    });
