# Phase: Session Management

## Goal

Give the user control over their session with pause, resume, and end actions. Add an auto-end safety net to prevent runaway sessions. Record session events (pauses, resumes) so the AI can account for gaps in capture data when generating the report.

---

## User Flow

### Pause and Resume

1. During active recording, the active session screen (built in Capture phase) is enhanced with a "Pause" button alongside the existing "End Session" button.
2. User clicks "Pause." Capture stops. The screen transitions to a paused state: the recording indicator stops breathing, a "Paused" label replaces the recording indicator, the elapsed timer freezes, and the Pause button becomes a "Resume" button.
3. User takes their break. The floating feeling button remains visible and functional (feelings can be logged during a pause).
4. User clicks "Resume." Capture restarts. The screen returns to the active state. A `resumed` event is recorded.
5. The user can pause and resume as many times as they want in a single session.

### End Session

6. User clicks "End Session" (available in both active and paused states).
7. A confirmation dialog appears: "End this session?" with "End Session" and "Cancel" buttons.
8. User confirms. Capture stops (if running). Session status updates to `"ended"`. A session end screen appears showing a brief session summary: total time, active time, paused time, number of captures, number of feeling logs.
9. The floating feeling button disappears.
10. A "Start New Session" button is available to return to the intent screen.

> **Note:** Report generation is NOT triggered in this phase. The session end screen is a simple summary. The Report phase enhances this flow to trigger report generation and display the full AI report instead.

### Auto-End

11. If a session accumulates 8 hours of active time (paused time does not count), the app auto-ends it.
12. At 7 hours 30 minutes of active time, a warning banner appears on the active session screen: "This session will auto-end in 30 minutes."
13. At 8 hours, the session auto-ends: capture stops, status updates to `"ended"`, `ended_by` is set to `"auto"`. The session end screen appears with the same summary.
14. On app launch, if a session exists with status `"active"` or `"paused"` (from a force-quit or crash), auto-end it immediately — set status to `"ended"`, `ended_by` to `"auto"`, `ended_at` to now.

---

## Decisions

