import { useState } from "react";
import { buildRoster } from "../state/roster";
import { Participant, SpeakerMap, SpeakerRole } from "../types";

// One anonymous voice a diarizer detected, with a sample utterance so the RE
// can recognise who it is.
export interface DetectedSpeaker {
    label: string; // "Speaker 1"
    sample: string; // a representative line, for recognition
}

interface Assignment {
    name: string;
    org: string;
    role: SpeakerRole;
}

interface Props {
    detected: DetectedSpeaker[];
    onConfirm: (roster: Participant[], map: SpeakerMap) => void;
}

/**
 * The bridge between anonymous diarization output and the named pipeline.
 * Diarization can tell voices apart but not name them — this one-time step
 * lets the RE assign each detected voice a name, org, and role. From then on
 * the labels stick and every downstream Turn is correctly attributed.
 */
export function SpeakerNamingPanel({ detected, onConfirm }: Props) {
    const [assignments, setAssignments] = useState<Record<string, Assignment>>(() =>
        Object.fromEntries(
            detected.map((d, i) => [d.label, { name: "", org: "", role: i === 0 ? "interviewer" : "stakeholder" }]),
        ),
    );

    const update = (label: string, patch: Partial<Assignment>) =>
        setAssignments((a) => ({ ...a, [label]: { ...a[label], ...patch } }));

    const allNamed = detected.every((d) => assignments[d.label]?.name.trim().length > 0);

    const confirm = () => {
        const { roster, map } = buildRoster(
            detected.map((d) => ({
                label: d.label,
                name: assignments[d.label].name,
                org: assignments[d.label].org,
                role: assignments[d.label].role,
            })),
        );
        onConfirm(roster, map);
    };

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <header>
                <h2 style={{ fontSize: 14, margin: 0, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                    Name the voices
                </h2>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                    {detected.length} distinct voices detected. Assign each a name and role. This happens once per
                    session.
                </p>
            </header>

            {detected.map((d) => {
                const a = assignments[d.label];
                return (
                    <div key={d.label} style={card}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={anonPill}>{d.label}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>detected voice</span>
                        </div>
                        <blockquote style={sampleBox}>“{d.sample}”</blockquote>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <input
                                style={{ ...input, flex: 2, minWidth: 120 }}
                                placeholder="Name"
                                value={a.name}
                                onChange={(e) => update(d.label, { name: e.target.value })}
                            />
                            <input
                                style={{ ...input, flex: 1, minWidth: 90 }}
                                placeholder="Org / team"
                                value={a.org}
                                onChange={(e) => update(d.label, { org: e.target.value })}
                            />
                            <select
                                style={{ ...input, flex: 1, minWidth: 110 }}
                                value={a.role}
                                onChange={(e) => update(d.label, { role: e.target.value as SpeakerRole })}
                            >
                                <option value="interviewer">interviewer</option>
                                <option value="stakeholder">stakeholder</option>
                            </select>
                        </div>
                    </div>
                );
            })}

            <button style={{ ...confirmBtn, ...(allNamed ? confirmReady : {}) }} disabled={!allNamed} onClick={confirm}>
                Confirm voices and continue
            </button>
        </section>
    );
}

const card: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "0.5px solid var(--border)",
    borderRadius: 12,
    padding: "13px 15px",
};

const anonPill: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 9px",
    borderRadius: 999,
    background: "var(--bg-accent)",
    color: "var(--text-accent)",
};

const sampleBox: React.CSSProperties = {
    borderLeft: "2px solid var(--border-strong)",
    background: "var(--surface-1)",
    padding: "6px 10px",
    borderRadius: "0 5px 5px 0",
    fontSize: 12.5,
    color: "var(--text-secondary)",
    fontStyle: "italic",
    margin: 0,
};

const input: React.CSSProperties = {
    fontSize: 13,
    padding: "7px 9px",
    borderRadius: "var(--radius, 8px)",
    border: "0.5px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
};

const confirmBtn: React.CSSProperties = {
    fontSize: 13,
    padding: "9px 16px",
    borderRadius: "var(--radius, 8px)",
    border: "none",
    background: "var(--fill-disabled)",
    color: "var(--text-disabled)",
    cursor: "not-allowed",
    alignSelf: "flex-start",
};

const confirmReady: React.CSSProperties = {
    background: "var(--fill-accent)",
    color: "var(--on-accent)",
    cursor: "pointer",
};
