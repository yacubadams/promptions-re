import { useEffect, useMemo, useRef, useState } from "react";
import { ClaudeService } from "../services/ClaudeService";
import { ElicitationService } from "../services/ElicitationService";
import { DraftingService } from "../services/DraftingService";
import { QualityService } from "../services/QualityService";
import { ConflictService } from "../services/ConflictService";
import { uid } from "../state/interviewModel";
import { emptyElicitation } from "../state/elicitationModel";
import { emptyDrafting } from "../state/draftingModel";
import {
    Session,
    changeLog,
    clearSession,
    downloadReadable,
    downloadSessionJson,
    loadSession,
    saveSession,
} from "../state/sessionStore";
import { DraftedStory, DraftingStage, ElicitationCandidate, ElicitationStage, Turn } from "../types";
import { TranscriptPanel } from "./TranscriptPanel";
import { StageHeader, ui } from "./ui";
import { IntroModal } from "./IntroModal";
import { GuideModal } from "./GuideModal";
import { ElicitationPanel } from "./ElicitationPanel";
import { DraftingPanel } from "./DraftingPanel";
import { ConflictPanel } from "./ConflictPanel";

type StageKey = "interview" | "elicitation" | "goals" | "drafting" | "export";

const STAGES: { key: StageKey; label: string }[] = [
    { key: "interview", label: "Interview" },
    { key: "elicitation", label: "Elicitation" },
    { key: "goals", label: "Goals" },
    { key: "drafting", label: "Drafting" },
    { key: "export", label: "Export" },
];