- **Two separate buttons: Pause and End Session.** Not a dropdown, not a menu. Both should be immediately visible. Pause is more common (breaks are frequent); End is less frequent but must not be hidden.
- **Unlimited pauses per session.** No limit on how many times the user can pause and resume.
- **End Session always shows a confirmation dialog.** Ending is irreversible. A simple confirmation prevents accidental termination.
- **Auto-end: 8 hours of active time, with a warning at 7.5 hours.** Long enough for a full workday, short enough to prevent garbage data. Paused time does NOT count. At 7.5 hours, a non-intrusive warning banner appears on the active session screen. At 8 hours, the session auto-ends.
- **Cannot start a new session while one is active or paused.** Must end the current one first. One session at a time.
- **Session events record every pause and resume.** Each event is a row in `session_events` with the type and timestamp. This lets the AI understand gaps in capture data — "no captures from 12:00 to 12:45 because the user was on a lunch break" rather than "mysterious 45-minute gap."
- **Force-quit recovery: auto-end on next launch.** If the app was force-quit during an active or paused session, auto-end it on next launch. The user sees the session end screen with data collected up to the crash. No "resume interrupted session" prompt.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Rapid pause/resume toggling** | Each toggle creates a session event and starts/stops capture. No debouncing. If the user clicks Pause then immediately Resume, both events are recorded. The 3-second capture interval means at most one capture is missed. |
| **End Session while paused** | Show confirmation dialog. On confirm, set status to `"ended"`, `ended_at` to now, `ended_by` to `"user"`. No need to stop capture (it's already stopped from the pause). |
| **Auto-end triggers while the app window is hidden** | The session is auto-ended in the main process. When the user next focuses the app window, they see the session end screen. System tray icon updates to reflect no active session. |
| **Auto-end triggers while paused** | Same behavior as active auto-end. The 8-hour threshold is based on active time only, so this would only happen if the user accumulated 8 hours of active time across multiple pause/resume cycles. |
| **Force-quit during active or paused session** | On next launch, detect the stale session. Auto-end it: set status to `"ended"`, `ended_by` to `"auto"`, `ended_at` to now. Show the session end screen. Capture data up to the crash is preserved. |
| **Session with zero captures** | User started recording and immediately ended. Session ends normally. The session end screen shows "0 captures." The Report phase will handle generating a report with no data (or acknowledging insufficient data). |
| **User closes the confirmation dialog (clicks Cancel)** | Nothing happens. Session continues in its current state (active or paused). |
| **Multiple stale sessions found on launch** | Shouldn't happen (one session at a time enforced). But if it does, auto-end all of them. |

---

## Services

### Session Service

**Existing service, extended in this phase.**

New responsibilities:
- On `session:pause`: stop capture service, update status to `"paused"`, create a `paused` event in `session_events`
- On `session:resume`: start capture service, update status to `"active"`, create a `resumed` event in `session_events`
- On `session:end` (enhanced): the renderer shows the confirmation dialog first. On confirm, it calls this channel. Stop capture if running, update status to `"ended"`, set `ended_at` and `ended_by`. Return session summary (total time, active time, paused time, capture count, feeling count).
- **Active time calculation:** Sum of all active spans. An active span starts when status becomes `"active"` (session start or resume) and ends when status becomes `"paused"` or `"ended"`. Computed from `started_at` + `session_events` timestamps.
- **Auto-end:** Run a periodic check while a session exists. Each check computes accumulated active time on-the-fly from `started_at` + `session_events` timestamps in SQLite (the same calculation used for the session summary — one code path, no in-memory counter to keep in sync). At 7.5 hours, notify the renderer to show the warning banner. At 8 hours, auto-end the session.
- **Stale session cleanup on launch:** Query for sessions with status `"active"` or `"paused"`. Auto-end each one.

### Capture Service

**Existing service (built in Capture phase), called by session service.**

No new methods — session service calls existing `start()` and `stop()` for pause/resume/end.

---

## Data

### Tables touched

**session_events** (create)
| Field | When |
|-------|------|
| `event_id` (UUID) | Auto-generated |
| `session_id` (UUID, FK → session) | The current session |
| `event_type` (TEXT, NOT NULL) | `"paused"` or `"resumed"` |
| `created_at` (TEXT, ISO 8601, NOT NULL) | Timestamp of the event |

**session** (update)
| Field | When |
|-------|------|
| `status` | Updated to `"paused"` on pause, `"active"` on resume, `"ended"` on end |
| `ended_at` | Set when session ends (user or auto) |
| `ended_by` | `"user"` or `"auto"` |

### IPC Channels

**`session:pause`**
- Request: `{ session_id: string }`
- Response: `{ success: boolean }`
- Logic: Verify session is `"active"`. Stop capture service. Update status to `"paused"`. Create a `paused` event in `session_events`.

**`session:resume`**
- Request: `{ session_id: string }`
- Response: `{ success: boolean }`
- Logic: Verify session is `"paused"`. Start capture service. Update status to `"active"`. Create a `resumed` event in `session_events`.

**`session:end`** (enhanced from Capture phase)
- Request: `{ session_id: string }`
- Response: `{ success: boolean, summary: { total_minutes: number, active_minutes: number, paused_minutes: number, capture_count: number, feeling_count: number } }`
- Logic: Stop capture if running. Update status to `"ended"`. Set `ended_at` to now. Set `ended_by` to `"user"`. Compute and return session summary. (Report generation trigger will be added in the Report phase.)

**`session:check-stale`** (new — called on app launch)
- Request: `{}`
- Response: `{ ended_session?: { session_id: string, summary: { total_minutes: number, active_minutes: number, paused_minutes: number, capture_count: number, feeling_count: number } } }`
- Logic: Find sessions with status `"active"` or `"paused"`. Auto-end each one (set status to `"ended"`, `ended_by` to `"auto"`, `ended_at` to now). Return the most recent auto-ended session with its summary so the renderer can show the session end screen.

---

## Acceptance Criteria

- [ ] Pause button is visible on the active session screen alongside End Session
- [ ] Clicking Pause stops capture, updates status to `"paused"`, and transitions to the paused visual state
- [ ] Paused state is visually distinct: no breathing glow, "Paused" label shown, timer frozen
- [ ] Clicking Resume restarts capture, updates status to `"active"`, and returns to the active visual state
- [ ] User can pause and resume multiple times in one session
- [ ] Each pause and resume creates a corresponding event in `session_events`
- [ ] End Session shows a confirmation dialog before ending
- [ ] Confirming End Session stops capture, updates status to `"ended"`, and shows the session end screen
- [ ] Session end screen shows correct total time, active time, paused time, capture count, and feeling count
- [ ] End Session works from both active and paused states
- [ ] "Start New Session" button on the end screen navigates back to the intent input
- [ ] Auto-end warning banner appears at 7.5 hours of active time
- [ ] Session auto-ends at 8 hours of active time with `ended_by` set to `"auto"`
- [ ] On app launch, stale active/paused sessions are auto-ended
- [ ] Cannot start a new session while one is active or paused
- [ ] The floating feeling button remains visible and functional during pause
- [ ] All screens follow the design system (colors, typography, spacing, radius)
