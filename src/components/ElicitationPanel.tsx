import { useEffect, useRef, useState } from "react";
import { ElicitationService } from "../services/ElicitationService";
import {
    gateOpen,
    promotedToGoalModel,
    remainingToReview,
    reviewCandidate,
    undoReview,
    addHumanCandidate,
    setCandidates,
} from "../state/elicitationModel";
import { ElicitationCandidate, ElicitationStage, ReviewStatus, Turn } from "../types";
import { StageHeader, LoadingBanner, ui } from "./ui";
import { locateQuote } from "../state/grounding";

interface Props {
    turns: Turn[];
    service: ElicitationService;
    approver?: string;
    stage: ElicitationStage;
    onStageChange: (updater: (s: ElicitationStage) => ElicitationStage) => void;
    onBusy?: (busy: boolean) => void;
    onAdvance?: (promoted: ElicitationCandidate[]) => void;
}

const KIND_LABEL: Record<ElicitationCandidate["kind"], string> = {
    goal: "Goal",
    gap: "Gap",
    obstacle: "Obstacle",
    openIssue: "Open issue",
};

const KIND_TINT: Record<ElicitationCandidate["kind"], { bg: string; fg: string }> = {
    goal: { bg: "var(--bg-accent)", fg: "var(--text-accent)" },
    gap: { bg: "var(--bg-warning)", fg: "var(--text-warning)" },
    obstacle: { bg: "var(--bg-pro, var(--bg-accent))", fg: "var(--text-pro, var(--text-accent))" },
    openIssue: { bg: "var(--surface-1)", fg: "var(--text-secondary)" },
};


