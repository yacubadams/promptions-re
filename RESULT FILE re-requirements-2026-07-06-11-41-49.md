# Requirements Export

**Generated:** 2026-07-06 11:41:49  ·  **14 approved** · 0 rejected · 0 pending

---

## Approved requirements (14)

### US-01 · accepted

**As a** Requirement Engineer, **I want** to receive real-time follow-up question recommendations from the system during an elicitation interview, **so that** I can ensure all required information is gathered without missing critical topics.

**Acceptance criteria**

- The system surfaces a follow-up question recommendation within the active interview session when a topic is detected as incomplete or ambiguous.
- Recommendations are presented at contextually appropriate moments during the conversation, not only at the end.
- The RE can act on or dismiss each recommendation without interrupting the interview flow.

**Quality in use**

- **Implement** `warn` · *unambiguous*: 'Real-time' and 'contextually appropriate moments' are undefined thresholds—a developer cannot determine the exact latency or trigger conditions required.
- **Verify** `warn` · *verifiable*: 'Incomplete or ambiguous topic' has no objective detection criteria, making it unclear how a tester would confirm the recommendation was correctly triggered.
- **Maintain** `pass` · *adequate*: The role, intent, and three acceptance conditions are clearly stated, giving a future RE enough context to revise the story safely.

> "The tool is like a mentor or consultant, who could at the right moment, give recommendations to ask follow up questions."
> *(Stakeholder)*

---

### US-02 · accepted

**As a** Requirement Engineer, **I want** the live follow-up recommendation feature to be active by default, with an option to deactivate it, **so that** I benefit from real-time guidance in standard interviews while retaining the ability to turn it off when the situation requires it.

**Acceptance criteria**

- On starting a new interview session, live feedback is enabled by default without any manual configuration.
- A clearly visible toggle allows the RE to deactivate live feedback before or during a session.
- When live feedback is deactivated, no real-time recommendations are shown until it is re-enabled.

**Quality in use**

- **Implement** `pass` · *adequate*: Default-on behaviour, a visible toggle, and the off-state behaviour are all specified clearly enough for a developer to implement without guessing.
- **Verify** `pass` · *verifiable*: Each AC is binary and observable: default state on session start, presence of a toggle, and absence of recommendations when disabled are all directly testable.
- **Maintain** `pass` · *adequate*: The feature scope is narrow and self-contained, so a future RE can safely change the default or toggle behaviour without ambiguity.

> "Tool should stick to live meeting, but there is option to deactivate live feedback, the live direct feedback feature is default though."
> *(Stakeholder)*

---

### US-03 · accepted

**As a** Requirement Engineer, **I want** the system to generate a comprehensive interview summary that captures more detail than a human note-taker would produce, **so that** the entire team can rely on the summary as a complete and valuable record of what was discussed.

**Acceptance criteria**

- The generated summary contains all key decisions, open questions, and requirements topics identified during the interview.
- A team member who did not attend the interview can reconstruct the full discussion context from the summary alone.
- The summary is available to all authorised team members immediately after the session ends.

**Quality in use**

- **Implement** `fail` · *unambiguous*: 'More detail than a human note-taker would produce' and 'comprehensive' are subjective comparisons with no measurable specification, leaving a developer with no concrete implementation target.
- **Verify** `fail` · *verifiable*: AC2 ('reconstruct the full discussion context') is a subjective human judgement with no objective pass/fail criterion a tester can apply consistently.
- **Maintain** `warn` · *complete*: The story omits format, length, or structure requirements for the summary, which a future RE would need to add before safe modification.

> "the summary of the interview are sometimes insufficient, so the tool needs to create as much as a summary that are valuable to the whole team."
> *(Stakeholder)*

---

### US-04 · accepted

**As a** Requirement Engineer, **I want** every system suggestion to include a traceable reference to the specific part of the conversation that triggered it, **so that** I can verify the basis of each suggestion and maintain a clear audit trail.

**Acceptance criteria**

- Each suggestion displayed by the system is accompanied by a reference (e.g., timestamp or quoted excerpt) pointing to the conversation segment that grounded it.
- Clicking or selecting the reference navigates the RE to the corresponding part of the transcript.
- A suggestion without a valid conversation reference is not shown to the user.

**Quality in use**

- **Implement** `pass` · *adequate*: The three ACs specify reference format examples, navigation behaviour, and suppression of unreferenced suggestions—sufficient for a developer to build against.
- **Verify** `pass` · *verifiable*: All three ACs are objectively testable: presence of a reference, navigation on selection, and non-display of unreferenced suggestions can each be confirmed mechanically.
- **Maintain** `pass` · *adequate*: The audit-trail rationale and reference mechanism are clearly documented, allowing a future RE to extend or modify traceability rules safely.

