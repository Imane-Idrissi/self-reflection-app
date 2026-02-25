# Phase: Dashboard

## Goal

Give the app a home screen. The dashboard is the first thing users see when they open the app. It lets them start a new session or revisit past ones.

---

## What changes

### 1. New screen: Dashboard

The dashboard has three parts:

**Header**
- App name on the left, settings icon on the right.
- Settings icon opens API key management (reuses existing ApiKeySetupScreen with `isChange=true`).

**Welcome + CTA**
- A short welcome message and a prominent "Start New Session" button.
- New users: one or two sentences explaining what the app does.
- Returning users: just "Welcome back" or similar.

**Past Sessions**
- Shows up to 10 most recent completed sessions as cards.
- Each card shows: **session name**, date, and duration.
- Clicking a card opens the ReportScreen for that session.
- Empty state for new users: a simple message like "Your sessions will appear here."

### 2. New field: Session name

Add a **required** "Session name" text input to the intent step in the setup wizard. The user gives their session a short name (e.g., "Essay Draft") before writing the detailed intent. This name is what appears on session cards.

**Database change:** Add a `name TEXT NOT NULL` column to the `session` table. Existing sessions get a default name derived from their intent (first ~40 characters).

**Type change:** Add `name: string` to the `Session` interface.

### 3. App entry point changes

- The dashboard replaces the setup wizard as the app's entry point.
- Clicking "Start New Session" enters the setup wizard.
- "Start New Session" from the ReportScreen returns to the dashboard.

---

## New IPC Channel

**`dashboard:get-sessions`**
- Request: `{ limit?: number }` (default 10)
- Response: `DashboardSession[]`

```typescript
interface DashboardSession {
  session_id: string;
  name: string;
  started_at: string;
  ended_at: string;
  duration_minutes: number;
  has_report: boolean;
}
```

---

## Acceptance Criteria

- [ ] Dashboard is the first screen on app launch
- [ ] New users see a welcome message, returning users see a compact greeting
- [ ] "Start New Session" button is always visible and prominent
- [ ] Clicking "Start New Session" enters the setup wizard (step 1 if no API key, step 2 if key exists)
- [ ] Settings icon opens API key management
- [ ] Past sessions shown as cards with session name, date, and duration
- [ ] Clicking a session card with a report opens the ReportScreen
- [ ] Empty state shown when no sessions exist
- [ ] Setup wizard has a new required "Session name" text input above the intent textarea
- [ ] Session name is stored in the database and displayed on dashboard cards
- [ ] "Start New Session" from ReportScreen returns to the dashboard
- [ ] Follows the design system
