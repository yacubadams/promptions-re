# RE Interview Assistant

A human-in-the-loop requirements-elicitation workbench powered by Claude.
Standalone app — its own repo, its own dependencies, shares nothing with other projects.

The tool turns a stakeholder interview into structured, traceable requirements
through staged LLM calls, where a human reviews and approves at every gate.
No requirement ever reaches the output without a person accepting it.

## Run it

```bash
yarn install          # or: npm install
cp .env.example .env
# open .env, set VITE_ANTHROPIC_API_KEY=sk-ant-...
yarn dev              # serves on http://localhost:3006
```

Restart `yarn dev` after editing `.env` — Vite only reads it at startup.

### Shareable mode (key stays server-side)
Instead of the direct key, set `VITE_PROXY_URL=/api/messages` and
`ANTHROPIC_API_KEY=sk-ant-...` in `.env`, then run the proxy alongside the app:

```bash
yarn proxy            # key-holding proxy on :8787
yarn dev              # app on :3006, proxies /api -> :8787
```

## How it works

- **Stage 1 — Interview.** Transcript is captured (manual entry today; a speaker-
  diarization adapter can slot in later behind the same `Turn` model).
- **Stage 2 — Elicitation.** One scoped Claude call extracts candidate goals, gaps,
  obstacles, and open issues. Every item's trace is verified against the transcript;
  anything not verbatim is flagged as ungrounded, never presented as fact. The human
  accepts / edits / rejects each item. The gate to Stage 3 opens only when all are
  reviewed.
- **Stage 3 — Goals.** Accepted items carry forward. (Stage 4 drafting is the next build.)

## The Promptions concept

The LLM proposes; ephemeral controls appear per item; the human decides. That pattern
is built in locally (the accept/edit/reject review controls), not imported — so this
app stays fully self-contained.

## Safety properties

- **No ungrounded approvals.** Trace grounding is enforced in code, not just prompted.
- **Human gates.** The LLM never writes to the approved record; a person crosses every gate.
- **Append-only audit.** Each review is recorded with approver + timestamp.

## Stack
React 18 · TypeScript · Vite · Immer · Claude (Anthropic) via a self-contained adapter.