> "Tools make suggestions based on discussion between interviewers, and the suggestions always have references to which part of conversation/discussion being made."
> *(Stakeholder)*

---

### US-05 · accepted

**As a** Requirement Engineer, **I want** the system to detect repeated patterns across suggestions and consolidate them so that only deduplicated, non-redundant recommendations are presented, **so that** I am not overwhelmed by unnecessary repetitions of the same underlying issue.

**Acceptance criteria**

- When two or more suggestions address the same underlying pattern, the system merges them into a single consolidated recommendation.
- The consolidated recommendation clearly indicates how many original suggestions it represents.
- No duplicate suggestions for the same detected issue appear in the recommendation list within a single session.

**Quality in use**

- **Implement** `warn` · *unambiguous*: 'Same underlying pattern' is not defined—a developer cannot determine the similarity metric or threshold that triggers consolidation.
- **Verify** `warn` · *verifiable*: Without a defined similarity criterion, a tester cannot objectively decide whether two suggestions address the 'same' pattern and should have been merged.
- **Maintain** `pass` · *adequate*: The deduplication intent and the count-display requirement are clear enough for a future RE to refine the similarity definition without misunderstanding the goal.

> "the tool needs to be able to connect the pattern of the issue, so that there will be no unnecessary repetition."
> *(Stakeholder)*

---

### US-06 · accepted

**As a** Requirement Engineer, **I want** the system to detect and explicitly flag conflicting suggestions so that contradictions can be resolved through follow-up questions, **so that** I can address contradictions before they propagate into the requirements specification.

**Acceptance criteria**

- When two suggestions contradict each other, the system labels both as conflicting and groups them visually.
- The system proposes at least one follow-up question aimed at resolving the detected conflict.
- The RE can mark a conflict as resolved, which removes the conflict flag from the affected suggestions.

**Quality in use**

- **Implement** `warn` · *unambiguous*: 'Contradict each other' is not operationally defined—a developer has no rule or criterion for what constitutes a contradiction between suggestions.
- **Verify** `warn` · *verifiable*: A tester cannot objectively construct a conflict test case without knowing the detection logic, making AC1 difficult to verify reliably.
- **Maintain** `pass` · *adequate*: The visual grouping, follow-up question proposal, and resolution flag are clearly described, giving a future RE enough structure to refine conflict rules.

> "Tools should handle conflicting suggestions and be able to ask follow up questions."
> *(Stakeholder)*

---

### US-07 · accepted

**As a** Requirement Engineer, **I want** the system to operate as an intelligent layer that reads from and interacts with existing DevOps tools, databases, and legal artefacts without modifying them, **so that** the integrity and legal validity of all existing artefacts are preserved.

**Acceptance criteria**

- The system can query and display information from connected DevOps tools and data sources during a session.
- No write, update, or delete operation is performed on any existing artefact by the system automatically.
- An audit log confirms that all interactions with external sources were read-only.

**Quality in use**

- **Implement** `warn` · *complete*: The AC lists no specific DevOps tools, protocols, or authentication methods, leaving a developer unable to determine the scope and integration mechanism.
- **Verify** `pass` · *verifiable*: Read-only behaviour is objectively testable via the audit log AC, and the absence of write/update/delete operations can be confirmed by log inspection.
- **Maintain** `warn` · *complete*: The list of 'existing DevOps tools, databases, and legal artefacts' is unspecified, so a future RE cannot safely determine what integrations are in or out of scope.

> "Nothing is automatically changed in the current or precious artifacts that were stored, there is a legal aspect to it. Cannot alter automatically."
> *(Stakeholder)*

---

### US-08 · accepted

**As a** Requirement Engineer, **I want** new artefacts produced during or after an interview to be added to the existing sources of truth (backlog, model, SharePoint) without overwriting prior entries, **so that** the knowledge base grows incrementally while historical records remain intact.

**Acceptance criteria**

- A newly created artefact is appended to the designated source of truth as a new entry.
- No existing entry in the backlog, model, or SharePoint is modified or deleted as a result of adding a new artefact.
- The system confirms successful addition and displays the new entry alongside the unchanged historical entries.

**Quality in use**

- **Implement** `warn` · *complete*: The story names 'backlog, model, SharePoint' but specifies no API, connection method, or data format, leaving integration mechanics undefined for a developer.
- **Verify** `pass` · *verifiable*: AC2 (no existing entry modified or deleted) and AC3 (confirmation and display of new entry alongside historical entries) are observable and mechanically testable.
- **Maintain** `warn` · *complete*: The enumeration of target sources is open-ended ('backlog, model, SharePoint') with no exhaustive list or extension rule, making future scope changes risky.

