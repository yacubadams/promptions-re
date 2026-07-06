import { Participant, RawSegment, SpeakerMap, Turn } from "../types";

let seq = 0;
const uidTurn = () => `t-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const displayName = (p: Participant): string => (p.org ? `${p.name} (${p.org})` : p.name);

// Manual mode: segments already carry participant ids as their label, so the
// map is the identity.
export const identityMap = (roster: Participant[]): SpeakerMap =>
    Object.fromEntries(roster.map((p) => [p.id, p.id]));

/**
 * THE choke point. Every transcript source — manual entry today, speaker
 * diarization later — produces RawSegment[]. This is the ONLY function that
 * turns them into the Turn[] the rest of the pipeline consumes. Grounding,
 * gates, and drafting never know or care how the transcript was captured.
 *
 * An unmapped label (a voice the RE hasn't named yet) falls back to showing
 * the raw label rather than dropping the segment, so nothing is silently lost.
 */
export const segmentsToTurns = (
    segments: RawSegment[],
    roster: Participant[],
    speakerMap: SpeakerMap,
): Turn[] => {
    const byId = new Map(roster.map((p) => [p.id, p]));
    return segments
        .map((seg): Turn => {
            const pid = speakerMap[seg.speakerLabel];
            const p = pid ? byId.get(pid) : undefined;
            return {
                id: uidTurn(),
                speaker: p ? displayName(p) : seg.speakerLabel,
                role: p ? p.role : "stakeholder",
                text: seg.text.trim(),
                ts: Date.now(),
            };
        })
        .filter((t) => t.text.length > 0);
};

// Distinct anonymous labels a diarizer produced — drives the naming step.
export const detectSpeakers = (segments: RawSegment[]): string[] => [
    ...new Set(segments.map((s) => s.speakerLabel)),
];

// Build a roster + map from the naming step's per-label assignments.
export const buildRoster = (
    assignments: { label: string; name: string; org?: string; role: Participant["role"] }[],
): { roster: Participant[]; map: SpeakerMap } => {
    const roster: Participant[] = [];
    const map: SpeakerMap = {};
    assignments.forEach((a, i) => {
        const id = `p${i + 1}`;
        roster.push({ id, name: a.name.trim() || a.label, org: a.org?.trim() || undefined, role: a.role });
        map[a.label] = id;
    });
    return { roster, map };
};
