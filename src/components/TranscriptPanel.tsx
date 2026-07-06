import { useRef, useState } from "react";
import { Turn } from "../types";
import { ui } from "./ui";

declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }
}
interface SpeechRecognitionLike {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start: () => void;
    stop: () => void;
}

interface Props {
    turns: Turn[];
    onAddTurn: (speaker: string, text: string, role: Turn["role"]) => void;
    onDeleteTurn?: (id: string) => void;
    onEditTurn?: (id: string, text: string) => void;
}

// Optional starter questions — empty by default. The user can load these as a
// convenience, edit them, or ignore them entirely. Never auto-inserted.
const STARTER_QUESTIONS = [
    "If this worked perfectly in three months, what would be different about your day?",
    "Do you want to replace the tool itself, or the manual effort of using it?",
    "What are the legal constraints we must respect?",
    "Who are the stakeholders and what does each need?",
    "What is the single most important outcome for you?",
];

// A ready-made demo interview for testing the pipeline in one click.
// Clearly a demo scaffold — never loaded automatically. Real users ignore it.
const DEMO_TRANSCRIPT: { speaker: string; role: Turn["role"]; text: string }[] = [
    { speaker: "Interviewer", role: "interviewer", text: "Walk me through how room booking works today." },
    {
        speaker: "Sara (Ops)",
        role: "stakeholder",
        text: "People email Facilities and Tom keeps a shared spreadsheet. We get double-bookings almost every week, especially the big conference room.",
    },
    { speaker: "Interviewer", role: "interviewer", text: "What happens with rooms that have special equipment?" },
    {
        speaker: "Tom (Facilities)",
        role: "stakeholder",
        text: "Some rooms need my sign-off because they have AV kit, but there's no real approval step, people just assume it's free.",
    },
    { speaker: "Interviewer", role: "interviewer", text: "Who else needs to see the bookings?" },
    {
        speaker: "Tom (Facilities)",
        role: "stakeholder",
        text: "The spreadsheet is three tabs deep now, nobody outside Facilities can read it.",
    },
];

const SpeechCtor =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

