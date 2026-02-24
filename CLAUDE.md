# Self-Reflection App

A privacy-focused Electron desktop app that captures window activity, collects voluntary feeling logs, and uses AI to generate behavioral analysis reports — helping users understand not just what they did, but why.

---

## Documentation — When to Read What

Each document has a specific purpose. Read intentionally, not everything every time.

### `docs/phases/<phase-name>/phase.md` (Current Phase Spec)
- **When:** At the start of every session. This is the ONLY mandatory read every time.
- **Why:** It's the source of truth for what to build — scope, logic, decisions, acceptance criteria.
- **Rule:** Never implement outside its scope. If there are gaps or ambiguity in the phase MD, ask the user BEFORE writing any code.

### `docs/PRODUCT.md` (Product Decisions)
- **When:** When you need to understand WHY a feature exists, or when the phase MD references product behavior that needs broader context.
- **Why:** Contains the user flow rationale and key product decisions.
- **Not needed for:** Pure technical tasks like refactoring, test writing, or dependency updates.

### `docs/system_design.pdf` (Architecture)
- **When:** When implementing architecture-level work — IPC channels, services, data model, database schema, or when making decisions about how components communicate.
- **Why:** Defines the system boundaries, data model, and service responsibilities.
- **Not needed for:** Pure UI work that doesn't touch the main process.

### `docs/design-system.md` (Design System)
- **When:** When building any UI. This is the constraint all phases must follow.
- **Why:** Ensures visual coherence across the entire app — colors, typography, spacing, overall feel.

### `docs/inspiration/` (Global UI Inspiration)
- **When:** Before building any UI for any phase. Check this folder to match the user's preferred style and feel.
- **Why:** Contains UI screenshots the user likes. Use these as visual direction across all phases — match the vibe, layout patterns, and aesthetic.
- Not tracked by git — local reference material only.

### `docs/GAPS.md` (Open Questions)
- **When:** After reading the current phase MD, before starting implementation. Check if any listed gaps for that phase are still unresolved.
- This file is a starting point, not exhaustive. Also look for gaps not listed here — if something in the phase MD is unclear or incomplete, raise it regardless of whether it's in GAPS.md.

---

## Tech Stack

- **Desktop framework:** Electron
- **UI framework:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **UI components:** 21st.dev MCP for polished components
- **Database:** SQLite (via better-sqlite3) — all data stored locally
- **AI provider:** Claude API (Anthropic)
- **AI billing model:** BYOK (Bring Your Own Key) — users enter their own API key, stored locally

---

## Workflow

### Phased approach
- The project is built in phases. Each phase lives in `docs/phases/<phase-name>/` with a `phase.md`.
- **Always read the current phase MD before doing any work.** It contains the scope, logic, decisions, and acceptance criteria.
- Never work outside the current phase's scope.
- Each phase ships with polished UI (design as we go, not functional-first).

### Before implementing a phase
1. Read the current `docs/phases/<phase-name>/phase.md`.
2. If there are **gaps or ambiguity** in the phase MD — ask the user BEFORE writing any code.
3. If you **disagree with a decision** in the phase MD — explicitly say so, explain what you'd suggest instead and why, and ask the user to explain their reasoning. Never silently override a decision.
4. If there are **multiple valid approaches** to implement something — present the options with trade-offs and let the user choose. Never pick on your own.
5. Never install new packages without mentioning it first.

---

## Testing & Feedback Loop

- **TDD for main process services** — session service, capture service logic, AI service prompt building and response parsing. Write tests first for pure business logic.
- **Chrome MCP for visual UI verification** — open the dev server in browser to verify the UI.
- **Manual checkpoint at each phase end** — user runs the Electron app and verifies behavior.
- **Screenshots for Electron-specific features** — floating window, system tray. User provides screenshots for review.

---

## Git Conventions

### Setup
- **Branch:** `main`

### Commit format
Conventional Commits:
```
feat: add intent input screen
fix: handle empty intent edge case
test: add session service unit tests
refactor: extract IPC handler registration
chore: update dependencies
```

### Commit timing
Commit after each self-contained logical unit of work. Small, frequent commits. Examples of one commit each:
- A database layer change
- A service with its logic
- An IPC channel wiring
- A UI screen or component
- A test suite

### Rules
- **Auto-push after every commit.**
- When the user creates or updates a phase MD, commit and push it immediately.
- Never commit API keys, secrets, or `.env` files.
- Never commit the SQLite database file (contains user capture data).
- Always stage specific files — never use `git add .` or `git add -A`.

---

## Code Conventions

- **Comments:** Minimal. Only add a comment when the code genuinely cannot explain itself. No obvious comments, no restating what the code does. If you need a comment, the first question is whether the code should be rewritten to be clearer.
