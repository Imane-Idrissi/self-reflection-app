# Product Description

## Problem

Self-reflection is the key to improvement but it has two barriers:

1. **Inaccurate documentation.** We rely on memory to recall what we did, but memory lies. You think you spent 30 minutes on YouTube but it was 2 hours. Without accurate data, self-reflection is guessing.
2. **Lack of self-awareness.** Even when you know what happened, you don't know why. You think you opened YouTube because you were tired, but the real reason was you were avoiding a hard task. Without understanding the real why, you can't change behavior.

## Solution

The app automates what happened (capture replaces unreliable memory), uses AI to interpret why it happened (connecting behavior to feelings and intent), and provides actionable suggestions for what to change.

## Target User

The user is someone who wants to improve their productivity and self-awareness. They work on a computer (desktop/laptop), set goals for their work sessions, and want honest feedback about how they actually spent their time — not what they think they did, but what really happened.

---

## User Flow (6 Steps)

### Step 1: Set Intent

The user opens the app and types what they want to achieve in this session. This is the baseline — everything the AI analyzes later is compared against this intent.

**Why this step exists:** Without an intent, the AI can only describe behavior. With an intent, it can evaluate behavior. "You spent 2 hours on YouTube" is a fact. "You spent 2 hours on YouTube instead of working on the database schema you intended to finish" is insight.

**What happens:**
- User types their intent
- AI checks if the intent is specific enough
- If vague, AI asks 2-3 clarifying questions (one round maximum)
- User confirms the final intent
- Session is created

**Key decisions:**
- One round of clarification maximum. Better to start with an imperfect intent than frustrate the user with endless refinement.
- User always sees and confirms the final intent before the session starts, because the intent is the foundation for all AI analysis.
- Edit button available on refined intent — the intent is too important to not let the user modify it.
- After one round of clarification, accept the intent even if still imperfect. Trust the user.

### Step 2: Capture

The user clicks "Start Recording" and goes to work. The app silently captures what they do in the background.

**Why this step exists:** This replaces unreliable memory with real data. Without capture, there's nothing to analyze.

**What gets captured:**
- Active window title (e.g., "schema.sql - VS Code", "How to design databases - YouTube - Chrome")
- App name (e.g., "VS Code", "Google Chrome", "Spotify")
- Timestamp of each change

**What does NOT get captured:**
- Screenshots
- Keyboard input
- Mouse movement
- File contents
- Notifications

### Step 3: Feeling Log (Optional)

A floating button persists on the user's screen over all apps. When the user wants to log how they feel, they click it, type freely, and submit. The app never prompts, reminds, or asks the user to log. It's entirely user-initiated.

**Why this step exists:** Capture tells the AI WHAT you did. Feeling logs tell the AI WHY. "Switched to YouTube at 9:23" is behavior. "Logged frustration at 9:22, switched to YouTube at 9:23" reveals that frustration triggered avoidance. Without feelings, the AI can only describe. With feelings, it can interpret.

**What happens:**
- User clicks the floating button (available anytime during recording or pause)
- Small text input appears without covering their work
- User types freely — no mood categories, no emotion pickers, no templates
- User clicks submit
- Timestamp attached automatically
- Brief confirmation, input closes

**Key decisions:**
- Free text only. The value comes from raw honest input, not forcing users into predefined categories like "happy/sad/angry." A text field captures more authentic data than a mood picker.
- No notifications or reminders. The app never interrupts the user. Logging feelings is purely voluntary.
- The floating button is possible because of Electron — a web app couldn't float a button over VS Code or other desktop apps.

### Step 4: End Session

The user decides when the session is over. This defines the boundaries of what the AI will analyze.

**Three options:**
- **Temporary pause:** User is taking a break (lunch, walk, etc.). Capture stops. The AI will know to ignore this gap. User can resume later.
- **Permanent end:** Session is done. Capture stops. All data is collected and sent to the AI for analysis.
- **Auto-end:** Safety net. If the user forgets to end the session, it automatically ends after a maximum duration. Prevents hours of garbage data. Checked when the user next opens the app.

**Why this step exists:** The AI needs boundaries. Without a defined end, it doesn't know what timeframe to analyze. Pause exists because real work has breaks — without it, lunch time would look like "2 hours of inactivity" and skew the analysis.

### Step 5 & 6: Report (AI Summary + Interpretation + Suggestions)

When the session ends, the AI receives all the data — intent, captures, feeling logs, and pause/resume events — and produces a report. This is the value of the entire app. Everything built in steps 1-4 exists to produce this report.

The report has three sections:

**Section 1: Intent + Session Overview**
- The confirmed intent (reminds the user what they set out to do)
- Session duration (total time, active time, paused time)
- AI verdict: one sentence summarizing how the session went (the headline before the details)

**Section 2: AI Interpretation** (organized by behavioral patterns)

Each pattern has:
- Pattern name (e.g., "Task Avoidance When Facing Difficulty") — always visible
- Confidence level: high, medium, or low — always visible
- What happened (collapsed by default, expandable) — the evidence with ability to view proof in a modal showing the specific capture entries and feeling logs the AI used

**Section 3: Action Suggestions**
- Specific suggestions based on THIS session
- Each references which pattern it addresses
- Not generic ("try to stay focused") but specific in a way that the action suggestion can be reused beyond the goal of this session — not too specific
- Suggestions only for patterns that need changing — positive patterns are acknowledged in Section 2 but don't need action items
- Always visible, not collapsed