export function TranscriptPanel({ turns, onAddTurn, onDeleteTurn, onEditTurn }: Props) {
    const [speaker, setSpeaker] = useState("");
    const [role, setRole] = useState<Turn["role"]>("stakeholder");
    const [text, setText] = useState("");
    const [listening, setListening] = useState(false);
    const [showStarters, setShowStarters] = useState(false);
    const [editingTurn, setEditingTurn] = useState<string | null>(null);
    const [turnDraft, setTurnDraft] = useState("");
    const recRef = useRef<SpeechRecognitionLike | null>(null);
    const baseRef = useRef(""); // committed (finalized) text — never lost
    const interimRef = useRef(""); // latest not-yet-final words
    const wantOnRef = useRef(false); // true until the user taps the mic to stop

    const add = () => {
        if (!text.trim()) return;
        onAddTurn(speaker.trim() || (role === "interviewer" ? "Interviewer" : "Stakeholder"), text.trim(), role);
        setText("");
    };

    const loadDemo = () => {
        for (const t of DEMO_TRANSCRIPT) onAddTurn(t.speaker, t.text, t.role);
    };

    const join = (a: string, b: string) => (a + " " + b).replace(/\s+/g, " ").trim();

    const startRec = () => {
        if (!SpeechCtor) return;
        const rec = new SpeechCtor();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true;

        rec.onresult = (e) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) baseRef.current = join(baseRef.current, r[0].transcript);
                else interim += r[0].transcript;
            }
            interimRef.current = interim;
            setText(join(baseRef.current, interimRef.current));
        };

        rec.onend = () => {
            // Commit any dangling interim words so a pause never drops a half sentence.
            if (interimRef.current) {
                baseRef.current = join(baseRef.current, interimRef.current);
                interimRef.current = "";
                setText(baseRef.current);
            }
            // Browsers like Samsung Internet end on a short silence. If the user hasn't
            // tapped stop, restart so it feels continuous through the pause.
            if (wantOnRef.current) {
                window.setTimeout(() => {
                    if (!wantOnRef.current) return;
                    try {
                        recRef.current?.start();
                    } catch {
                        startRec();
                    }
                }, 150);
            } else {
                setListening(false);
            }
        };

        rec.onerror = () => {
            // no-speech / aborted are normal on silence; onend will handle the restart.
        };

        recRef.current = rec;
        try {
            rec.start();
        } catch {
            /* already starting — ignore */
        }
    };

    const toggleMic = () => {
        if (!SpeechCtor) return;
        if (listening) {
            wantOnRef.current = false;
            recRef.current?.stop();
            setListening(false);
            return;
        }
        baseRef.current = text ? text.trimEnd() : "";
        interimRef.current = "";
        wantOnRef.current = true;
        setListening(true);
        startRec();
    };

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: 14, margin: 0, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    Stage 1: Interview
                </h2>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {turns.length} turn{turns.length === 1 ? "" : "s"}
                </span>
            </header>

            {/* Running transcript (empty until the user adds turns) */}
            {turns.length === 0 ? (
                <div style={emptyBox}>
                    <div style={{ marginBottom: 10 }}>
                        No turns yet. Add the interviewer’s questions and the stakeholder’s answers below. Type them, or
                        use the mic to dictate. Paste in your own content freely.
                    </div>
                    <button style={demoBtn} onClick={loadDemo}>
                        Load demo interview
                    </button>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {turns.map((t) => (
                        <div key={t.id} style={{ ...turnBox, ...(t.role === "interviewer" ? interviewerTint : {}) }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
                                    {t.speaker} · {t.role}
                                </div>
                                {(onEditTurn || onDeleteTurn) && editingTurn !== t.id && (
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {onEditTurn && (
                                            <button
                                                style={turnCtrl}
                                                onClick={() => {
                                                    setEditingTurn(t.id);
                                                    setTurnDraft(t.text);
                                                }}
                                            >
                                                edit
                                            </button>
                                        )}
                                        {onDeleteTurn && (
                                            <button style={turnCtrl} onClick={() => onDeleteTurn(t.id)}>
                                                delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {editingTurn === t.id ? (
                                <div>
                                    <textarea
                                        autoFocus
                                        style={{ ...textarea, marginTop: 4 }}
                                        rows={2}
                                        value={turnDraft}
                                        onChange={(e) => setTurnDraft(e.target.value)}
                                    />
                                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                                        <button
                                            style={turnCtrl}
                                            onClick={() => {
                                                onEditTurn?.(t.id, turnDraft.trim());
                                                setEditingTurn(null);
                                            }}
                                        >
                                            save
                                        </button>
                                        <button style={turnCtrl} onClick={() => setEditingTurn(null)}>
                                            cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.45 }}>{t.text}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Composer: speaker + role, text (type or dictate), add */}
            <div style={composer}>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        style={{ ...input, flex: 2 }}
                        value={speaker}
                        onChange={(e) => setSpeaker(e.target.value)}
                        placeholder={role === "interviewer" ? "Interviewer name (optional)" : "Stakeholder name (optional)"}
                    />
                    <select style={{ ...input, flex: 1 }} value={role} onChange={(e) => setRole(e.target.value as Turn["role"])}>
                        <option value="stakeholder">stakeholder</option>
                        <option value="interviewer">interviewer</option>
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 6px" }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {role === "interviewer" ? "Question / prompt" : "Answer"}
                    </span>
                    {SpeechCtor ? (
                        <button
                            style={{ ...micBtn, ...(listening ? micOn : {}) }}
                            onClick={toggleMic}
                            aria-label={listening ? "Stop dictation" : "Start dictation"}
                            title={listening ? "Listening — tap to stop" : "Dictate"}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="9" y="2" width="6" height="12" rx="3" />
                                <path d="M5 10a7 7 0 0 0 14 0" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            {listening && <span style={pulseDot} />}
                        </button>
                    ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>voice not supported here</span>
                    )}
                </div>
                <textarea
                    style={textarea}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
                    }}
                    placeholder="Type here, paste, or tap dictate…  (⌘/Ctrl+Enter to add)"
                    rows={3}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button style={ui.btnPrimary} disabled={!text.trim()} onClick={add}>
                        Add turn
                    </button>
                    <button style={ui.btnSecondary} onClick={() => setShowStarters((v) => !v)}>
                        {showStarters ? "Hide starter questions" : "Starter questions"}
                    </button>
                </div>

                {showStarters && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Optional: click to load into the box as an interviewer prompt, then edit freely.
                        </div>
                        {STARTER_QUESTIONS.map((q, i) => (
                            <button
                                key={i}
                                style={starterBtn}
                                onClick={() => {
                                    setRole("interviewer");
                                    setText(q);
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

const input: React.CSSProperties = { fontSize: 13, padding: "7px 9px", borderRadius: "var(--radius, 8px)", border: "0.5px solid var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", boxSizing: "border-box" };
const textarea: React.CSSProperties = { ...input, width: "100%", resize: "vertical", fontFamily: "inherit" };
const composer: React.CSSProperties = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "13px 15px" };
const emptyBox: React.CSSProperties = { background: "var(--surface-1)", border: "0.5px dashed var(--border-strong)", borderRadius: 12, padding: "16px 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 };
const turnBox: React.CSSProperties = { background: "var(--surface-1)", borderRadius: 10, padding: "8px 11px" };
const interviewerTint: React.CSSProperties = { background: "var(--bg-accent)" };
const micBtn: React.CSSProperties = { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, borderRadius: 999, border: "0.5px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text-muted)", cursor: "pointer" };
const micOn: React.CSSProperties = { background: "var(--bg-accent)", color: "var(--text-accent)", borderColor: "var(--border-accent)" };
const pulseDot: React.CSSProperties = { position: "absolute", top: 3, right: 3, width: 7, height: 7, borderRadius: 999, background: "var(--text-accent)", animation: "re-pulse 1.2s ease-in-out infinite" };
const starterBtn: React.CSSProperties = { textAlign: "left", fontSize: 12.5, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface-1)", color: "var(--text-secondary)", cursor: "pointer", lineHeight: 1.4 };

const demoBtn: React.CSSProperties = {
    fontSize: 12.5,
    padding: "8px 14px",
    borderRadius: "var(--radius, 8px)",
    border: "0.5px solid var(--border-accent)",
    background: "var(--bg-accent)",
    color: "var(--text-accent)",
    cursor: "pointer",
};

const turnCtrl: React.CSSProperties = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 6,
    border: "0.5px solid var(--border-strong)",
    background: "var(--surface-2)",
    color: "var(--text-muted)",
    cursor: "pointer",
};
