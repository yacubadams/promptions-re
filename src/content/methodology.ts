// Single source of truth for the tool's self-explanation. Both the always-on
// Guide (header) and the "How is quality measured?" popup (quality stage) draw
// from here, so the methodology text can never drift between them.

export interface GlossaryTerm {
    term: string;
    def: string;
}

export const QUALITY_METHODOLOGY = {
    principle:
        "Following Femmer & Vogelsang's ABRE-QM, quality is not an abstract property of a requirement (\u201cis it well written?\u201d). It is fitness for the activities its readers perform next. A requirement is only as good as its usefulness to the people who consume it.",
    activities: [
        { name: "Implement", q: "Could a developer build exactly this, as written, without guessing?" },
        { name: "Verify", q: "Could a tester objectively confirm it is done, from the acceptance criteria?" },
        { name: "Maintain", q: "Could a future engineer understand and safely change it later?" },
    ],
    grades: "Each activity gets its own grade (pass, warn, or fail), because a requirement can be perfectly implementable yet impossible to verify.",
    cpre: "Each grade names the classic quality criterion it turns on (unambiguous, verifiable, complete, consistent, feasible, atomic), from the CPRE / ISO 29148 vocabulary. The activity lens decides whether the issue matters; the CPRE criterion names what the issue is. So \u201cverify: fail, verifiable\u201d means a tester can't confirm this, because it isn't verifiable.",
    handledElsewhere:
        "Criteria the tool already guarantees structurally are not re-graded here: traceable (every item carries a verbatim quote), correct (grounded to what was actually said), and necessary (nothing advances without your approval).",
    sources:
        "Sources: Femmer & Vogelsang, \u201cRequirements Quality Is Quality in Use\u201d (IEEE Software, 2019); IREB CPRE Foundation / ISO 29148 quality characteristics.",
};

export const FLOW_STEPS = [
    { n: "1", t: "Interview", d: "Capture the stakeholder interview as transcript turns, typed or dictated." },
    { n: "2", t: "Elicitation", d: "Claude proposes candidate goals, gaps, obstacles and open issues; you accept, edit, reject, or add your own." },
    { n: "3", t: "Goal model", d: "Approved items carry forward as the goals the requirements must satisfy." },
    { n: "4", t: "Drafting", d: "Goals become user stories with acceptance criteria, in Corona-Warn-App format." },
    { n: "5", t: "Quality pass", d: "Each story is graded on implement / verify / maintain before it can be exported." },
    { n: "6", t: "Export", d: "Approved requirements are exported (readable .md and complete .json) to paste into your system of record." },
];

export const GLOSSARY: GlossaryTerm[] = [
    { term: "Grounding", def: "Every item must tie to a verbatim quote from the transcript. The tool verifies the quote is a real substring; hallucinations are rejected in code, not trusted from the model." },
    { term: "Trace", def: "The specific transcript quote (and speaker) an item is grounded to. Its presence is what makes a requirement auditable back to what was actually said." },
    { term: "Elicitation candidate", def: "A finding proposed in Stage 2 (a goal, gap, obstacle, or open issue) before it has been reviewed by you." },
    { term: "Goal / Gap / Obstacle / Open issue", def: "The four kinds of elicitation finding: what the stakeholder wants, what's missing, what stands in the way, and what remains undecided." },
    { term: "Human-added", def: "An item you originated yourself rather than the LLM. If you attach a transcript quote it is grounded like any other; if not, it is honestly labeled as having no transcript basis." },
    { term: "Goal model", def: "The set of approved elicitation items that the drafted requirements must satisfy." },
    { term: "User story", def: "A requirement in the form \u201cAs a <role>, I want <goal>, so that <reason>\u201d (Corona-Warn-App scoping format)." },
    { term: "Acceptance criteria", def: "The concrete, checkable conditions that define when a user story is satisfied. They are the basis for verification." },
    { term: "Quality in use", def: "The ABRE-QM principle that a requirement's quality is its fitness for the activities its readers perform, not an abstract property of the text." },
    { term: "Implement / Verify / Maintain", def: "The three downstream activities each story is graded on: can it be built, can it be tested, can it be safely changed later." },
    { term: "CPRE criteria", def: "Classic quality characteristics (unambiguous, verifiable, complete, consistent, feasible, atomic) used as the named justification for each activity grade." },
    { term: "Human-in-the-loop", def: "The LLM only proposes; nothing enters the approved record without your explicit decision. You own the record." },
    { term: "Append-only change log", def: "Every decision (accept, edit, reject, undo) is recorded and never erased. An undo adds a reversal entry rather than deleting history, preserving the audit trail." },
    { term: "Scope prefix (batch)", def: "Large interviews are worked in scoped batches. Each batch carries a prefix (e.g. BOOK, ACCESS) so its requirement IDs (BOOK-01, ACCESS-01) stay stable and self-describing, following the Corona-Warn-App convention." },
    { term: "Conflict mapping", def: "Claude flags requirements that contradict each other, within a batch or across loaded batches, grounded to the two real requirement IDs. It maps the conflict; you resolve it. The LLM never resolves conflicts itself." },
    { term: "Remediation loop", def: "When a story is flagged, you fix it against the specific criticism (the flags show while you edit), then re-check that one story to confirm the fix. A story edited after grading is marked stale until re-checked. You may also accept a flagged story deliberately, and the override is logged." },
    { term: "Export formats", def: "Two files, both local: a readable .md (approved requirements, acceptance criteria, traces and grades, for pasting into your system of record) and a complete .json (the full audit, including elicitation, rejected items and the change log, for re-import)." },
];
