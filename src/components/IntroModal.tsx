import { useState } from "react";

interface Props {
    onClose: (dontShowAgain: boolean) => void;
}

export function IntroModal({ onClose }: Props) {
    const [dontShow, setDontShow] = useState(false);

    return (
        <div style={backdrop} onClick={() => onClose(dontShow)}>
            <div style={modal} onClick={(e) => e.stopPropagation()}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    Welcome to the RE Interview Assistant
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                    Turn a stakeholder interview into structured, traceable requirements, with you in control at every
                    step.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                            <span style={num}>{i + 1}</span>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{s.t}</div>
                                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{s.d}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={principle}>
                    Claude only ever <b>proposes</b>. Nothing advances until you accept it, and every suggestion is tied
                    to a real quote from the transcript.
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--text-muted)", cursor: "pointer" }}>
                        <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
                        Don’t show this again
                    </label>
                    <button style={cta} onClick={() => onClose(dontShow)}>
                        Get started
                    </button>
                </div>
            </div>
        </div>
    );
}

const STEPS = [
    { t: "1 · Interview", d: "Add the interviewer’s questions and the stakeholder’s answers. Type them or use the mic to dictate, or load a demo to explore." },
    { t: "2 · Elicitation", d: "Claude proposes candidate goals, gaps and open issues from the transcript. You accept, edit, or reject each." },
    { t: "3 & 4 · Goals & Drafting", d: "Approved items become a goal model, then user stories with acceptance criteria, graded on implement / verify / maintain." },
    { t: "5–6 · Review & Export", d: "Review the graded stories, then export the approved set to paste into your own system of record." },
];

const backdrop: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 50,
};
const modal: React.CSSProperties = {
    background: "var(--surface-1, #fff)",
    borderRadius: 16,
    padding: "24px 26px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    border: "0.5px solid var(--border)",
};
const num: React.CSSProperties = {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--bg-accent)",
    color: "var(--text-accent)",
    fontSize: 12,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};
const principle: React.CSSProperties = {
    fontSize: 12.5,
    color: "var(--text-secondary)",
    background: "var(--surface-2)",
    border: "0.5px solid var(--border)",
    borderRadius: 10,
    padding: "11px 13px",
    lineHeight: 1.5,
};
const cta: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    padding: "9px 20px",
    borderRadius: "var(--radius, 8px)",
    border: "none",
    background: "var(--fill-accent)",
    color: "var(--on-accent)",
    cursor: "pointer",
};
