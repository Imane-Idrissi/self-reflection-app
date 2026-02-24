# Phase: Intent

## Goal

Allow the user to set a clear intent for their session. The intent is the foundation for all AI analysis — without it, the AI can only describe behavior, not evaluate it.

---

## User Flow

1. User sees a centered screen with a text field, a headline, and a short explanation of why setting an intent matters and encouraging the user to be as specific as possible for better results.
2. User types their intent and clicks submit.
3. App sends the intent to the AI service for vagueness checking.
4. **If specific:** show a success state, then display the "Start Recording" button with a concise privacy explanation of what gets captured and what doesn't.
5. **If vague:** show a message explaining the intent needs more detail. Display the AI's clarifying questions (all at once) with a text field for each answer. User fills in answers and submits.
6. AI returns a refined intent. Display it to the user with two buttons: "Confirm" and "Edit."
7. **If user clicks Confirm:** show success, then display the "Start Recording" button with privacy explanation.
8. **If user clicks Edit:** the refined intent becomes editable in a text field with cursor focused. User modifies it and submits. The edited intent is accepted as-is — no second AI check. Show success, then display the "Start Recording" button with privacy explanation.

---

## Decisions

- **One round of clarification maximum.** If the intent is vague, AI asks clarifying questions once. After the user answers, the AI refines the intent and that's it — no further rounds even if still imperfect. Trust the user.
- **Edited intent is NOT re-checked by AI.** When the user edits the refined intent, it's accepted as-is. The user knows what they mean. Re-checking would create an annoying loop.
- **Clarifying questions are displayed all at once**, each with its own text field. Not one at a time.
- **Session is created in SQLite when the intent is first submitted** (step 2), with `original_intent` filled in and `status` set to `"created"`. This means the session exists before vagueness checking completes. If the intent is specific, `final_intent` is set to the same value. If refined, `final_intent` is updated after confirmation.
- **New session status: `"created"`**. The status progression is: `created` → `active` → `paused` / `ended`. A session in `"created"` means intent is confirmed but recording hasn't started yet.
- **"Start Recording" is part of this phase** as a UI element, but clicking it only updates the session status to `"active"`. The actual capture service is built in the Capture phase. For now, the button exists but capture doesn't run yet.
- **API key must exist before this phase works.** If no API key is stored, the user should be prompted to enter one before they can submit an intent. This is handled by the foundation setup — this phase assumes the key exists.
- **Loading states use a spinner only, no text.** When waiting for an AI response (submit intent, submit clarification answers), show a spinner on the button. No loading text like "Checking..." — if the response is fast, text flashes and disappears which looks like a bug. A spinner handles both fast and slow responses gracefully.
- **Back navigation:** The only back button is on the clarification screen → goes back to intent input so the user can rewrite their intent. No other screens need a back button.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Empty intent submitted** | Disable the submit button when the text field is empty. Show a message indicating the field is required. Never send an empty string to the AI. |
| **AI API call fails** (network error, invalid key, rate limit) | Show a clear message: "We couldn't check your intent right now." Display a "Start Recording Anyway" button. The intent is accepted as-is — `final_intent` = `original_intent`. Skip the clarification flow entirely and go straight to the Start Recording screen. No background retry. |
| **Very long intent** (500+ characters) | Allow it. No character limit. The AI can handle long input. If it's too long for the API, the AI service truncates internally. |
| **User closes app before confirming intent** | The session exists in SQLite with status `"created"` and `started_at` is null. On next app launch, silently delete it — it was abandoned and has no data worth keeping. |
| **Clarifying question answer is empty** | Disable submit until all fields have text. Show a message indicating all questions need to be answered. |
| **AI returns malformed response** | Treat it as an API failure — show the same "couldn't check your intent" message with "Start Recording Anyway" button. |

---

## Services

### Session Service