export function App() {
    const services = useMemo(() => {
        try {
            const claude = new ClaudeService();
            return {
                elicitation: new ElicitationService(claude),
                drafting: new DraftingService(claude),
                quality: new QualityService(claude),
                conflict: new ConflictService(claude),
                error: null as string | null,
            };
        } catch (e) {
            return { error: (e as Error).message } as const;
        }
    }, []);

    // Restore a saved session if present (survives refresh).
    const saved = useMemo(() => loadSession(), []);
    const [stage, setStage] = useState<StageKey>((saved?.stage as StageKey) ?? "interview");
    const [turns, setTurns] = useState<Turn[]>(saved?.turns ?? []);
    const [elicitation, setElicitation] = useState<ElicitationStage>(saved?.elicitation ?? emptyElicitation());
    const [drafting, setDrafting] = useState<DraftingStage>(saved?.drafting ?? emptyDrafting());
    const [goals, setGoals] = useState<ElicitationCandidate[]>(saved?.goals ?? []);
    const [approved, setApproved] = useState<DraftedStory[]>(saved?.approved ?? []);
    const [scopePrefix, setScopePrefix] = useState<string>(saved?.scopePrefix ?? "US");
    const [busyRaw, setBusyRaw] = useState(false);
    const busyStart = useRef(0);
    // Guarantee the working indicator is visible for at least 500ms, so fast
    // calls can't make it flash-and-vanish before the eye catches it.
    const setBusy = (v: boolean) => {
        if (v) {
            busyStart.current = Date.now();
            setBusyRaw(true);
        } else {
            const wait = Math.max(0, 500 - (Date.now() - busyStart.current));
            setTimeout(() => setBusyRaw(false), wait);
        }
    };
    const busy = busyRaw;
    const [showGuide, setShowGuide] = useState(false);
    const [showIntro, setShowIntro] = useState(() => {
        try {
            return localStorage.getItem("re_intro_dismissed") !== "1";
        } catch {
            return true;
        }
    });

    // The whole session, assembled for save/export.
    const session: Session = { version: 1, savedAt: Date.now(), stage, turns, elicitation, drafting, goals, approved, scopePrefix };

    // Autosave whenever anything meaningful changes.
    useEffect(() => {
        saveSession(session);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage, turns, elicitation, drafting, goals, approved, scopePrefix]);

    const resetSession = () => {
        clearSession();
        setStage("interview");
        setTurns([]);
        setElicitation(emptyElicitation());
        setDrafting(emptyDrafting());
        setGoals([]);
        setApproved([]);
        setScopePrefix("US");
    };

    if ("error" in services && services.error) {
        return (
            <div style={envError}>
                <h1 style={{ fontSize: 18, margin: "0 0 8px" }}>Configuration needed</h1>
                <p style={{ margin: "0 0 6px" }}>{services.error}</p>
                <p style={{ margin: 0 }}>
                    Copy <code>.env.example</code> to <code>.env</code> and set your Anthropic key (or a proxy URL),
                    then restart the dev server.
                </p>
            </div>
        );
    }
    const svc = services as Extract<typeof services, { elicitation: ElicitationService }>;

    const addTurn = (speaker: string, text: string, role: Turn["role"]) =>
        setTurns((t) => [...t, { id: uid("t"), speaker, role, text, ts: Date.now() }]);

    const deleteTurn = (id: string) => setTurns((t) => t.filter((x) => x.id !== id));
    const editTurn = (id: string, text: string) =>
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, text } : x)));

    const reachedIndex = STAGES.findIndex((s) => s.key === stage);

    return (
        <div style={page}>
            {busy && (
                <div style={busyOverlay} role="status" aria-live="polite">
                    <div style={busyCard}>
                        <span className="re-spinner-lg" aria-hidden />
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Claude is working…</div>
                        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Analysing the interview. This takes a few seconds.</div>
                    </div>
                </div>
            )}
            {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
            {showIntro && (
                <IntroModal
                    onClose={(dontShow) => {
                        setShowIntro(false);
                        if (dontShow) {
                            try {
                                localStorage.setItem("re_intro_dismissed", "1");
                            } catch {
                                /* ignore */
                            }
                        }
                    }}
                />
            )}
            <header style={header}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>
                        RE Interview Assistant
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Human-in-the-loop elicitation · powered by Claude
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
                        Scope
                        <input
                            value={scopePrefix}
                            onChange={(e) => setScopePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10))}
                            onBlur={(e) => { if (!e.target.value.trim()) setScopePrefix("US"); }}
                            style={scopeInput}
                            placeholder="US"
                            title="Requirement ID prefix for this batch (e.g. BOOK, ACCESS)"
                        />
                    </label>
                    <button style={ui.btnSubtle} onClick={() => setShowGuide(true)}>
                        Guide
                    </button>
                    <button style={ui.btnSecondary} onClick={() => downloadSessionJson(session)}>
                        Export .json
                    </button>
                    <button style={ui.btnDanger} onClick={resetSession}>
                        Clear session
                    </button>
                    <span style={qaBadge}>QA-strict</span>
                </div>
            </header>

            <div style={rail}>
                {STAGES.map((s, i) => {
                    const done = i < reachedIndex;
                    const current = i === reachedIndex;
                    return (
                        <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "0 0 auto" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                                <div style={{ ...dot, ...(done ? dotDone : current ? dotCurrent : {}) }}>
                                    {done ? "\u2713" : i + 1}
                                </div>
                                <span style={{ fontSize: 11, color: current ? "var(--text-primary)" : "var(--text-muted)" }}>
                                    {s.label}
                                </span>
                            </div>
                            {i < STAGES.length - 1 && <div style={connector} />}
                        </div>
                    );
                })}
            </div>

            {stage === "interview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <TranscriptPanel turns={turns} onAddTurn={addTurn} onDeleteTurn={deleteTurn} onEditTurn={editTurn} />
                    <button
                        style={{ ...ui.btnPrimary, alignSelf: "flex-start" }}
                        disabled={turns.length === 0}
                        onClick={() => {
                            if (elicitation.candidates.length === 0) setBusy(true);
                            setStage("elicitation");
                        }}
                    >
                        Run elicitation analysis &rarr;
                    </button>
                </div>
            )}

            {stage === "elicitation" && (
                <ElicitationPanel
                    turns={turns}
                    service={svc.elicitation}
                    stage={elicitation}
                    onStageChange={setElicitation}
                    onBusy={setBusy}
                    onAdvance={(promoted) => {
                        setGoals(promoted);
                        setStage("goals");
                    }}
                />
            )}

            {stage === "goals" && (
                <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <StageHeader
                        step="Stage 3"
                        title="Goal model"
                        subtitle={`${goals.length} item${goals.length === 1 ? "" : "s"} carried from elicitation, ready to draft into requirements.`}
                    />
                    {goals.map((g) => (
                        <div key={g.id} style={goalCard}>
                            <div style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.5 }}>{g.statement}</div>
                            {g.trace && (
                                <blockquote style={traceBox}>
                                    &ldquo;{g.trace}&rdquo;<span style={traceWho}>{g.traceSpeaker ?? "transcript"}</span>
                                </blockquote>
                            )}
                        </div>
                    ))}
                    <button
                        style={{ ...ui.btnPrimary, alignSelf: "flex-start" }}
                        disabled={goals.length === 0}
                        onClick={() => {
                            if (drafting.stories.length === 0) setBusy(true);
                            setStage("drafting");
                        }}
                    >
                        Draft requirements &rarr;
                    </button>
                </section>
            )}

            {stage === "drafting" && (
                <DraftingPanel
                    goals={goals}
                    turns={turns}
                    draftingService={svc.drafting}
                    qualityService={svc.quality}
                    scopePrefix={scopePrefix.trim() || "US"}
                    stage={drafting}
                    onStageChange={setDrafting}
                    onBusy={setBusy}
                    onAdvance={(stories) => {
                        setApproved(stories);
                        setStage("export");
                    }}
                />
            )}

            {stage === "export" && (
                <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <StageHeader
                        step="Stage 6"
                        title="Export"
                        subtitle="Download the full session (JSON, including rejected items and the change log) or a readable requirements file to paste into your system of record. Nothing is written automatically."
                        actions={
                            <>
                                <button style={ui.btnPrimary} onClick={() => downloadReadable(session)}>
                                    Download requirements (.md)
                                </button>
                                <button style={ui.btnPrimary} onClick={() => downloadSessionJson(session)}>
                                    Download full record (.json)
                                </button>
                            </>
                        }
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={exportChip}><b>{approved.length}</b> approved</span>
                        <span style={exportChip}><b>{drafting.stories.filter((s) => s.status === "rejected").length}</b> rejected (kept in export)</span>
                        <span style={exportChip}><b>{changeLog(session).length}</b> change-log entries</span>
                    </div>

                    <ConflictPanel stories={approved} service={svc.conflict} onBusy={setBusy} />

                    {approved.map((s) => (
                        <div key={s.id} style={goalCard}>
                            <div style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.55 }}>
                                <b style={{ color: "var(--text-accent)", fontWeight: 600 }}>{s.id}</b>&nbsp; As a {s.role}, I want {s.want}, so that {s.soThat}.
                            </div>
                            {s.acceptanceCriteria.length > 0 && (
                                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                                    {s.acceptanceCriteria.map((ac, i) => (
                                        <li key={i} style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{ac}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    <button style={{ ...ui.btnSecondary, alignSelf: "flex-start" }} onClick={() => setStage("interview")}>
                        &larr; Back to interview
                    </button>
                </section>
            )}
        </div>
    );
}

const page: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: 20 };
const header: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 };
const qaBadge: React.CSSProperties = { fontSize: 11, color: "var(--text-success)", background: "var(--bg-success)", padding: "3px 9px", borderRadius: 999 };
const rail: React.CSSProperties = { display: "flex", alignItems: "center", margin: "4px 0 20px" };
const dot: React.CSSProperties = { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, border: "0.5px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text-muted)" };
const dotDone: React.CSSProperties = { background: "var(--bg-success)", color: "var(--text-success)", borderColor: "transparent" };
const dotCurrent: React.CSSProperties = { background: "var(--fill-accent)", color: "var(--on-accent)", borderColor: "transparent" };
const connector: React.CSSProperties = { flex: 1, height: "0.5px", background: "var(--border-strong)", margin: "0 6px", position: "relative", top: -10 };
const goalCard: React.CSSProperties = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "13px 15px" };
const traceBox: React.CSSProperties = { borderLeft: "2px solid var(--border-accent)", background: "var(--surface-1)", padding: "7px 11px", borderRadius: "0 6px 6px 0", fontSize: 12.5, color: "var(--text-secondary)", fontStyle: "italic", margin: "8px 0 0" };
const traceWho: React.CSSProperties = { display: "block", fontStyle: "normal", fontSize: 11, color: "var(--text-muted)", marginTop: 3 };
const envError: React.CSSProperties = { maxWidth: 560, margin: "48px auto", background: "var(--bg-danger, #fdeaea)", color: "var(--text-danger, #8a2b2b)", border: "0.5px solid var(--border-danger, #f3c4c4)", borderRadius: 8, padding: "16px 18px", fontSize: 13.5 };

const exportChip: React.CSSProperties = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "7px 11px", fontSize: 12, color: "var(--text-secondary)" };

const busyOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,18,24,0.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center" };
const busyCard: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "var(--surface-1, #fff)", borderRadius: 16, padding: "28px 34px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" };

const scopeInput: React.CSSProperties = { width: 64, fontSize: 12, fontWeight: 500, padding: "5px 8px", borderRadius: 7, border: "0.5px solid var(--border-strong)", background: "var(--surface-1)", color: "var(--text-primary)", textTransform: "uppercase" };
