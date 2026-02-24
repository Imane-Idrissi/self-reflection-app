# Phase: Feeling Log

## Goal

Let the user voluntarily log how they feel at any point during a session via a floating button that persists over all other apps. Feeling logs give the AI the "why" behind behavior — without them, the AI can only describe what happened, not interpret it.

---

## User Flow

1. When a session becomes active (recording starts), a floating button appears on screen — a small circular button that sits on top of all other apps.
2. User clicks the floating button. A compact input card expands from the button.
3. User types how they feel in a free-text field. No categories, no mood pickers, no templates — just raw text.
4. User clicks the submit button (pressing Enter moves to a new line).
5. A brief checkmark confirmation appears, then the input collapses back to the floating button after 1.5 seconds.
6. The feeling is stored in SQLite with a timestamp.
7. The floating button stays visible. User can log feelings as many times as they want throughout the session.
8. When the session is paused, the floating button remains visible but in a muted state — the user can still log feelings during breaks.
9. When the session ends, the floating button disappears.

---

## Decisions

- **The floating button is a separate Electron `BrowserWindow` — frameless, transparent, always-on-top.** This is the only way to float UI over other desktop apps. The main app window cannot do this.
- **Position: bottom-right corner of the primary screen, draggable.** 24px margin from edges. The user can drag it anywhere on screen. Drag position is not saved between sessions — it resets to bottom-right every time a new session starts.
- **Button: 48px circle. Expanded card: 320px wide, appears above the button.** If the button is near the top of the screen, the card appears below instead.
- **Text input: multi-line, no character limit.** The field grows as the user types (up to ~4 visible lines, then scrolls). The card has a max height to avoid taking over the screen. Enter adds a newline — submit is via the button only. Cannot submit empty or whitespace-only text.
- **No prompts, no reminders, no notifications.** The app never asks the user to log feelings. The button is simply available. Prompting would feel surveillance-like and undermine trust.
- **The floating button does not exist when no session is active.** It is created when a session starts and destroyed when a session ends. If the user opens the app with no active session, there is no floating button.
- **Muted state during pause:** The button's opacity drops to ~50% and the background color shifts from `primary-500` to `text-tertiary`. Still clickable and fully functional — the muted appearance just signals that recording is paused, not that the button is disabled.
- **Clicking the button while the card is open toggles it closed.** Same as clicking outside or pressing Escape — discards any typed text.
- **The main process owns the floating window's lifecycle and state.** The main process creates the floating window and passes the current `session_id` to it. When the session state changes (active → paused → ended), the main process sends an update to the floating window via IPC so it can adjust its appearance or close.
- **Focus returns to the previously active app after submitting or dismissing.** The floating window should not disrupt the user's workflow.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Empty or whitespace-only text** | Submit button is disabled. |
| **Very long text entry** | The input field scrolls after ~4 visible lines. The card has a max height and does not grow beyond it. |
| **User clicks the button during the 1.5s confirmation** | Ignore. The confirmation must finish before the button is interactive again. |
| **Multiple monitors** | The floating button appears on the primary display. If dragged, it stays within the bounds of its display. |
| **App crashes while the input card is open** | Unsubmitted text is lost. No draft saving. |
| **Session ends while the input card is open** | Discard unsubmitted text and close the floating window. The user ended the session, not submitted the feeling. |

---

## Services

### Session Service

**Existing service, extended in this phase.**

New responsibilities:
- On `feeling:create`: validate text (non-empty), write to `feeling` table in SQLite with `session_id` and current timestamp
- Return the created feeling record to the renderer for confirmation

### Floating Window Management

**Handled in the main process, not a separate "service" but new functionality.**

Responsibilities:
- Create the floating `BrowserWindow` when a session becomes active
- Destroy the floating window when a session ends
- Manage the window's `alwaysOnTop` and focus behavior
- Handle the drag positioning logic
- Listen for session status changes to show/hide/mute the floating button

---

## Data

### Tables touched

**feeling** (create)
| Field | When |
|-------|------|
| `feeling_id` (UUID) | Auto-generated on each submission |
| `session_id` (UUID, FK → session) | Set to the active session's ID |
| `text` (TEXT, NOT NULL) | The user's free-text feeling log |
| `created_at` (TEXT, ISO 8601, NOT NULL) | Timestamp of when the feeling was logged |

### IPC Channels

**`feeling:create`**
- Request: `{ session_id: string, text: string }`
- Response: `{ success: boolean, feeling_id: string }`
- Logic: Validate that `text` is non-empty. Validate that `session_id` refers to an active or paused session. Write to `feeling` table. Return the created feeling's ID.

---

## Acceptance Criteria

- [ ] A floating circular button appears on screen when a session is active
- [ ] The floating button sits on top of all other apps (VS Code, Chrome, etc.)
- [ ] Clicking the button expands a compact text input card
- [ ] User can type free text and submit it
- [ ] Enter adds a newline, submit is via the button only
- [ ] Empty text cannot be submitted (submit button disabled)
- [ ] After submission, a checkmark confirmation appears for 1.5 seconds, then the card collapses
- [ ] The feeling is stored in SQLite with the correct `session_id`, `text`, and `created_at`
- [ ] Clicking outside the expanded card, pressing Escape, or clicking the button again all dismiss it without submitting
- [ ] The floating button is draggable to any position on screen
- [ ] The floating button remains visible during paused sessions with muted appearance (reduced opacity, color shift)
- [ ] The floating button disappears when the session ends
- [ ] No floating button exists when there is no active session (app launch, between sessions)
- [ ] Long text entries scroll within the input field — the card has a max height
- [ ] Focus returns to the previously active app after submitting or dismissing the input
- [ ] The floating button and expanded card follow the design system (colors, typography, shadows, radius)