**Responsibilities in this phase:**
- Create a session row in SQLite when the user submits their intent
- Store `original_intent` on creation
- Update `final_intent` when the intent is confirmed (specific, refined, or edited)
- Update status from `"created"` to `"active"` when Start Recording is clicked
- Set `started_at` timestamp when recording starts
- On app launch, delete any session with status `"created"` (abandoned, never started)

### AI Service

The AI service does not make decisions — it builds prompts, sends them to the Claude API (the AI provider), and parses the response into structured data the app can use.

**Two AI calls in this phase:**

**Call 1: Vagueness check**
- AI service builds a prompt with the user's intent and sends it to Claude API
- Claude decides if the intent is specific or vague, and if vague, generates up to 3 clarifying questions (enough to sharpen the intent, not so many that it feels like a form)
- AI service parses Claude's response into structured JSON

**Call 2: Intent refinement** (only if vague)
- AI service builds a prompt with the original intent + the user's answers to clarifying questions and sends it to Claude API
- Claude generates a refined, more specific version of the intent
- AI service parses Claude's response into structured JSON

**Decisions:**
- No user identity is sent to the AI provider — just the intent text and answers
- The AI service enforces structured JSON responses so the app can parse them reliably
- If Claude's response can't be parsed, treat it as an API failure

**Expected response formats:**

Vagueness check:
```json
{
  "status": "specific" | "vague",
  "clarifying_questions": ["question 1", "question 2", "question 3"]
}
```

Intent refinement:
```json
{
  "refined_intent": "the refined intent text"
}
```

---

## Data

### Tables touched

**session** (create + update)
| Field | When |
|-------|------|
| `session_id` (UUID) | Created on first intent submit |
| `original_intent` (TEXT, NOT NULL) | Set on first submit |
| `final_intent` (TEXT) | Set when intent is confirmed (specific, refined, or edited) |
| `status` (TEXT, NOT NULL) | Set to `"created"` on submit, updated to `"active"` when recording starts |
| `started_at` (TEXT, ISO 8601) | Set when status changes to `"active"` (Start Recording clicked) |
| `ended_at` | Not touched in this phase |
| `ended_by` | Not touched in this phase |

### IPC Channels

**`session:create`**
- Request: `{ intent: string }`
- Response: `{ session_id: string, status: "specific" | "vague", clarifying_questions?: string[], final_intent?: string }`
- Logic: Creates session in SQLite, sends intent to AI service for vagueness check, returns result.

**`session:clarify`**
- Request: `{ session_id: string, answers: string[] }`
- Response: `{ refined_intent: string }`
- Logic: Sends answers to AI service, receives refined intent, updates `final_intent` in SQLite.

**`session:confirm-intent`**
- Request: `{ session_id: string, final_intent: string }`
- Response: `{ success: boolean }`
- Logic: Updates `final_intent` in SQLite. Used for both confirming a refined intent and submitting an edited intent.

**`session:start`**
- Request: `{ session_id: string }`
- Response: `{ success: boolean }`
- Logic: Updates status to `"active"`, sets `started_at`. Capture service is not wired yet (built in Capture phase).

---

## Acceptance Criteria

- [ ] User can type an intent and submit it
- [ ] Intent is sent to AI service for vagueness checking
- [ ] If specific: success state shown, Start Recording button appears with privacy explanation
- [ ] If vague: clarifying questions displayed with text fields
- [ ] User can answer clarifying questions and submit
- [ ] Refined intent displayed with Confirm and Edit buttons
- [ ] Confirm saves the refined intent and shows success + Start Recording
- [ ] Edit makes the intent editable, user submits, accepted as-is, shows success + Start Recording
- [ ] Start Recording button updates session status to "active" in SQLite
- [ ] Empty intent cannot be submitted (button disabled)
- [ ] Empty clarifying answers cannot be submitted (button disabled)
- [ ] API failure shows "couldn't check your intent" message with "Start Recording Anyway" button
- [ ] Session is created in SQLite on first submit with correct fields
- [ ] All screens follow the design system (colors, typography, spacing, radius)
