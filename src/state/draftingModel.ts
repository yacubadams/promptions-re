import { produce } from "immer";
import { DraftedStory, DraftingStage, QualityInUse, ReviewStatus } from "../types";

export const emptyDrafting = (): DraftingStage => ({ stories: [], reviews: [], llmCallCount: 0 });

export const setStories = (stage: DraftingStage, stories: DraftedStory[]): DraftingStage =>
    produce(stage, (d) => {
        d.stories = stories;
        d.llmCallCount += 1;
    });

// Apply the Stage 5 quality-in-use grades to the drafted stories.
export const applyQuality = (
    stage: DraftingStage,
    grades: Record<string, QualityInUse>,
): DraftingStage =>
    produce(stage, (d) => {
        for (const s of d.stories) {
            if (grades[s.id]) {
                s.quality = grades[s.id];
                s.qualityStale = false;
            }
        }
        d.llmCallCount += 1;
    });

// Record a human review; live status and the append-only audit move together.
export const reviewStory = (
    stage: DraftingStage,
    id: string,
    status: ReviewStatus,
    approver: string,
    note?: string,
): DraftingStage =>
    produce(stage, (d) => {
        const s = d.stories.find((x) => x.id === id);
        if (!s) return;
        s.status = status;
        d.reviews.push({ candidateId: id, status, approver, ts: Date.now(), note });
    });

export const draftingGateOpen = (stage: DraftingStage): boolean =>
    stage.stories.length > 0 && stage.stories.every((s) => s.status !== "pending");

export const remainingStories = (stage: DraftingStage): number =>
    stage.stories.filter((s) => s.status === "pending").length;

// What crosses into the approved baseline: accepted or edited stories.
export const approvedStories = (stage: DraftingStage): DraftedStory[] =>
    stage.stories.filter((s) => s.status === "accepted" || s.status === "edited");

// Inline edit of a story's fields; records an "edited" review (append-only).
export const editStory = (
    stage: DraftingStage,
    id: string,
    patch: { role: string; want: string; soThat: string },
    approver: string,
): DraftingStage =>
    produce(stage, (d) => {
        const s = d.stories.find((x) => x.id === id);
        if (!s) return;
        s.role = patch.role.trim() || s.role;
        s.want = patch.want.trim() || s.want;
        s.soThat = patch.soThat.trim() || s.soThat;
        s.status = "edited";
        if (s.quality) s.qualityStale = true; // grades no longer reflect the text
        d.reviews.push({ candidateId: id, status: "edited", approver, ts: Date.now() });
    });

// Does a story carry an unresolved failing grade (graded, not stale)?
export const storyFails = (s: DraftedStory): string[] => {
    if (!s.quality || s.qualityStale) return [];
    const out: string[] = [];
    if (s.quality.implement.grade === "fail") out.push("implement");
    if (s.quality.verify.grade === "fail") out.push("verify");
    if (s.quality.maintain.grade === "fail") out.push("maintain");
    return out;
};

// Undo a story review: back to "pending", logged as a reversal (append-only).
export const undoReviewStory = (
    stage: DraftingStage,
    id: string,
    approver: string,
): DraftingStage =>
    produce(stage, (d) => {
        const s = d.stories.find((x) => x.id === id);
        if (!s || s.status === "pending") return;
        s.status = "pending";
        d.reviews.push({ candidateId: id, status: "pending", approver, ts: Date.now() });
    });

// Has the quality pass been run on every story that could reach the spec?
// (Rejected stories are excluded; edited-after-grading stories count as stale.)
export const qualityComplete = (stage: DraftingStage): boolean => {
    const relevant = stage.stories.filter((s) => s.status !== "rejected");
    return relevant.length > 0 && relevant.every((s) => s.quality && !s.qualityStale);
};

// Grading is MANDATORY before advancing: the gate opens only when every story
// is reviewed AND the quality pass covers them all (fresh).
export const exportGateOpen = (stage: DraftingStage): boolean =>
    draftingGateOpen(stage) && qualityComplete(stage);
