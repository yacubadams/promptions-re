import { useMemo, useState } from "react";
import { ConflictService, ConflictInput, ConflictPair } from "../services/ConflictService";
import { DraftedStory } from "../types";
import { ui } from "./ui";

interface Props {
    stories: DraftedStory[]; // current session's approved requirements
    service: ConflictService;
    onBusy?: (busy: boolean) => void;
}

interface ExtReq extends ConflictInput {
    source: string; // filename of the loaded batch
}

export function ConflictPanel({ stories, service, onBusy }: Props) {
    const [external, setExternal] = useState<ExtReq[]>([]);
    const [pairs, setPairs] = useState<ConflictPair[] | null>(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pool: ConflictInput[] = useMemo(
        () => [
            ...stories.map((s) => ({ id: s.id, role: s.role, want: s.want, soThat: s.soThat })),
            ...external.map((e) => ({ id: e.id, role: e.role, want: e.want, soThat: e.soThat })),
        ],
        [stories, external],
    );

    const textFor = (id: string) => {
        const r = pool.find((p) => p.id === id);
        return r ? `As a ${r.role}, I want ${r.want}, so that ${r.soThat}.` : id;
    };
    const sourceFor = (id: string) => external.find((e) => e.id === id)?.source;

    const loadBatch = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result));
                const list = (data.approved?.length ? data.approved : data.drafting?.stories) ?? [];
                const reqs: ExtReq[] = list
                    .filter((s: DraftedStory) => s.status === "accepted" || s.status === "edited")
                    .map((s: DraftedStory) => ({ id: s.id, role: s.role, want: s.want, soThat: s.soThat, source: file.name }));
                if (reqs.length === 0) {
                    setError(`"${file.name}" has no approved requirements to compare against.`);
                    return;
                }
                setExternal((prev) => [...prev.filter((e) => e.source !== file.name), ...reqs]);
                setPairs(null);
            } catch {
                setError(`Could not read "${file.name}". Is it a session .json export?`);
            }
        };
        reader.readAsText(file);
    };

    const loadFiles = (files: FileList) => {
        setError(null);
        Array.from(files).forEach(loadBatch);
    };

    const clearLoaded = () => {
        setExternal([]);
        setPairs(null);
    };

    const run = async () => {
        setChecking(true);
        onBusy?.(true);
        setError(null);
        try {
            const found = await service.check(pool);
            setPairs(found);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setChecking(false);
            onBusy?.(false);
        }
    };

    return (
        <div style={box}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Conflict mapping</div>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.45, marginTop: 2 }}>
                        Claude flags requirements that contradict each other. It maps them; you decide how to resolve.
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ ...ui.btnSubtle, display: "inline-flex", alignItems: "center" }}>
                        Load batches (.json)
                        <input
                            type="file"
                            accept="application/json,.json"
                            multiple
                            style={{ display: "none" }}
                            onChange={(e) => e.target.files && e.target.files.length > 0 && loadFiles(e.target.files)}
                        />
                    </label>
                    <button style={ui.btnPrimary} disabled={checking || pool.length < 2} onClick={run}>
                        {checking ? "Checking…" : "Map conflicts"}
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                <span style={ui.chip}>{stories.length} in this batch</span>
                {[...new Set(external.map((e) => e.source))].map((src) => (
                    <span key={src} style={ui.chip}>
                        {external.filter((e) => e.source === src).length} from {src}
                    </span>
                ))}
                {external.length > 0 && (
                    <button style={ui.btnSubtle} onClick={clearLoaded}>
                        Clear loaded
                    </button>
                )}
            </div>

            {error && <div style={{ fontSize: 12.5, color: "var(--text-danger)", marginTop: 10 }}>{error}</div>}

            {pairs !== null && (
                <div style={{ marginTop: 14 }}>
                    {pairs.length === 0 ? (
                        <div style={okBox}>No contradictions found across {pool.length} requirements.</div>
                    ) : (
                        <>
                            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 8 }}>
                                {pairs.length} possible conflict{pairs.length === 1 ? "" : "s"}. Review and resolve each in the
                                drafting stage.
                            </div>
                            {pairs.map((p, i) => (
                                <div key={i} style={pairCard}>
                                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 8 }}>
                                        {p.reason}
                                    </div>
                                    <div style={reqLine}>
                                        <span style={idPill}>{p.aId}</span>
                                        {sourceFor(p.aId) && <span style={srcTag}>{sourceFor(p.aId)}</span>}
                                        <span style={{ fontSize: 12.5, color: "var(--text-primary)" }}>{textFor(p.aId)}</span>
                                    </div>
                                    <div style={{ ...reqLine, marginTop: 6 }}>
                                        <span style={idPill}>{p.bId}</span>
                                        {sourceFor(p.bId) && <span style={srcTag}>{sourceFor(p.bId)}</span>}
                                        <span style={{ fontSize: 12.5, color: "var(--text-primary)" }}>{textFor(p.bId)}</span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const box: React.CSSProperties = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "15px 16px" };
const okBox: React.CSSProperties = { fontSize: 13, color: "var(--text-secondary)", background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px" };
const pairCard: React.CSSProperties = { background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 8 };
const reqLine: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" };
const idPill: React.CSSProperties = { flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--text-accent)", background: "var(--bg-accent)", padding: "2px 9px", borderRadius: 999 };
const srcTag: React.CSSProperties = { flexShrink: 0, fontSize: 11, color: "var(--text-muted)", background: "var(--surface-2)", padding: "2px 8px", borderRadius: 999 };
