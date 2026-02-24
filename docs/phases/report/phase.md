# Phase: Report

## Goal

Generate an AI-powered behavioral analysis report when a session ends and display it to the user. This is the value of the entire app — everything built in prior phases (intent, capture, feelings, session management) exists to produce this report.

---

## User Flow

1. The user confirms ending the session. `session:end` returns immediately with the session summary, and report generation starts in the background.
2. The renderer receives the summary, shows the "generating report" screen with a calming animation, and begins polling `report:get` every 3 seconds.
3. Meanwhile, the AI service reads all session data (intent, captures, feelings, session events), collapses captures into time spans, builds a prompt, and sends it to the Claude API.
4. **If status is `"generating"`:** continue showing the generating screen with animation.
5. **If status is `"ready"`:** transition to the full report display.
6. **If status is `"failed"`:** show an error message with a "Retry" button.
7. The report is displayed in three sections:

**Section 1: Intent + Session Overview** (always expanded)
- The confirmed intent (reminding the user what they set out to do)
- Session duration breakdown: total time, active time, paused time
- AI verdict: one sentence summarizing how the session went

**Section 2: Behavioral Patterns** (each pattern is a card)
- Pattern name (always visible)
- Confidence badge: high (green), medium (amber), low (red) — always visible
- Pattern description: a brief explanation of what the AI observed (always visible)
- Evidence section (collapsed by default, expandable): lists the specific captures and feeling logs that support this pattern. Each evidence item is clickable — opens a proof modal showing the raw data.

**Section 3: Action Suggestions** (always expanded)
- Each suggestion is a card with the actionable text
- Each references which pattern it addresses (displayed as a subtle link/tag)
- Only negative/neutral patterns get suggestions — positive patterns are acknowledged in Section 2 but don't need action items

8. After viewing the report, a "Start New Session" button is available to return to the intent screen.

---

## Decisions

- **This phase replaces Session Management's end screen.** Instead of the simple session summary, the user now sees a "generating report" screen after ending a session, followed by the full report. The session summary data (duration, counts) is shown in the report's Section 1.
- **Report generation is triggered at session end, not when the user requests it.** The AI provider takes 10-30 seconds. By triggering immediately when the session ends, we minimize wait time.
- **Collapse captures into time spans before sending to the AI.** Group consecutive identical captures (same `window_title` AND `app_name`) into spans with start time, end time, and duration. This reduces input size and makes the data more readable for the AI. See Capture Collapsing section below for detail.
- **Interleave feeling logs and session events chronologically in the prompt.** The AI needs the full timeline to identify correlations (e.g., "logged frustration → switched to YouTube 1 minute later").
- **Confidence levels are defined in the prompt:**
  - **High:** multiple evidence points from different sources (captures + feelings), clear correlation with the intent.
  - **Medium:** observable pattern in captures, but limited or no feeling data to confirm the user's internal state.
  - **Low:** single observation or ambiguous evidence, possible but not certain.
