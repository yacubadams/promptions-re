// Domain model for the RE Interview Assistant.

export type SpeakerRole = "interviewer" | "stakeholder";

export interface Turn {
    id: string;
    speaker: string; // e.g. "Sara (Ops)", "Tom (Facilities)", "Interviewer"
    role: SpeakerRole;
    text: string;
    ts: number;
}

export type SuggestionStatus = "pending" | "asked" | "withdrawn" | "dismissed";

// One grounded follow-up surfaced at a turn boundary.
export interface Suggestion {
    id: string;
    boundaryTurnId: string; // the turn after which it was raised
    question: string;
    rationale: string;
    trace: string; // VERBATIM quote from the transcript that motivates it
    coverageId?: string; // which coverage area it advances
    status: SuggestionStatus;
    ts: number;
}

export type CpreGrade = "pass" | "warn" | "fail";

// IREB CPRE quality dimensions, per requirement.
export interface CpreVerdict {
    complete: CpreGrade;
    unambiguous: CpreGrade;
    verifiable: CpreGrade;
    consistent: CpreGrade;
    notes: string;
}

export type SeslKind = "FR" | "QR" | "Constraint" | "OpenIssue" | "Glossary";

// A single SESL specification item, traced back to the transcript.
export interface SeslItem {
    id: string; // FR-01, QR-02, C-01, OI-01, G-01
    kind: SeslKind;
    statement: string; // SESL "shall" statement, constraint, issue, or glossary definition
    trace: string; // VERBATIM transcript quote (empty allowed only for derived glossary terms)
    cpre?: CpreVerdict;
}

export type CoverageStatus = "open" | "touched" | "covered";

export interface CoverageArea {
    id: string;
    label: string;
    status: CoverageStatus;
}

export interface ChangeLogEntry {
    ts: number;
    kind: string; // "turn", "suggestion", "withdraw", "spec", "cpre"
    detail: string;
}

// The single append-only interview record.
export interface InterviewModel {
    turns: Turn[];
    suggestions: Suggestion[];
    coverage: CoverageArea[];
    spec: SeslItem[];
    changeLog: ChangeLogEntry[];
}

// ---------------------------------------------------------------------------
// Stage 2 — Elicitation analysis (human-in-the-loop workbench)
// ---------------------------------------------------------------------------

export type ElicitationKind = "goal" | "gap" | "obstacle" | "openIssue";

// Review outcome for any candidate that passes a human gate.
export type ReviewStatus = "pending" | "accepted" | "edited" | "rejected";

// A single LLM-drafted elicitation candidate.
// `grounded` is set by OUR verification, never trusted from the model:
// a candidate is grounded only if its trace is a verbatim substring of the
// transcript. Ungrounded candidates are surfaced with a warning, not hidden.
export interface ElicitationCandidate {
    id: string;
    kind: ElicitationKind;
    statement: string;
    trace: string; // verbatim quote; empty when ungrounded
    traceSpeaker?: string; // resolved from the host turn
    traceTurnId?: string;
    grounded: boolean;
    humanAdded?: boolean; // true when the RE originated this item, not the LLM
    status: ReviewStatus;
    ts: number;
}

// Append-only audit record — this is the changelog Femmer asked for.
export interface ReviewEntry {
    candidateId: string;
    status: ReviewStatus;
    approver: string;
    ts: number;
    editedStatement?: string;
    note?: string; // e.g. "accepted despite unresolved fail: verify"
}

export interface ElicitationStage {
    candidates: ElicitationCandidate[];
    reviews: ReviewEntry[]; // append-only, never mutated
    llmCallCount: number;
}

// ---------------------------------------------------------------------------
// Transcript input layer — source-agnostic
// ---------------------------------------------------------------------------

// A named participant in the interview session.
export interface Participant {
    id: string; // "p1"
    name: string; // "Sara"
    org?: string; // "Ops"
    role: SpeakerRole;
}

// The raw unit any transcript source emits. A diarizer produces these with an
// ANONYMOUS speakerLabel ("Speaker 1"); manual entry produces them with the
// label already set to a participant id. Downstream code never sees these —
// they are mapped to Turn[] first.
export interface RawSegment {
    speakerLabel: string; // "Speaker 1" (anonymous) OR a participant id (manual)
    text: string;
    tStart?: number; // seconds — diarization only
    tEnd?: number;
}

// The "name the voices" result: anonymous label -> participant id.
export type SpeakerMap = Record<string, string>;

// ---------------------------------------------------------------------------
// Stage 4 — Requirements drafting (FR-11) + quality-in-use grading (FR-12)
// ---------------------------------------------------------------------------

// The three downstream activities a requirement must serve, per ABRE-QM.
// Quality is defined by fitness for these, not by abstract properties.
export type Activity = "implement" | "verify" | "maintain";

export type Grade = "pass" | "warn" | "fail";

// Each downstream activity gets its OWN grade, the specific quality criterion
// it turns on (free-form CPRE vocabulary, e.g. "unverifiable", "ambiguous",
// "incomplete", "adequate"), and its OWN reason. A grade is always traceable
// to the named criterion and justification behind it.
export interface ActivityGrade {
    grade: Grade;
    criterion: string; // the CPRE-style criterion this grade turns on
    reason: string; // one concrete sentence justifying this grade
}

export interface QualityInUse {
    implement: ActivityGrade;
    verify: ActivityGrade;
    maintain: ActivityGrade;
}

// A drafted requirement in Corona-Warn-App user-story form (FR-11).
export interface DraftedStory {
    id: string; // US-01, US-02 ...
    role: string; // "As a <role>"
    want: string; // "I want <goal>"
    soThat: string; // "so that <reason>"
    acceptanceCriteria: string[];
    trace: string; // verbatim transcript quote; empty when ungrounded
    traceSpeaker?: string;
    grounded: boolean; // verified in code, never trusted from the model
    quality?: QualityInUse; // filled by the Stage 5 grading pass
    qualityStale?: boolean; // true when edited after grading — grades need a re-check
    status: ReviewStatus;
    ts: number;
}

export interface DraftingStage {
    stories: DraftedStory[];
    reviews: ReviewEntry[]; // append-only audit (FR-14)
    llmCallCount: number;
}
