import { produce } from "immer";
import { ElicitationCandidate, ElicitationStage, ReviewStatus } from "../types";

export const emptyElicitation = (): ElicitationStage => ({
    candidates: [],
    reviews: [],
    llmCallCount: 0,
});

// Load a fresh batch of candidates from one LLM call.
export const setCandidates = (
    stage: ElicitationStage,
    candidates: ElicitationCandidate[],
): ElicitationStage =>
    produce(stage, (d) => {
        d.candidates = candidates;
        d.llmCallCount += 1;
    });

// Record a human review. The candidate's live status updates, AND an
// immutable audit entry is appended — the two are kept in step so the
// changelog can never disagree with the current state.
export const reviewCandidate = (
    stage: ElicitationStage,
    id: string,
    status: ReviewStatus,
    approver: string,
    editedStatement?: string,
): ElicitationStage =>
    produce(stage, (d) => {
        const c = d.candidates.find((x) => x.id === id);
        if (!c) return;
        c.status = status;
        if (status === "edited" && editedStatement) {
            c.statement = editedStatement;
        }
        d.reviews.push({
            candidateId: id,
            status,
            approver,
            ts: Date.now(),
            editedStatement: status === "edited" ? editedStatement : undefined,
        });
    });

// The gate to Stage 3 is open only when every candidate has been reviewed.
export const gateOpen = (stage: ElicitationStage): boolean =>
    stage.candidates.length > 0 && stage.candidates.every((c) => c.status !== "pending");

export const remainingToReview = (stage: ElicitationStage): number =>
    stage.candidates.filter((c) => c.status === "pending").length;

// What actually crosses into the goal model: accepted or edited items only.
export const promotedToGoalModel = (stage: ElicitationStage): ElicitationCandidate[] =>
    stage.candidates.filter((c) => c.status === "accepted" || c.status === "edited");

// Undo a review: the candidate returns to "pending", but the append-only log
// is NOT erased — a reversal entry is added, preserving the audit trail (FR-14).
export const undoReview = (
    stage: ElicitationStage,
    id: string,
    approver: string,
): ElicitationStage =>
    produce(stage, (d) => {
        const c = d.candidates.find((x) => x.id === id);
        if (!c || c.status === "pending") return;
        c.status = "pending";
        d.reviews.push({ candidateId: id, status: "pending", approver, ts: Date.now() });
    });

// Add a human-authored candidate. Grounding is still enforced: if a quote is
// given it must be a verbatim transcript substring (verified by the caller,
// which passes the resolved host turn); otherwise the item is honestly marked
// ungrounded. Either way it is flagged humanAdded and enters the same review gate.
export const addHumanCandidate = (
    stage: ElicitationStage,
    item: {
        kind: ElicitationCandidate["kind"];
        statement: string;
        trace: string;
        traceSpeaker?: string;
        traceTurnId?: string;
        grounded: boolean;
    },
    seq: number,
): ElicitationStage =>
    produce(stage, (d) => {
        d.candidates.push({
            id: `hc-${Date.now().toString(36)}-${seq.toString(36)}`,
            kind: item.kind,
            statement: item.statement.trim(),
            trace: item.trace,
            traceSpeaker: item.traceSpeaker,
            traceTurnId: item.traceTurnId,
            grounded: item.grounded,
            humanAdded: true,
            status: "pending",
            ts: Date.now(),
        });
    });
