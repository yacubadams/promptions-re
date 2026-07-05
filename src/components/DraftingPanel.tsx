import { useEffect, useRef, useState } from "react";
import { DraftingService } from "../services/DraftingService";
import { QualityService } from "../services/QualityService";
import {
    applyQuality,
    approvedStories,
    draftingGateOpen,
    qualityComplete,
    exportGateOpen,
    remainingStories,
    reviewStory,
    editStory,
    undoReviewStory,
    storyFails,
    setStories,
} from "../state/draftingModel";
import { DraftedStory, DraftingStage, ElicitationCandidate, Grade, ReviewStatus, Turn } from "../types";
import { StageHeader, LoadingBanner, ui } from "./ui";
import { MethodologyModal } from "./MethodologyModal";

interface Props {
    goals: ElicitationCandidate[];
    turns: Turn[];
    draftingService: DraftingService;
    qualityService: QualityService;
    approver?: string;
    scopePrefix?: string;
    stage: DraftingStage;
    onStageChange: (updater: (s: DraftingStage) => DraftingStage) => void;
    onBusy?: (busy: boolean) => void;
    onAdvance?: (approved: DraftedStory[]) => void;
}

const GRADE_STYLE: Record<Grade, React.CSSProperties> = {
    pass: { background: "var(--bg-success)", color: "var(--text-success)" },
    warn: { background: "var(--bg-warning)", color: "var(--text-warning)" },
    fail: { background: "var(--bg-danger)", color: "var(--text-danger)" },
};

