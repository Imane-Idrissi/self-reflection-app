# Phase: Capture

## Goal

Wire up background capture of the user's active window during a session. Every 3 seconds, the app records the window title and app name to SQLite — this is the raw behavioral data the AI will analyze in the report.

---

## User Flow

1. User clicks "Start Recording" (built in Intent phase). The app checks for macOS Accessibility permission.
2. **If permission not granted:** show a permission screen explaining that the app needs Accessibility access to read window titles. Include step-by-step instructions for granting it in System Preferences and a "Check Again" button.
3. **If permission granted:** capture service starts polling. The main window transitions to the active session screen.
4. The active session screen shows: the confirmed intent (so the user remembers their goal), a recording indicator with a breathing glow, the elapsed session time as a live timer, and an "End Session" button.
5. Every 3 seconds, the capture service reads the active window's title and app name and writes a row to the `capture` table in SQLite.
6. The user goes about their work. The capture is invisible — no notifications, no interruptions, no visible system impact.
7. User clicks "End Session" when done. Capture stops, session status updates to `"ended"`, `ended_at` is set.

---

## Decisions

- **This phase builds on the Intent phase.** A session already exists in SQLite with status `"created"` and `started_at` is null. When the user clicks "Start Recording," this phase transitions the session from `"created"` → `"active"`, sets `started_at` to now (meaning "when capture began"), and starts the capture service.
- **Polling interval: 3 seconds.** Short enough to catch intentional app switches (4-5+ seconds of use), long enough to filter reflexive misclicks (1-2 seconds).
- **Store every capture row, collapse later.** No deduplication at write time. If the user stays on VS Code for 30 minutes, we write 600 rows. This preserves exact timestamps for proof modals in the report. Storage is not a concern (~2GB over 3 years of heavy daily use). Collapsing into time spans happens in the Report phase.
- **Skip when no window is active.** If the system call returns no active window (screen locked, empty desktop), skip that poll — don't write a null row.
- **macOS Accessibility permission is checked at capture start, not during onboarding.** The permission is only needed when capture begins. Checking at that moment makes the request feel justified.
- **If the active-window system call fails, skip silently.** A single missed poll (3 seconds) is invisible in a multi-hour session. If it fails 10+ times in a row, show a subtle warning on the active session screen.
- **Active session screen is minimal.** The user should be working, not staring at this screen. Show just enough to confirm recording is happening: the intent, a timer, and a way to stop.
- **End Session in this phase is minimal.** Stops capture, sets status to `"ended"`, sets `ended_at` and `ended_by`. No confirmation dialog, no pause, no report trigger — those are added in later phases.
- **Only capture the focused window.** There's only one focused window at any time, regardless of monitor count.
- **Recording indicator: breathing glow + system tray.** A soft pulse on the active session screen, plus a system tray icon so the user knows recording is active even when the app window is hidden.
- **Writes are immediate, not batched.** Each capture is written to SQLite as it happens. If the app crashes, every capture up to the last poll is safe on disk.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **macOS Accessibility permission not granted** | Show a permission screen with instructions: "Open System Preferences → Privacy & Security → Accessibility → Enable [App Name]." Include a "Check Again" button and a "Back" button. Session stays in `"created"` status until permission is granted. |
| **User clicks "Back" on the permission screen** | Return to the intent screen. The session remains in `"created"` status and is cleaned up on next app launch (Intent phase already handles this). |
| **User grants permission but it doesn't take effect** | macOS sometimes requires an app restart. If "Check Again" still fails, show a message suggesting they quit and reopen the app. |
| **Active window returns null/empty** | Skip this capture. No row written. This happens when the screen is locked, at the login screen, or the desktop has no windows open. |
| **Capture system call fails repeatedly** | After 10 consecutive failed polls (~30 seconds), show a subtle warning banner on the active session screen: "Having trouble reading your active window." Don't stop capture — keep trying. The warning disappears when a successful capture resumes. |
| **User minimizes the app during recording** | Capture continues in the background. The Electron main process keeps running regardless of the renderer window state. The system tray icon shows recording is active. |
| **User force-quits the app during recording** | Session remains `"active"` in SQLite with no `ended_at`. Capture data up to the last successful write is preserved. On next app launch, this stale session is detected and handled (Session Management phase). |
| **Very long session (8+ hours)** | No limit enforced in this phase. Capture runs until the user clicks End Session. Auto-end is added in the Session Management phase. |