export function ElicitationPanel({ turns, service, approver = "RE", stage, onStageChange, onBusy, onAdvance }: Props) {
    const setStage = onStageChange;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const runAnalysis = async () => {
        setLoading(true);
        onBusy?.(true);
        setError(null);
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const candidates = await service.analyze(turns, ctrl.signal);
            setStage((s) => setCandidates(s, candidates));
        } catch (e) {
            if ((e as Error).name !== "AbortError") setError((e as Error).message);
        } finally {
            // If this call was aborted (e.g. React's dev double-mount), a newer
            // call is still running — don't clear the indicator out from under it.
            if (!ctrl.signal.aborted) {
                setLoading(false);
                onBusy?.(false);
            }
        }
    };

    // Analyse once if we arrive with a transcript but no candidates yet.
    useEffect(() => {
        if (turns.length > 0 && stage.candidates.length === 0) void runAnalysis();
        return () => abortRef.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [newKind, setNewKind] = useState<ElicitationCandidate["kind"]>("goal");
    const [newStatement, setNewStatement] = useState("");
    const [newTrace, setNewTrace] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const seqRef = useRef(0);

    const submitHuman = () => {
        if (!newStatement.trim()) return;
        const quote = newTrace.trim();
        let grounded = false;
        let traceSpeaker: string | undefined;
        let traceTurnId: string | undefined;
        let trace = "";
        if (quote) {
            const host = locateQuote(quote, turns);
            if (!host) {
                setAddError("That quote isn't a verbatim match in the transcript. Paste the exact wording, or leave it blank to add without a transcript basis.");
                return;
            }
            grounded = true;
            trace = quote;
            traceSpeaker = host.speaker;
            traceTurnId = host.id;
        }
        setStage((s) => addHumanCandidate(s, { kind: newKind, statement: newStatement, trace, traceSpeaker, traceTurnId, grounded }, seqRef.current++));
        setNewStatement("");
        setNewTrace("");
        setAddError(null);
        setAdding(false);
    };
    const [editText, setEditText] = useState("");

    const review = (id: string, status: ReviewStatus) => {
        setStage((s) => reviewCandidate(s, id, status, approver));
    };

    const startEdit = (id: string, current: string) => {
        setEditingId(id);
        setEditText(current);
    };
    const saveEdit = (id: string) => {
        const text = editText.trim();
        if (text) setStage((s) => reviewCandidate(s, id, "edited", approver, text));
        setEditingId(null);
    };

    const remaining = remainingToReview(stage);
    const open = gateOpen(stage);
    const accepted = stage.candidates.filter((c) => c.status === "accepted" || c.status === "edited").length;
    const rejected = stage.candidates.filter((c) => c.status === "rejected").length;

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StageHeader
                step="Stage 2"
                title="Elicitation analysis"
                subtitle="Claude proposes candidate goals, gaps, obstacles and open issues. You review each before it advances."
                actions={
                    <button onClick={runAnalysis} disabled={loading} style={ui.btnPrimary}>
                        {loading ? "Analysing…" : stage.candidates.length ? "Re-run" : "Analyse transcript"}
                    </button>
                }
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={ui.chip}>
                    <b>{stage.llmCallCount}</b> LLM call · <b>{stage.candidates.length}</b> candidates
                </span>
                <span style={ui.chip}>
                    <b>{accepted}</b> accepted · <b>{rejected}</b> rejected
                </span>
            </div>

            {error && <div style={errorBox}>{error}</div>}

            {loading && <LoadingBanner label="Analysing the transcript and grounding each item…" />}

            <div>
                {!adding ? (
                    <button style={ui.btnSecondary} onClick={() => setAdding(true)}>
                        + Add your own
                    </button>
                ) : (
                    <div style={addForm}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                            Add your own finding
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <select style={addInput} value={newKind} onChange={(e) => setNewKind(e.target.value as ElicitationCandidate["kind"])}>
                                <option value="goal">goal</option>
                                <option value="gap">gap</option>
                                <option value="obstacle">obstacle</option>
                                <option value="openIssue">open issue</option>
                            </select>
                        </div>
                        <textarea
                            style={{ ...addInput, width: "100%", boxSizing: "border-box" }}
                            rows={2}
                            value={newStatement}
                            onChange={(e) => setNewStatement(e.target.value)}
                            placeholder="Your goal, gap, obstacle or open issue…"
                        />
                        <textarea
                            style={{ ...addInput, width: "100%", boxSizing: "border-box", marginTop: 8 }}
                            rows={2}
                            value={newTrace}
                            onChange={(e) => setNewTrace(e.target.value)}
                            placeholder="Optional: paste an exact transcript quote to ground this. Leave blank if it's your own contribution."
                        />
                        {addError && <div style={{ fontSize: 12.5, color: "var(--text-danger)", marginTop: 6, lineHeight: 1.45 }}>{addError}</div>}
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button style={ui.btnPrimary} disabled={!newStatement.trim()} onClick={submitHuman}>
                                Add finding
                            </button>
                            <button style={ui.btnSubtle} onClick={() => { setAdding(false); setAddError(null); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {stage.candidates.map((c) => {
                const tint = KIND_TINT[c.kind];
                const reviewed = c.status !== "pending";
                return (
                    <div key={c.id} style={{ ...ui.card, opacity: c.status === "rejected" ? 0.55 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={ui.kindPill(tint.bg, tint.fg)}>{KIND_LABEL[c.kind]}</span>
                            {c.humanAdded && <span style={humanTag}>human-added</span>}
                            {c.humanAdded && !c.grounded && <span style={ungroundedTag}>no transcript basis</span>}
                            <span style={{ ...ui.statusPill(...statusColors(c.status)) }}>
                                {reviewed ? c.status : "pending review"}
                            </span>
                        </div>

                        {editingId === c.id ? (
                            <textarea
                                autoFocus
                                style={editArea}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                            />
                        ) : (
                            <div style={ui.statement}>{c.statement}</div>
                        )}

                        {c.grounded ? (
                            <blockquote style={traceBox}>
                                “{c.trace}”
                                <span style={traceWho}>
                                    {c.traceSpeaker ?? "transcript"}
                                </span>
                            </blockquote>
                        ) : (
                            <div style={ungroundedBox}>
                                No verbatim trace found. Flagged as possible inference, not grounded. Review carefully.
                            </div>
                        )}

                        {reviewed ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
                                <span style={reviewedNote}>
                                    {c.status === "rejected"
                                        ? "Rejected, excluded from goal model"
                                        : c.status === "edited"
                                          ? "Edited and accepted, carried to goal model"
                                          : "Accepted, carried to goal model"}
                                </span>
                                <button style={ui.btnSubtle} onClick={() => setStage((s) => undoReview(s, c.id, approver))}>
                                    Undo
                                </button>
                            </div>
                        ) : editingId === c.id ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                                <button style={ui.btnSecondary} onClick={() => saveEdit(c.id)}>
                                    Save &amp; accept
                                </button>
                                <button style={ui.btnSecondary} onClick={() => setEditingId(null)}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                                <button style={ui.btnSecondary} onClick={() => review(c.id, "accepted")}>
                                    Accept
                                </button>
                                <button style={ui.btnSecondary} onClick={() => startEdit(c.id, c.statement)}>
                                    Edit
                                </button>
                                <button style={ui.btnSecondary} onClick={() => review(c.id, "rejected")}>
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {stage.candidates.length > 0 && (
                <div style={{ ...gate, ...(open ? gateOpenStyle : {}) }}>
                    <span style={{ flex: 1, fontSize: 13, color: open ? "var(--text-success)" : "var(--text-secondary)" }}>
                        {open
                            ? "Gate to stage 3 · all items reviewed"
                            : `Gate to stage 3 · ${remaining} of ${stage.candidates.length} items still need review`}
                    </span>
                    <button
                        style={{ ...advance, ...(open ? advanceReady : {}) }}
                        disabled={!open}
                        onClick={() => open && onAdvance?.(promotedToGoalModel(stage))}
                    >
                        Approve and advance
                    </button>
                </div>
            )}
        </section>
    );
}






const traceBox: React.CSSProperties = {
    borderLeft: "2px solid var(--border-accent)",
    background: "var(--surface-1)",
    padding: "7px 11px",
    borderRadius: "0 6px 6px 0",
    fontSize: 12.5,
    color: "var(--text-secondary)",
    fontStyle: "italic",
    margin: 0,
};

const traceWho: React.CSSProperties = {
    display: "block",
    fontStyle: "normal",
    fontSize: 11,
    color: "var(--text-muted)",
    marginTop: 3,
};

const ungroundedBox: React.CSSProperties = {
    borderLeft: "2px solid var(--border-danger)",
    background: "var(--bg-danger)",
    padding: "7px 11px",
    borderRadius: "0 6px 6px 0",
    fontSize: 12.5,
    color: "var(--text-danger)",
};

const reviewedNote: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 11,
};

const gate: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    padding: "13px 15px",
    borderRadius: 12,
    border: "0.5px dashed var(--border-strong)",
    background: "var(--surface-2)",
};

const gateOpenStyle: React.CSSProperties = {
    borderStyle: "solid",
    borderColor: "var(--border-success)",
    background: "var(--bg-success)",
};

const advance: React.CSSProperties = {
    fontSize: 13,
    padding: "8px 16px",
    borderRadius: "var(--radius, 8px)",
    border: "none",
    background: "var(--fill-disabled)",
    color: "var(--text-disabled)",
    cursor: "not-allowed",
};

const advanceReady: React.CSSProperties = {
    background: "var(--fill-accent)",
    color: "var(--on-accent)",
    cursor: "pointer",
};

const errorBox: React.CSSProperties = {
    background: "var(--bg-danger)",
    color: "var(--text-danger)",
    border: "0.5px solid var(--border-danger)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
};

const editArea: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 14,
    fontFamily: "inherit",
    padding: "8px 10px",
    marginBottom: 8,
    borderRadius: "var(--radius, 8px)",
    border: "0.5px solid var(--border-accent)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    resize: "vertical",
};

const statusColors = (status: ReviewStatus): [string, string] => {
    switch (status) {
        case "accepted":
            return ["var(--bg-success)", "var(--text-success)"];
        case "edited":
            return ["var(--bg-accent)", "var(--text-accent)"];
        case "rejected":
            return ["var(--bg-danger)", "var(--text-danger)"];
        default:
            return ["var(--surface-1)", "var(--text-muted)"];
    }
};


const addForm: React.CSSProperties = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "14px 15px" };
const addInput: React.CSSProperties = { fontSize: 13, padding: "7px 9px", borderRadius: 8, border: "0.5px solid var(--border-strong)", background: "var(--surface-1)", color: "var(--text-primary)", fontFamily: "inherit", resize: "vertical" };
const humanTag: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-accent)", background: "var(--bg-accent)", padding: "2px 9px", borderRadius: 999 };
const ungroundedTag: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-warning)", background: "var(--bg-warning)", padding: "2px 9px", borderRadius: 999 };