- **Pattern types: positive, negative, neutral.** Only negative and neutral patterns get action suggestions.
- **Suggestions must be specific but reusable.** Not generic ("stay focused") and not so specific they only apply to this session ("don't open YouTube at 9:23").
- **Proof modal lets the user verify the AI's claims.** Clicking an evidence item opens a modal with the raw capture rows or feeling log entry for that time range. See Proof Modal section below for detail.
- **No user identity sent to the AI.** The prompt includes intent, captures, feelings, and session events — but no username, machine name, or other identifying information.
- **The system prompt is a dedicated task, not a one-liner.** The prompt structure in the Services section defines WHAT goes into the prompt. The actual system prompt text — the instructions that determine whether reports feel insightful or generic — is the highest-leverage piece of text in the app. It ships as a baseline first version, then is iterated based on real session data. Prompt engineering is scoped as a separate task within this phase.
- **Evidence timestamps are best-effort, not validated.** The AI cites time ranges from the collapsed spans we send it. It may occasionally be slightly off (e.g., citing 09:44 instead of 09:45). The proof modal queries raw captures in the cited range. If the range is slightly off, captures near the boundary still appear. If the AI hallucinates a time range with no real captures, the modal shows an empty state: "No matching data found for this time range." No timestamp snapping or correction — just show whatever falls in the window.
- **API key is guaranteed to exist by the Intent phase.** The Intent phase requires a valid API key before the user can submit an intent. By the time a session reaches report generation, a key exists. If the key has become invalid since then (revoked, expired), it's treated as an API failure — same retry/skip flow.
- **Stale "generating" reports are marked as failed on app launch.** If the app was closed during report generation, the report stays in "generating" status with no process running. On launch, any report with status "generating" is set to "failed" so the user can retry.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **AI API call fails** (network error, invalid key, rate limit) | Set report status to `"failed"`. Show error message with a "Retry" button. Also show a "Skip Report" option. Skipping shows the report screen with only Section 1 (intent + session overview from the summary data) and a message in place of Sections 2 and 3: "Report not available." The "Start New Session" button is still available. |
| **AI returns malformed JSON** | Treat as a failure. Set status to `"failed"`. Show retry option. Log the raw response internally for debugging. |
| **Very long session (8+ hours of captures)** | The collapsed time spans keep the prompt manageable even for very long sessions. If the prompt still exceeds the AI's context window, truncate the oldest captures (keep the most recent activity + all feeling logs). |
| **Session with zero captures** | Generate a report anyway. The AI acknowledges there's no behavioral data. The report will only contain the intent overview and a note that no activity was recorded. Suggestions will focus on "try logging at least a few minutes of activity next time." |
| **Session with zero feeling logs** | Generate a report. The AI notes that analysis is behavior-only. Confidence levels for "why" interpretations will be lower. The report includes a gentle note encouraging future feeling logs. |
| **Very short session (under 5 minutes)** | Generate a report. The AI acknowledges limited data. Patterns and suggestions may be minimal or absent. No minimum enforced. |
| **User navigates away during generation** | Generation continues in the background (it's a main-process operation). When the user returns, the renderer checks `report:get` and either shows the ready report or the still-generating animation. |
| **User closes the app during generation** | Generation stops (the main process exits). On next launch, the stale report is detected (status still `"generating"`) and set to `"failed"`. The user sees the error state with a retry option. |
| **Multiple retries fail** | Each retry is independent. No limit on retries. The user can keep trying or skip. The "Skip Report" option is always available. |
| **Report already exists for this session** | Don't regenerate. Return the existing report from SQLite. This prevents accidental duplicate API calls. |

---

## Services

### AI Service

**Existing service (used for intent checking in Intent phase), extended for report generation.**

New responsibilities:

**Report generation call:**
- Read all session data from SQLite: session (intent, times), captures, feelings, session events
- Collapse captures into time spans (group consecutive identical `window_title` + `app_name`)
- Build a chronological timeline interleaving collapsed captures, feeling logs, and session events
- Compute session duration metadata: total minutes, active minutes, paused minutes
- Build the prompt (system prompt + session data) and send to Claude API
- Parse the AI's JSON response into the three report sections
- Store in the `reports` table
- Update report status: `"generating"` → `"ready"` or `"failed"`

**Prompt structure:**

The prompt sent to Claude includes:
1. **System prompt:** Defines the AI's role, analysis approach, and output format. The exact text is a dedicated prompt engineering task within this phase (see Decisions). Baseline intent: analyze the user's work session behavior relative to their stated intent, identify patterns, and suggest improvements.
2. **Intent:** The user's confirmed final intent.
3. **Session metadata:** Total active time, total paused time, number of feeling logs.
4. **Chronological timeline:** Collapsed capture spans + feeling logs + pause/resume events, ordered by time. Each entry has a timestamp and description.
5. **Output format instructions:** The exact JSON schema expected (see response format below).
6. **Confidence criteria:** Definitions of high, medium, low confidence as described in Decisions.
7. **Tone instructions:** Be honest but supportive. Acknowledge positive patterns, not just negative ones. Suggestions should feel helpful, not judgmental.

**Expected AI response format:**
```json
{
  "verdict": "string — one sentence summarizing how the session went",
  "patterns": [
    {
      "name": "string — pattern name",
      "confidence": "high | medium | low",
      "type": "positive | negative | neutral",
      "description": "string — what the AI observed",
      "evidence": [
        {
          "type": "capture | feeling",
          "description": "string — human-readable evidence",
          "start_time": "ISO 8601",
          "end_time": "ISO 8601 | null (null for feelings, which are point-in-time)"
        }
      ]
    }
  ],
  "suggestions": [
    {
      "text": "string — the actionable suggestion",
      "addresses_pattern": "string — the pattern name this suggestion addresses"
    }
  ]
}
```

### Session Service

**Existing service, extended in this phase.**

New responsibilities:
- On `session:end` (enhanced): after ending the session, create a report row with status `"generating"` and tell the AI service to begin report generation in the background.
- On `report:get`: read the report from SQLite and return it with session metadata.
- On `report:retry`: reset the failed report's status to `"generating"`, trigger AI service again.
- **On app launch:** set any report with status `"generating"` to `"failed"` (the generation process died when the app closed).

---

## Data

### Tables touched

**reports** (create + update)
| Field | When |
|-------|------|
| `report_id` (UUID) | Created when report generation starts |
| `session_id` (UUID, FK → session) | The session this report analyzes |
| `summary` (TEXT) | The AI's one-sentence verdict. Stored as a plain string, not JSON. Set when report is ready. |
| `patterns` (TEXT) | Stores the behavioral patterns as JSON array (see format above). Set when report is ready. |
| `suggestions` (TEXT) | Stores the action suggestions as JSON array (see format above). Set when report is ready. |
| `status` (TEXT, NOT NULL) | `"generating"` → `"ready"` or `"failed"` |
| `created_at` (TEXT, ISO 8601, NOT NULL) | When report generation was triggered |

**session** (read-only in this phase — data read for prompt building)

**capture** (read-only — all captures for this session read and collapsed into spans)

**feeling** (read-only — all feelings for this session read for the prompt)

**session_events** (read-only — pause/resume events read for the timeline)

### IPC Channels

**`session:end`** (enhanced from Session Management phase — now triggers report generation)
- Request: `{ session_id: string }`
- Response: `{ success: boolean, summary: { ... } }` (same as Session Management)
- Logic: Everything from Session Management, plus: create a report row with status `"generating"`, trigger AI service report generation in the background (non-blocking).

**`report:get`**
- Request: `{ session_id: string }`
- Response: `{ status: "generating" | "ready" | "failed", report?: { verdict: string, patterns: [...], suggestions: [...] }, session?: { intent: string, total_minutes: number, active_minutes: number, paused_minutes: number } }`
- Logic: Read the report from SQLite. If status is `"ready"`, include the parsed report data and session metadata. If `"generating"` or `"failed"`, return just the status.

**`report:retry`**
- Request: `{ session_id: string }`
- Response: `{ success: boolean }`
- Logic: Verify the existing report has status `"failed"`. Reset status to `"generating"`. Trigger AI service report generation again.

---

## Capture Collapsing (Detail)

Before sending captures to the AI, consecutive identical captures are collapsed into time spans:

**Input** (raw capture rows):
```
09:00:00 | VS Code | schema.sql - VS Code
09:00:03 | VS Code | schema.sql - VS Code
09:00:06 | VS Code | schema.sql - VS Code
...
09:45:00 | VS Code | schema.sql - VS Code
09:45:03 | Google Chrome | YouTube - How to design databases
09:45:06 | Google Chrome | YouTube - How to design databases
...
```

**Output** (collapsed spans):
```
09:00:00 – 09:45:00 (45 min) | VS Code | schema.sql - VS Code
09:45:03 – 10:25:06 (40 min) | Google Chrome | YouTube - How to design databases
```

Feeling logs and session events are interleaved chronologically:
```
09:00:00 – 09:45:00 (45 min) | VS Code | schema.sql - VS Code
  09:22:00 [FEELING] "frustrated with this bug, not making progress"
09:45:03 – 10:25:06 (40 min) | Google Chrome | YouTube - How to design databases
10:25:06 [PAUSE]
10:40:00 [RESUME]
10:40:03 – 11:00:00 (20 min) | VS Code | schema.sql - VS Code
  10:55:00 [FEELING] "finally getting somewhere, the break helped"
```

---

## Proof Modal (Detail)

When the user clicks an evidence item in a pattern card:

1. A modal opens showing the raw data backing that evidence.
2. **For capture-type evidence:** Query all raw capture rows between the evidence's `start_time` and `end_time` for this session. Display them as a vertical timeline list:
   - Each row shows: timestamp (mono font), app name, window title
   - Rows are grouped by app (consecutive same-app entries are visually connected)
   - If no captures fall in the time range (AI cited an inaccurate range), show: "No matching data found for this time range."
3. **For feeling-type evidence:** Display the full feeling log entry with its timestamp.
4. The modal header shows the evidence description from the AI.
5. Standard modal behavior: close via X button, clicking outside, or pressing Escape.

---

## Acceptance Criteria

- [ ] Report generation is triggered automatically when a session ends
- [ ] A "generating report" screen with calming animation is shown while the report is being generated
- [ ] When the report is ready, it transitions to the full report display
- [ ] Section 1 (Intent + Overview) shows the intent, duration breakdown, and AI verdict
- [ ] Section 2 (Patterns) shows each pattern as a card with name, confidence badge, and description
- [ ] Confidence badges use correct semantic colors: high = green, medium = amber, low = red
- [ ] Evidence sections are collapsed by default and expandable
- [ ] Clicking an evidence item opens a proof modal with raw capture/feeling data
- [ ] Section 3 (Suggestions) shows actionable suggestions with references to their patterns
- [ ] Only negative/neutral patterns have suggestions — positive patterns don't
- [ ] If report generation fails, an error message with "Retry" and "Skip Report" buttons is shown
- [ ] "Skip Report" shows Section 1 (intent + overview) with a "Report not available" message for Sections 2 and 3
- [ ] Retry triggers a new generation attempt
- [ ] Proof modal shows an empty state if the AI cited a time range with no matching captures
- [ ] Short sessions and sessions with no feelings still produce a report (with appropriate AI acknowledgment)
- [ ] "Start New Session" button is available after viewing the report
- [ ] Report is persisted in SQLite and can be viewed again without regeneration
- [ ] On app launch, stale "generating" reports are set to "failed"
- [ ] No user identity is sent to the AI provider in the prompt
- [ ] All screens follow the design system (colors, typography, spacing, radius, shadows)
