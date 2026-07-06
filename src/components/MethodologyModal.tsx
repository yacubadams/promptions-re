import { QUALITY_METHODOLOGY as M } from "../content/methodology";

interface Props {
    onClose: () => void;
}

export function MethodologyModal({ onClose }: Props) {
    return (
        <div style={backdrop} onClick={onClose}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontSize: 19, fontWeight: 600, color: "var(--text-primary)" }}>How quality is measured</div>
                    <button style={closeBtn} onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                    Activity-based quality (ABRE-QM), with classic CPRE / ISO 29148 criteria as the named justification.
                </div>

                <div style={section}>
                    <div style={sectionTitle}>The principle: quality in use</div>
                    <p style={para}>{M.principle}</p>
                </div>

                <div style={section}>
                    <div style={sectionTitle}>The three activities we grade</div>
                    {M.activities.map((a) => (
                        <div key={a.name} style={activity}>
                            <b>{a.name}</b>: {a.q}
                        </div>
                    ))}
                    <p style={para}>{M.grades}</p>
                </div>

                <div style={section}>
                    <div style={sectionTitle}>Where CPRE fits</div>
                    <p style={para}>{M.cpre}</p>
                    <p style={para}>{M.handledElsewhere}</p>
                </div>

                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>{M.sources}</div>

                <button style={doneBtn} onClick={onClose}>
                    Got it
                </button>
            </div>
        </div>
    );
}

const backdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,18,24,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 90 };
const modal: React.CSSProperties = { background: "var(--surface-1, #fff)", borderRadius: 16, padding: "24px 26px", maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" };
const section: React.CSSProperties = { marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" };
const para: React.CSSProperties = { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 8px" };
const activity: React.CSSProperties = { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, padding: "7px 11px", background: "var(--surface-2)", borderRadius: 8, marginBottom: 6 };
const closeBtn: React.CSSProperties = { fontSize: 22, lineHeight: 1, padding: "0 4px", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer" };
const doneBtn: React.CSSProperties = { marginTop: 18, fontSize: 13, fontWeight: 600, padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--fill-accent)", color: "var(--on-accent)", cursor: "pointer" };