> "source of truth is backlog, model and share points, if there are new artifacts we just add up to it."
> *(Stakeholder)*

---

### US-09 · accepted

**As a** Requirement Engineer, **I want** the system to maintain a detailed change log for each interview session that records who accessed it and what actions were taken, **so that** developers and authorised team members have full visibility into the history of the session beyond a simple project log.

**Acceptance criteria**

- Every access event and action (e.g., suggestion accepted, note added) is recorded with a timestamp and the identity of the actor.
- The change log is accessible to authorised developers and team members, not restricted to project managers only.
- The log is immutable; existing entries cannot be edited or deleted after they are written.

**Quality in use**

- **Implement** `pass` · *adequate*: Timestamp, actor identity, immutability, and access-control rules are all specified, giving a developer clear implementation targets.
- **Verify** `pass` · *verifiable*: All three ACs are mechanically testable: log entry content, role-based access, and immutability (attempt to edit/delete and confirm rejection) can each be verified objectively.
- **Maintain** `pass` · *adequate*: The story clearly separates the change log from the project log and states the access and immutability constraints, making future changes safe.

> "Needs approval, needs a log of changes in interview, who is accessible to the developer, not only the 'project log'."
> *(Stakeholder)*

---

### US-10 · accepted

**As a** Requirement Engineer, **I want** all generated requirements and suggestions to be clearly grounded in conversation content and flagged when they lack sufficient evidential support, **so that** hallucinated or fabricated requirements cannot be inadvertently approved by stakeholders.

**Acceptance criteria**

- Each generated requirement displays its supporting evidence from the transcript; requirements with no traceable evidence are marked with a prominent warning.
- The approval workflow blocks final approval of any requirement carrying an unresolved hallucination warning.
- A tester can introduce a requirement with no transcript basis and verify that the system flags it before approval.

**Quality in use**

- **Implement** `warn` · *unambiguous*: 'Sufficient evidential support' is not quantified—a developer cannot determine the threshold of transcript evidence required to suppress the hallucination warning.
- **Verify** `pass` · *verifiable*: AC3 explicitly provides a concrete test procedure (introduce a requirement with no transcript basis and verify flagging), making this directly executable.
- **Maintain** `pass` · *adequate*: The anti-hallucination rationale, warning mechanism, and approval-blocking rule are clearly stated, allowing a future RE to adjust thresholds without misunderstanding intent.

> "People approve hallucination requirements; this has to be avoided, this is the worst case. This will jeopardize the 'main goals'"
> *(Stakeholder)*

---

### US-11 · accepted

**As a** Requirement Engineer, **I want** the system to support interview sessions with up to five concurrent participants, **so that** typical elicitation meetings involving a small group of stakeholders are fully covered.

**Acceptance criteria**

- A session can be configured with between one and five named participants.
- The system correctly attributes statements and suggestions to the appropriate participant when multiple speakers are active.
- Attempting to add a sixth participant is prevented and an informative message is shown.

**Quality in use**

- **Implement** `pass` · *adequate*: The participant range (1–5), speaker attribution requirement, and sixth-participant rejection with message are all precisely specified for implementation.
- **Verify** `pass` · *verifiable*: Each AC is directly testable: configure sessions with 1 and 5 participants, verify attribution, and confirm the sixth-participant error message appears.
- **Maintain** `pass` · *adequate*: The numeric boundary and attribution requirement are unambiguous, so a future RE can safely raise or lower the participant limit.

> "Maximum 4-5 people during one interview."
> *(Stakeholder)*

---

### US-12 · accepted

**As a** Requirement Engineer, **I want** the system to be pre-educated with general domain knowledge by default so that it operates meaningfully without requiring manual configuration or feeding, **so that** I can start using the tool immediately without an extensive setup phase.

**Acceptance criteria**

- On first launch, the system can generate contextually relevant follow-up questions for a standard RE elicitation scenario without any prior user configuration.
- The system does not prompt the user to upload or provide background knowledge before the first session.
- A baseline set of domain assumptions is verifiably present in the system at installation time.

**Quality in use**

- **Implement** `warn` · *unambiguous*: 'General domain knowledge' and 'baseline set of domain assumptions' are not specified—a developer cannot determine what knowledge content must be pre-loaded.
- **Verify** `warn` · *verifiable*: AC3 requires a 'verifiably present' baseline, but there is no defined list or test oracle against which a tester can confirm the correct knowledge is present.
- **Maintain** `fail` · *complete*: The story contains no definition of scope, source, or update process for the pre-loaded domain knowledge, making it unsafe for a future RE to modify without risking regression.

