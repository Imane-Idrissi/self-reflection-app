# Phase: Dashboard

## Goal

Give the app a proper home screen. The dashboard is the first thing the user sees when they open the app, whether they are brand new or have 50 past sessions. It should clearly communicate what the app does, make starting a new session effortless, and give returning users access to their session history and insights.

---

## User Flow

### First-time user (no sessions, no API key)

1. User opens the app and lands on the dashboard.
2. The dashboard shows a welcome section that explains the app in one or two sentences: what it does and why it is useful.
3. A prominent "Start New Session" button is the main CTA.
4. The "Recent Sessions" section shows an empty state with an encouraging message (e.g., "Your sessions will appear here once you complete your first one").
5. The "Insights" section is hidden entirely (no empty state for stats, just don't show the section).
6. User clicks "Start New Session" and enters the setup wizard (API Key > Set Intent > Record).

### Returning user (has past sessions)

1. User opens the app and lands on the dashboard.
2. The welcome section is replaced by a compact greeting (e.g., "Welcome back") with the "Start New Session" button still prominent.
3. The "Recent Sessions" section shows a list of past sessions, most recent first.
4. Each session card shows: date, intent text (truncated), total duration, and report status (ready, failed, skipped).
5. Clicking a session card opens its report (reuses the existing ReportScreen).
6. The "Insights" section shows aggregated stats from all completed sessions.

### Stale session handling

The existing stale session check still happens on app launch. If a stale session is detected, the app goes directly to the report generating screen as it does today, bypassing the dashboard. After the report is done and the user clicks "Start New Session", they land on the dashboard.

---

## Sections

### 1. Header

- App name ("Self Reflection") on the left
- Settings gear icon on the right (opens API key management)
- Clean, minimal, no heavy branding

### 2. Hero / CTA area

- **New user:** A short welcome message explaining what the app does. Something like: "Track your focus, understand your habits, and get actionable insights after every work session." Keep it to two lines max.
- **Returning user:** A compact greeting. The welcome explanation is no longer needed since they already know the app.
- **"Start New Session" button** is always the primary action, visually prominent. This is the most important element on the entire dashboard.

### 3. Recent Sessions

- Shows the last 10 sessions (paginate or "show more" is not needed for now).
- Each session is a card/row with:
  - **Date** (e.g., "Feb 24, 2026" or "Today" / "Yesterday" for recent ones)
  - **Intent** (the final_intent text, truncated to ~80 characters with ellipsis)
  - **Duration** (total session time, formatted as "1h 23m" or "45 min")
  - **Report status badge**: "Report ready" (green), "Report failed" (red), "Skipped" (grey), "No report" (grey)
- Clicking a session with a ready report opens the ReportScreen for that session.
- Clicking a session with a failed/skipped/no report does nothing (or shows a subtle tooltip "No report available").
- **Empty state** (new user): A centered message like "Your sessions will appear here" with a subtle illustration or icon. Not sad or empty-feeling, just informative.

### 4. Insights (only shown when user has at least 1 completed session)

- **Total sessions** completed
- **Total focus time** across all sessions (sum of active_minutes)
- **Average session length**
- Displayed as 3 stat cards in a row, simple numbers with labels.
- This section is hidden entirely for new users (not shown with zeros).

---

## Decisions

- **The dashboard is the new app entry point.** The app always opens to the dashboard. The setup wizard (API Key > Set Intent > Record) is only entered when the user clicks "Start New Session".
- **No active session state on the dashboard.** If a session is active, the app should already be on the ActiveSessionScreen. The dashboard is only shown when no session is running.
- **Session history comes from existing data.** We already store all sessions in SQLite with their status, intent, timestamps, and reports. No new tables needed. We just need a new IPC channel to fetch completed sessions.
- **Report viewing reuses the existing ReportScreen.** When the user clicks a session from the list, we navigate to the ReportScreen with that session's ID. The "Start New Session" button on the ReportScreen brings them back to the dashboard.
- **The dashboard does not show "created" status sessions.** Only sessions with status "ended" are shown (these are completed sessions that went through the full flow).
- **Insights are deliberately simple for now.** Just counts and averages. No charts, no trends, no streaks. We can add these later if useful.
- **The waves and decorative elements from the setup wizard should NOT appear on the dashboard.** The dashboard should feel clean and functional, not like an onboarding screen.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **App opens with a stale session** | Stale session check happens before dashboard loads. If stale, go to report generation. Dashboard is never shown in this case. |
| **App opens with an active session** | Should not happen (active session = ActiveSessionScreen). If somehow reached, redirect to ActiveSessionScreen. |
| **User has sessions but none with reports** | Sessions still show in the list with "No report" badge. Insights section still shows (total sessions, total time). |
| **User deletes API key via settings** | Dashboard still shows. When they click "Start New Session", the setup wizard starts at step 1 (API Key). |
| **Very long intent text** | Truncate to ~80 characters with ellipsis in the session card. Full text is visible in the report. |

---

## Services

### Session Repository (existing, needs new method)

**New method: `findCompleted(limit: number)`**
- Returns sessions with status `"ended"`, ordered by `ended_at DESC`, limited to `limit` rows.
- Returns: `Session[]`

### Session Service (existing, needs new method)

**New method: `getCompletedSessions(limit: number)`**
- Calls the repository method above.
- For each session, also fetches the report status (from ReportRepository) and computes duration.
- Returns an array of session summaries for the dashboard.

---

## Data

### Tables touched

No new tables. Uses existing `session` and `reports` tables.

### New IPC Channels

**`dashboard:get-sessions`**
- Request: `{ limit?: number }` (default 10)
- Response: `{ sessions: DashboardSession[] }`
- Where `DashboardSession` is:
```typescript
{
  session_id: string;
  final_intent: string;
  started_at: string;
  ended_at: string;
  total_minutes: number;
  active_minutes: number;
  report_status: 'ready' | 'failed' | 'generating' | 'none';
}
```

**`dashboard:get-insights`**
- Request: `{}`
- Response: `{ total_sessions: number; total_focus_minutes: number; avg_session_minutes: number }`
- Only counts sessions with status `"ended"`.

---

## UI Structure

```
+--------------------------------------------------+
|  Self Reflection                          [gear]  |
+--------------------------------------------------+
|                                                   |
|  [Welcome text for new users /                    |
|   "Welcome back" for returning users]             |
|                                                   |
|        [ Start New Session ]  (primary button)    |
|                                                   |
+--------------------------------------------------+
|                                                   |
|  Recent Sessions                                  |
|  +----------------------------------------------+ |
|  | Feb 24  Finish my essay on...    1h 23m  [R] | |
|  | Feb 23  Prepare slides for...    45 min  [R] | |
|  | Feb 22  Clean up the garage...   2h 10m  [S] | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
|                                                   |
|  [ 12 sessions ]  [ 18h 45m ]  [ 1h 34m avg ]   |
|                                                   |
+--------------------------------------------------+
```

---

## Acceptance Criteria

- [ ] Dashboard is the first screen shown on app launch (unless stale session detected)
- [ ] New users see a welcome message explaining what the app does
- [ ] Returning users see a compact greeting
- [ ] "Start New Session" button is always visible and prominent
- [ ] Clicking "Start New Session" enters the setup wizard
- [ ] If no API key exists, the wizard starts at step 1 (API Key)
- [ ] If API key exists, the wizard starts at step 2 (Set Intent)
- [ ] Recent sessions are listed with date, intent, duration, and report status
- [ ] Clicking a session with a ready report opens the ReportScreen
- [ ] Empty state shown when no sessions exist
- [ ] Insights section shows total sessions, total focus time, and average session length
- [ ] Insights section is hidden when no completed sessions exist
- [ ] Settings gear opens API key management
- [ ] All screens follow the design system (colors, typography, spacing)
- [ ] "Start New Session" from ReportScreen returns to the dashboard
