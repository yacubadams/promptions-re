import { ReactNode } from "react";

// A consistent header for every working stage: a prominent title clearly
// distinct from body content, an optional subtitle, and optional right-aligned
// actions. Using this everywhere keeps all stages visually aligned.
export function StageHeader({
    step,
    title,
    subtitle,
    actions,
}: {
    step?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}) {
    return (
        <header style={headerWrap}>
            <div style={{ flex: 1 }}>
                <div style={titleRow}>
                    {step && <span style={stepBadge}>{step}</span>}
                    <h2 style={titleText}>{title}</h2>
                </div>
                {subtitle && <p style={subtitleText}>{subtitle}</p>}
            </div>
            {actions && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{actions}</div>}
        </header>
    );
}

// A clear, animated processing state so the user knows the LLM is working.
export function LoadingBanner({ label }: { label: string }) {
    return (
        <div style={loadingWrap}>
            <span className="re-spinner" aria-hidden />
            <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{label}</span>
        </div>
    );
}

const headerWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "0.5px solid var(--border)",
    marginBottom: 4,
};
const titleRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const stepBadge: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-accent)",
    background: "var(--bg-accent)",
    padding: "3px 9px",
    borderRadius: 999,
};
const titleText: React.CSSProperties = {
    fontSize: 19,
    fontWeight: 600,
    margin: 0,
    color: "var(--text-primary)",
    lineHeight: 1.2,
};
const subtitleText: React.CSSProperties = {
    fontSize: 13,
    color: "var(--text-muted)",
    margin: "5px 0 0",
    lineHeight: 1.45,
};
const loadingWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "16px 18px",
    borderRadius: 12,
    background: "var(--surface-2)",
    border: "0.5px solid var(--border)",
};

// Shared tokens so cards, kind labels, and chips match across stages.
export const ui = {
    // --- one consistent button system, used everywhere ---
    // primary: the main action on a screen (filled, high contrast)
    btnPrimary: {
        fontSize: 13,
        fontWeight: 600,
        padding: "9px 16px",
        borderRadius: 8,
        border: "none",
        background: "var(--fill-accent)",
        color: "var(--on-accent)",
        cursor: "pointer",
    } as React.CSSProperties,
    // secondary: supporting actions (outlined, clearly a button but quieter)
    btnSecondary: {
        fontSize: 13,
        fontWeight: 500,
        padding: "8px 15px",
        borderRadius: 8,
        border: "1px solid var(--border-strong)",
        background: "var(--surface-1)",
        color: "var(--text-primary)",
        cursor: "pointer",
    } as React.CSSProperties,
    // danger: destructive actions (clear session) — clearly a button, signals caution
    btnDanger: {
        fontSize: 13,
        fontWeight: 500,
        padding: "8px 15px",
        borderRadius: 8,
        border: "1px solid var(--border-danger)",
        background: "var(--bg-danger)",
        color: "var(--text-danger)",
        cursor: "pointer",
    } as React.CSSProperties,
    // subtle: low-emphasis inline actions (undo, edit, delete) — text-forward
    btnSubtle: {
        fontSize: 12,
        fontWeight: 500,
        padding: "5px 11px",
        borderRadius: 7,
        border: "1px solid var(--border)",
        background: "transparent",
        color: "var(--text-secondary)",
        cursor: "pointer",
    } as React.CSSProperties,
    card: {
        background: "var(--surface-2)",
        border: "0.5px solid var(--border)",
        borderRadius: 12,
        padding: "15px 16px",
    } as React.CSSProperties,
    // Kind/label pill — larger and more legible than before.
    kindPill: (bg: string, fg: string): React.CSSProperties => ({
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: "0.02em",
        padding: "4px 12px",
        borderRadius: 999,
        background: bg,
        color: fg,
    }),
    statusPill: (bg: string, fg: string): React.CSSProperties => ({
        marginLeft: "auto",
        fontSize: 11.5,
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: 999,
        background: bg,
        color: fg,
    }),
    chip: {
        background: "transparent",
        border: "none",
        borderLeft: "2px solid var(--border-strong)",
        borderRadius: 0,
        padding: "2px 0 2px 9px",
        fontSize: 12,
        color: "var(--text-muted)",
        cursor: "default",
    } as React.CSSProperties,
    statement: {
        fontSize: 15,
        color: "var(--text-primary)",
        lineHeight: 1.55,
        margin: "12px 0 10px",
    } as React.CSSProperties,
};
