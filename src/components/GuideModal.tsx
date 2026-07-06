import { QUALITY_METHODOLOGY as M, FLOW_STEPS, GLOSSARY } from "../content/methodology";

interface Props {
    onClose: () => void;
}

export function GuideModal({ onClose }: Props) {
    return (
        <div style={backdrop} onClick={onClose}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Guide</div>
                    <button style={closeBtn} onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.5 }}>
                    A one-page reference to how this tool works, the methodology behind it, and the terms it uses.
                </div>

                <div style={section}>
                    <div style={sectionTitle}>The flow</div>
                    {FLOW_STEPS.map((s) => (
                        <div key={s.n} style={flowRow}>
                            <span style={num}>{s.n}</span>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{s.t}</div>
                                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{s.d}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={section}>
                    <div style={sectionTitle}>How quality is measured</div>
                    <p style={para}>{M.principle}</p>
                    {M.activities.map((a) => (
                        <div key={a.name} style={activity}>
                            <b>{a.name}</b>: {a.q}
                        </div>
                    ))}
                    <p style={para}>{M.grades}</p>
                    <p style={para}>{M.cpre}</p>
                    <p style={para}>{M.handledElsewhere}</p>
                </div>

                <div style={section}>
                    <div style={sectionTitle}>The Promptions principle</div>
                    <div style={principle}>
                        Claude only ever <b>proposes</b>. Nothing enters the approved record until you decide, every
                        suggestion is tied to a real quote from the transcript, and every decision is logged and never
                        erased. You own the record.
                    </div>
                </div>

                <div style={section}>
                    <div style={sectionTitle}>Terminology</div>
                    {GLOSSARY.map((g) => (
                        <div key={g.term} style={glossRow}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 1 }}>{g.term}</div>
                            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{g.def}</div>
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{M.sources}</div>

                <button style={doneBtn} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,18,24,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 90 };
const modal: React.CSSProperties = { background: "var(--surface-1, #fff)", borderRadius: 16, padding: "24px 26px", maxWidth: 620, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" };
const section: React.CSSProperties = { marginBottom: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.04em", paddingBottom: 5, borderBottom: "0.5px solid var(--border)" };
const para: React.CSSProperties = { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 8px" };
const activity: React.CSSProperties = { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, padding: "7px 11px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 6 };
const flowRow: React.CSSProperties = { display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 9 };
const num: React.CSSProperties = { flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "var(--bg-accent)", color: "var(--text-accent)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" };
const glossRow: React.CSSProperties = { padding: "8px 0", borderTop: "0.5px solid var(--border)" };
const principle: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)", background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.55 };
const closeBtn: React.CSSProperties = { fontSize: 22, lineHeight: 1, padding: "0 4px", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" };
const doneBtn: React.CSSProperties = { marginTop: 8, fontSize: 13, fontWeight: 600, padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--fill-accent)", color: "var(--on-accent)", cursor: "pointer" };