---

## Services

### Capture Service

**New service, built in this phase.**

Responsibilities:
- `start(sessionId)`: check Accessibility permission, then begin a 3-second interval that reads the active window and writes to SQLite
- `stop()`: clear the interval
- Handle system call failures gracefully (skip and continue, track consecutive failure count)

Requires a native macOS binding (e.g., node-ffi, a Swift addon, or an npm package wrapping the Accessibility API) to read the active window's title and app name. This is a non-trivial dependency that affects the build pipeline — native addons must be compiled for the target platform.

### Session Service

**Existing service, extended in this phase.**

New responsibilities:
- On `session:start`: the session already exists with status `"created"` from the Intent phase. This call checks Accessibility permission → if denied, return error (session stays in `"created"`) → if granted, start capture service, update status to `"active"`, set `started_at` to now
- On `session:end`: stop capture service, update status to `"ended"`, set `ended_at` and `ended_by`
- Track whether capture is currently running (prevent double-starts)

---

## Data

### Tables touched

**capture** (create)
| Field | When |
|-------|------|
| `capture_id` (UUID) | Auto-generated on each write |
| `session_id` (UUID, FK → session) | Set to the active session's ID |
| `window_title` (TEXT, NOT NULL) | The active window's title at capture time |
| `app_name` (TEXT, NOT NULL) | The active window's application name |
| `captured_at` (TEXT, ISO 8601, NOT NULL) | Timestamp of the capture |

**session** (update)
| Field | When |
|-------|------|
| `status` | Set to `"active"` when capture starts, `"ended"` when user clicks End Session |
| `started_at` (TEXT, ISO 8601) | Set when capture starts — this means "when recording began," not when the session record was created. It is null until this phase. |
| `ended_at` (TEXT, ISO 8601) | Set when session ends |
| `ended_by` (TEXT) | Set to `"user"` when user clicks End Session |

### IPC Channels

**`session:start`** (enhanced — was stub in Intent phase, now starts capture)
- Request: `{ session_id: string }`
- Response: `{ success: boolean, error?: "permission_denied" }`
- Logic: A session with this ID already exists in SQLite with status `"created"` (created in the Intent phase). Check Accessibility permission. If denied, return error — session stays in `"created"`. If granted, start capture service, update status to `"active"`, set `started_at` to now.

**`session:end`** (new — minimal end, will be enhanced in Session Management and Report phases)
- Request: `{ session_id: string }`
- Response: `{ success: boolean }`
- Logic: Stop capture service. Update status to `"ended"`. Set `ended_at` to now. Set `ended_by` to `"user"`.

---

## Acceptance Criteria

- [ ] Clicking "Start Recording" checks macOS Accessibility permission
- [ ] If permission denied, a clear instruction screen is shown with "Check Again" and "Back" buttons
- [ ] "Back" on the permission screen returns to the intent screen without starting capture
- [ ] If permission granted, capture service starts, session status is `"active"`, `started_at` is set, and the active session screen is shown
- [ ] Capture writes a row to SQLite every 3 seconds with correct `window_title`, `app_name`, and `captured_at`
- [ ] Captured data matches the actual active window (verified by switching apps during recording)
- [ ] Active session screen shows the confirmed intent, a recording indicator with breathing glow, and an elapsed time timer
- [ ] System tray icon indicates recording is active
- [ ] End Session button stops capture and updates session to `"ended"` in SQLite with correct `ended_at` and `ended_by`
- [ ] Capture continues running when the app window is minimized
- [ ] Null/empty active window (screen locked, no windows) is silently skipped — no row written
- [ ] No visible performance impact during capture (CPU, memory, battery)
- [ ] All screens follow the design system (colors, typography, spacing, radius)
