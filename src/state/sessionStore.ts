import { DraftingStage, ElicitationStage, ElicitationCandidate, DraftedStory, Turn } from "../types";

// The complete, serialisable session — everything needed to restore, audit,
// or export the work. Kept small (kilobytes); no database required.
export interface Session {
    version: 1;
    savedAt: number;
    stage: string;
    turns: Turn[];
    elicitation: ElicitationStage;
    drafting: DraftingStage;
    goals: ElicitationCandidate[];
    approved: DraftedStory[];
    scopePrefix?: string; // per-batch requirement ID prefix (e.g. BOOK, ACCESS)
}

const KEY = "re_session_v2"; // bumped: quality format changed (per-aspect grades)

export function saveSession(s: Session): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
        /* storage full or unavailable — non-fatal */
    }
}

export function loadSession(): Session | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const s = JSON.parse(raw) as Session;
        return s.version === 1 ? s : null;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
}

// A combined, time-ordered change log across both review stages (FR-14).
export interface LogRow {
    ts: number;
    id: string;
    status: string;
    approver: string;
    stage: "elicitation" | "drafting";
    note?: string;
}

export function changeLog(s: Session): LogRow[] {
    const rows: LogRow[] = [
        ...s.elicitation.reviews.map((r) => ({ ts: r.ts, id: r.candidateId, status: r.status, approver: r.approver, stage: "elicitation" as const })),
        ...s.drafting.reviews.map((r) => ({ ts: r.ts, id: r.candidateId, status: r.status, approver: r.approver, stage: "drafting" as const, note: r.note })),
    ];
    return rows.sort((a, b) => a.ts - b.ts);
}

function ts(n: number): string {
    return new Date(n).toISOString().replace("T", " ").slice(0, 19);
}

// Trigger a browser download of any text payload.
function download(filename: string, text: string, type: string): void {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// The complete machine-readable session — everything, including rejected items
// (marked by status) and the full change log. This is the audit artifact.
export function downloadSessionJson(s: Session): void {
    const stamp = ts(Date.now()).replace(/[: ]/g, "-");
    download(`re-session-${stamp}.json`, JSON.stringify({ ...s, changeLog: changeLog(s) }, null, 2), "application/json");
}

// A human-readable requirements export for pasting into the system of record.
// Includes the full drafted detail (acceptance criteria, trace, quality grades)
// and, separately, the rejected items with their status — the full picture.
export function downloadReadable(s: Session): void {
    const L: string[] = [];
    const stories = s.drafting.stories;
    const kept = stories.filter((x) => x.status === "accepted" || x.status === "edited");
    const rejected = stories.filter((x) => x.status === "rejected");
    const pending = stories.filter((x) => x.status === "pending");

    L.push("# Requirements Export");
    L.push("");
    L.push(`**Generated:** ${ts(Date.now())}  ·  **${kept.length} approved** · ${rejected.length} rejected · ${pending.length} pending`);
    L.push("");
    L.push("---");
    L.push("");

    const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

    const render = (st: DraftedStory) => {
        L.push(`### ${st.id} · ${st.status}`);
        L.push("");
        L.push(`**As a** ${st.role}, **I want** ${st.want}, **so that** ${st.soThat}.`);
        L.push("");
        if (st.acceptanceCriteria.length) {
            L.push("**Acceptance criteria**");
            L.push("");
            st.acceptanceCriteria.forEach((ac) => L.push(`- ${ac}`));
            L.push("");
        }
        if (st.quality) {
            const q = st.quality;
            L.push("**Quality in use**");
            L.push("");
            (["implement", "verify", "maintain"] as const).forEach((asp) => {
                const g = q[asp];
                L.push(`- **${cap(asp)}** \`${g.grade}\` · *${g.criterion}*: ${g.reason}`);
            });
            if (st.qualityStale) L.push("- *(edited after grading, grades may be stale)*");
            L.push("");
        }
        if (st.grounded) {
            L.push(`> "${st.trace}"`);
            L.push(`> *(${st.traceSpeaker ?? "transcript"})*`);
        } else {
            L.push("> *(ungrounded, flagged for review)*");
        }
        L.push("");
        L.push("---");
        L.push("");
    };

    L.push(`## Approved requirements (${kept.length})`);
    L.push("");
    kept.forEach(render);
    if (pending.length) {
        L.push(`## Not yet reviewed (${pending.length})`);
        L.push("");
        pending.forEach(render);
    }
    if (rejected.length) {
        L.push(`## Rejected, kept for the record (${rejected.length})`);
        L.push("");
        rejected.forEach(render);
    }

    const log = changeLog(s);
    if (log.length) {
        L.push("## Change log");
        L.push("");
        log.forEach((r) => L.push(`- \`${ts(r.ts)}\`  ${r.stage}/${r.id} · **${r.status}** by ${r.approver}${r.note ? ` *(${r.note})*` : ""}`));
        L.push("");
    }

    const stamp = ts(Date.now()).replace(/[: ]/g, "-");
    download(`re-requirements-${stamp}.md`, L.join("\n"), "text/markdown");
}