export function DraftingPanel({ goals, turns, draftingService, qualityService, approver = "RE", scopePrefix = "US", stage, onStageChange, onBusy, onAdvance }: Props) {
    const setStage = onStageChange;
    const [drafting, setDrafting] = useState(false);
    const [grading, setGrading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const runDraft = async () => {
        setDrafting(true);
        onBusy?.(true);
        setError(null);
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        try {
            const stories = await draftingService.draft(goals, turns, ctrl.signal, scopePrefix);
            setStage((s) => setStories(s, stories));
        } catch (e) {
            if ((e as Error).name !== "AbortError") setError((e as Error).message);
        } finally {
            if (!ctrl.signal.aborted) {
                setDrafting(false);
                onBusy?.(false);
            }
        }
    };

    const runGrade = async () => {
        setGrading(true);
        onBusy?.(true);
        setError(null);
        try {
            const grades = await qualityService.grade(stage.stories);
            setStage((s) => applyQuality(s, grades));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setGrading(false);
            onBusy?.(false);
        }
    };

    useEffect(() => {
        if (goals.length > 0 && stage.stories.length === 0) void runDraft();
        return () => abortRef.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const review = (id: string, status: ReviewStatus) => setStage((s) => reviewStory(s, id, status, approver));

    // Accepting a story that still fails prompts a conscious override, logged.
    const acceptStory = (s: DraftedStory) => {
        const fails = storyFails(s);
        if (fails.length > 0) {
            if (!window.confirm(`This story still fails on: ${fails.join(", ")}.\nAccept it anyway? (the override will be recorded)`)) return;
            setStage((st) => reviewStory(st, s.id, "accepted", approver, `accepted despite unresolved fail: ${fails.join(", ")}`));
        } else {
            setStage((st) => reviewStory(st, s.id, "accepted", approver));
        }
    };

    // Re-grade a single story after an edit — cheap, scoped LLM call.
    const recheck = async (s: DraftedStory) => {
        setGrading(true);
        onBusy?.(true);
        setError(null);
        try {
            const grades = await qualityService.grade([s]);
            setStage((st) => applyQuality(st, grades));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setGrading(false);
            onBusy?.(false);
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showMethodology, setShowMethodology] = useState(false);
    const [draft, setDraft] = useState({ role: "", want: "", soThat: "" });
    const startEdit = (s: DraftedStory) => {
        setEditingId(s.id);
        setDraft({ role: s.role, want: s.want, soThat: s.soThat });
    };
    const saveEdit = (id: string) => {
        setStage((s) => editStory(s, id, draft, approver));
        setEditingId(null);
    };

    const remaining = remainingStories(stage);
    const allReviewed = draftingGateOpen(stage);
    const graded = qualityComplete(stage);
    const canAdvance = exportGateOpen(stage);

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <StageHeader
                step="Stage 4"
                title="Requirements drafting"
                subtitle="Claude drafts user stories from the approved goals, then grades each on implement / verify / maintain. You review before export."
                actions={
                    <>
                        <button
                            onClick={() => {
                                if (stage.stories.length > 0 && !window.confirm("Re-draft will replace the current stories with a new set. Continue?")) return;
                                void runDraft();
                            }}
                            disabled={drafting}
                            style={ui.btnPrimary}
                        >
                            {drafting ? "Drafting…" : stage.stories.length ? "Re-draft" : "Draft stories"}
                        </button>
                        <button onClick={runGrade} disabled={grading || stage.stories.length === 0} style={ui.btnPrimary}>
                            {grading ? "Grading…" : "Run quality pass"}
                        </button>
                        <button onClick={() => setShowMethodology(true)} style={ui.btnSubtle}>
                            How is quality measured?
                        </button>
                    </>
                }
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={ui.chip}>
                    <b>{stage.llmCallCount}</b> LLM call{stage.llmCallCount === 1 ? "" : "s"} · <b>{stage.stories.length}</b> stories
                </span>
                <span style={ui.chip}>
                    {graded
                        ? `graded ${stage.stories.filter((s) => s.quality).length} of ${stage.stories.length} · implement · verify · maintain`
                        : "not yet graded · implement · verify · maintain"}
                </span>
            </div>

            {error && <div style={errorBox}>{error}</div>}

            {drafting && <LoadingBanner label="Drafting user stories from the approved goals…" />}
            {grading && <LoadingBanner label="Grading each story on implement / verify / maintain…" />}

            {stage.stories.length > 0 && !graded && !grading && !drafting && (
                <div style={requiredNotice}>
                    <span style={{ fontWeight: 600 }}>Quality pass required.</span>{" "}
                    Every story must be quality-checked before you can export. Run the quality pass to grade each on
                    implement, verify and maintain.
                </div>
            )}

            {stage.stories.map((s) => {
                const reviewed = s.status !== "pending";
                return (
                    <div key={s.id} style={{ ...ui.card, opacity: s.status === "rejected" ? 0.55 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                            <span style={ui.kindPill("var(--bg-accent)", "var(--text-accent)")}>{s.id}</span>
                            <span style={ui.statusPill(...statusColors(s.status))}>
                                {reviewed ? s.status : "pending review"}
                            </span>
                        </div>

                        {editingId === s.id ? (
                            <div style={{ marginBottom: 10 }}>
                                {s.quality && !s.qualityStale && (["implement", "verify", "maintain"] as const).some((a) => s.quality![a].grade !== "pass") && (
                                    <div style={fixHint}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-warning)", marginBottom: 5 }}>
                                            Fixing against these flags:
                                        </div>
                                        {(["implement", "verify", "maintain"] as const)
                                            .filter((a) => s.quality![a].grade !== "pass")
                                            .map((a) => (
                                                <div key={a} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45, marginBottom: 2 }}>
                                                    • <b style={{ textTransform: "capitalize" }}>{a}</b> ({s.quality![a].grade} · {s.quality![a].criterion}): {s.quality![a].reason}
                                                </div>
                                            ))}
                                    </div>
                                )}
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    <label style={editLbl}>As a…</label>
                                    <input style={editInput} value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
                                    <label style={editLbl}>I want…</label>
                                    <textarea style={editInput} rows={2} value={draft.want} onChange={(e) => setDraft((d) => ({ ...d, want: e.target.value }))} />
                                    <label style={editLbl}>so that…</label>
                                    <textarea style={editInput} rows={2} value={draft.soThat} onChange={(e) => setDraft((d) => ({ ...d, soThat: e.target.value }))} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.55, marginBottom: 10 }}>
                                <span style={{ color: "var(--text-muted)" }}>As a </span>
                                {s.role}
                                <span style={{ color: "var(--text-muted)" }}>, I want </span>
                                {s.want}
                                <span style={{ color: "var(--text-muted)" }}>, so that </span>
                                {s.soThat}.
                            </div>
                        )}

                        {s.acceptanceCriteria.length > 0 && (
                            <>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                                    Acceptance criteria
                                </div>
                                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
                                    {s.acceptanceCriteria.map((ac, i) => (
                                        <li key={i} style={acItem}>
                                            {ac}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {s.grounded ? (
                            <blockquote style={traceBox}>
                                “{s.trace}”<span style={traceWho}>{s.traceSpeaker ?? "transcript"}</span>
                            </blockquote>
                        ) : (
                            <div style={ungroundedBox}>No verbatim trace, flagged as inference, not grounded.</div>
                        )}

                        {s.quality && (
                            <div style={qualityBox}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                        Quality in use
                                    </span>
                                    {s.qualityStale && <span style={staleTag}>Edited since grading, re-check</span>}
                                </div>
                                {(["implement", "verify", "maintain"] as const).map((asp) => {
                                    const g = s.quality![asp];
                                    // Guard against sessions saved in an older quality format.
                                    if (!g || typeof g.grade !== "string") return null;
                                    return (
                                        <div key={asp} style={{ ...aspectRow, opacity: s.qualityStale ? 0.5 : 1 }}>
                                            <span style={{ ...gradeBadge, ...GRADE_STYLE[g.grade] }}>{g.grade.toUpperCase()}</span>
                                            <div style={{ flex: 1 }}>
                                                <div>
                                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{asp}</span>
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}> · {g.criterion}</span>
                                                </div>
                                                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45, marginTop: 2 }}>{g.reason}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {s.qualityStale && (
                                    <button style={{ ...ui.btnSecondary, marginTop: 10 }} disabled={grading} onClick={() => recheck(s)}>
                                        Re-check this story
                                    </button>
                                )}
                            </div>
                        )}

                        {reviewed ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
                                <span style={reviewedNote}>
                                    {s.status === "rejected"
                                        ? "Rejected, excluded from baseline"
                                        : s.status === "edited"
                                          ? "Edited and accepted, recorded to baseline"
                                          : "Accepted, recorded to baseline"}
                                </span>
                                <button style={ui.btnSubtle} onClick={() => setStage((st) => undoReviewStory(st, s.id, approver))}>
                                    Undo
                                </button>
                            </div>
                        ) : editingId === s.id ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                                <button style={ui.btnSecondary} onClick={() => saveEdit(s.id)}>
                                    Save &amp; accept
                                </button>
                                <button style={ui.btnSecondary} onClick={() => setEditingId(null)}>
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                                <button style={ui.btnSecondary} onClick={() => acceptStory(s)}>
                                    Accept
                                </button>
                                <button style={ui.btnSecondary} onClick={() => startEdit(s)}>
                                    Edit
                                </button>
                                <button style={ui.btnSecondary} onClick={() => review(s.id, "rejected")}>
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {stage.stories.length > 0 && (
                <div style={{ ...gate, ...(canAdvance ? gateOpenStyle : {}) }}>
                    <span style={{ flex: 1, fontSize: 13, color: canAdvance ? "var(--text-success)" : "var(--text-secondary)" }}>
                        {canAdvance
                            ? "Gate to export · all stories reviewed and quality-checked"
                            : !allReviewed
                              ? `${remaining} of ${stage.stories.length} stories still need review`
                              : !graded
                                ? "Quality pass required. Run it before you can export"
                                : "Some stories were edited after grading, re-check them before exporting"}
                    </span>
                    <button
                        style={{ ...advance, ...(canAdvance ? advanceReady : {}) }}
                        disabled={!canAdvance}
                        onClick={() => canAdvance && onAdvance?.(approvedStories(stage))}
                    >
                        Approve and advance
                    </button>
                </div>
            )}
            {showMethodology && <MethodologyModal onClose={() => setShowMethodology(false)} />}
        </section>
    );
}


const acItem: React.CSSProperties = { fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5, paddingLeft: 16, position: "relative" };
const traceBox: React.CSSProperties = { borderLeft: "2px solid var(--border-accent)", background: "var(--surface-1)", padding: "6px 10px", borderRadius: "0 5px 5px 0", fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", margin: 0 };
const traceWho: React.CSSProperties = { display: "block", fontStyle: "normal", fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 };
const ungroundedBox: React.CSSProperties = { borderLeft: "2px solid var(--border-danger)", background: "var(--bg-danger)", padding: "6px 10px", borderRadius: "0 5px 5px 0", fontSize: 12, color: "var(--text-danger)" };
const reviewedNote: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)" };
const gate: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginTop: 6, padding: "13px 15px", borderRadius: 12, border: "0.5px dashed var(--border-strong)", background: "var(--surface-2)" };
const gateOpenStyle: React.CSSProperties = { borderStyle: "solid", borderColor: "var(--border-success)", background: "var(--bg-success)" };
const advance: React.CSSProperties = { fontSize: 13, padding: "8px 16px", borderRadius: "var(--radius, 8px)", border: "none", background: "var(--fill-disabled)", color: "var(--text-disabled)", cursor: "not-allowed" };
const advanceReady: React.CSSProperties = { background: "var(--fill-accent)", color: "var(--on-accent)", cursor: "pointer" };
const errorBox: React.CSSProperties = { background: "var(--bg-danger)", color: "var(--text-danger)", border: "0.5px solid var(--border-danger)", borderRadius: 8, padding: "10px 12px", fontSize: 13 };

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

const editLbl: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)" };
const editInput: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontSize: 13.5,
    fontFamily: "inherit",
    padding: "7px 9px",
    borderRadius: "var(--radius, 8px)",
    border: "0.5px solid var(--border-accent)",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    resize: "vertical",
};

const qualityBox: React.CSSProperties = { marginTop: 12, padding: "12px 13px", borderRadius: 10, background: "var(--surface-1)", border: "0.5px solid var(--border)" };
const aspectRow: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderTop: "0.5px solid var(--border)" };
const gradeBadge: React.CSSProperties = { flexShrink: 0, width: 46, textAlign: "center", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.03em", padding: "3px 0", borderRadius: 6 };
const staleTag: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-warning)", background: "var(--bg-warning)", padding: "2px 9px", borderRadius: 999 };
const fixHint: React.CSSProperties = { background: "var(--bg-warning)", border: "0.5px solid var(--border-warning, var(--border-strong))", borderRadius: 10, padding: "10px 12px", marginBottom: 10 };

const requiredNotice: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", background: "var(--bg-accent)", border: "1px solid var(--border-accent)", borderRadius: 10, padding: "11px 14px" };