> "the system should make perfect sense by default, like already pre educated by default."
> *(Stakeholder)*

---

### US-13 · accepted

**As a** Requirement Engineer, **I want** the system to comply with applicable German and European Union regulations when processing and storing interview data, **so that** the tool can be legally deployed and used by Germany-based companies without regulatory risk.

**Acceptance criteria**

- A compliance checklist referencing the relevant German and EU regulations is produced and reviewed before the system is deployed.
- The system does not transfer personal or confidential interview data in a manner that violates identified regulatory requirements.
- A legal review sign-off is required before the system goes into production use.

**Quality in use**

- **Implement** `warn` · *complete*: The AC defers all technical specifics to a compliance checklist that does not yet exist, so a developer has no concrete data-handling or storage rules to implement against.
- **Verify** `warn` · *verifiable*: Verification depends on a legal review sign-off and an unproduced checklist, making automated or repeatable test confirmation impossible.
- **Maintain** `warn` · *complete*: Citing 'applicable German and EU regulations' without naming them (e.g., GDPR, BDSG) means a future RE cannot determine whether new regulations fall in scope.

> "following German regulation"
> *(Stakeholder)*

---

### US-14 · accepted

**As a** Requirement Engineer, **I want** interview transcripts to be stored in a local database rather than a cloud service, **so that** data residency and organisational control requirements are satisfied.

**Acceptance criteria**

- All interview transcripts are written exclusively to a locally hosted database instance.
- No transcript data is transmitted to or stored in an external cloud storage service.
- The local storage location is configurable by an administrator without modifying application source code.

**Quality in use**

- **Implement** `pass` · *adequate*: 'Locally hosted database', prohibition on external cloud transmission, and admin-configurable storage path without source-code changes are all concrete implementation constraints.
- **Verify** `pass` · *verifiable*: All three ACs are objectively testable: inspect write destination, monitor network traffic for cloud transmissions, and confirm configuration change without code edit.
- **Maintain** `pass` · *adequate*: The data-residency rationale and configurable-path requirement are clearly stated, allowing a future RE to safely revise storage or configuration rules.

> "The database (interview transcript) should be somewhere local, not cloud,, actually he doesnt really care! :)"
> *(Stakeholder)*

---

## Change log

- `2026-07-06 10:47:28`  elicitation/ec-mr93eoq4-7 · **edited** by RE
- `2026-07-06 10:49:57`  elicitation/hc-mr93lmvs-0 · **edited** by RE
- `2026-07-06 10:50:06`  elicitation/ec-mr93eoq4-6 · **accepted** by RE
- `2026-07-06 10:50:07`  elicitation/ec-mr93eoq4-5 · **accepted** by RE
- `2026-07-06 10:50:09`  elicitation/ec-mr93eoq3-4 · **accepted** by RE
- `2026-07-06 10:50:10`  elicitation/ec-mr93eoq3-3 · **accepted** by RE
- `2026-07-06 10:50:11`  elicitation/ec-mr93eoq3-2 · **accepted** by RE
- `2026-07-06 10:50:13`  elicitation/ec-mr93eoq3-1 · **accepted** by RE
- `2026-07-06 10:50:14`  elicitation/ec-mr93eoq3-0 · **accepted** by RE
- `2026-07-06 10:53:47`  drafting/US-01 · **accepted** by RE
- `2026-07-06 10:53:49`  drafting/US-02 · **accepted** by RE
- `2026-07-06 10:54:19`  drafting/US-03 · **accepted** by RE *(accepted despite unresolved fail: implement, verify)*
- `2026-07-06 10:54:22`  drafting/US-04 · **accepted** by RE
- `2026-07-06 10:54:25`  drafting/US-05 · **accepted** by RE
- `2026-07-06 10:54:27`  drafting/US-06 · **accepted** by RE
- `2026-07-06 10:54:29`  drafting/US-07 · **accepted** by RE
- `2026-07-06 10:54:32`  drafting/US-08 · **accepted** by RE
- `2026-07-06 10:54:34`  drafting/US-09 · **accepted** by RE
- `2026-07-06 10:54:37`  drafting/US-10 · **accepted** by RE
- `2026-07-06 10:54:39`  drafting/US-11 · **accepted** by RE
- `2026-07-06 10:54:43`  drafting/US-12 · **accepted** by RE *(accepted despite unresolved fail: maintain)*
- `2026-07-06 10:54:45`  drafting/US-13 · **accepted** by RE
- `2026-07-06 10:54:47`  drafting/US-14 · **accepted** by RE
