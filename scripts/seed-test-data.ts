/**
 * Seed script for end-to-end testing.
 *
 * better-sqlite3 is compiled against Electron's Node.js, so we must run
 * this script via Electron's runtime with ELECTRON_RUN_AS_NODE=1.
 *
 * Usage:
 *   npm run seed             # Insert 7 test sessions
 *   npm run seed -- --clear  # Remove all [TEST] sessions
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// DB path — mirrors what the Electron app uses
// ---------------------------------------------------------------------------

function getDbPath(): string {
  const platform = os.platform();
  let userDataPath: string;

  if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'unblurry');
  } else if (platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'unblurry');
  } else {
    userDataPath = path.join(os.homedir(), '.config', 'unblurry');
  }

  return path.join(userDataPath, 'unblurry.db');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(date: Date): string {
  return date.toISOString();
}

function minutesAfter(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

const TEST_PREFIX = '[TEST] ';

// ---------------------------------------------------------------------------
// Capture generation
// ---------------------------------------------------------------------------

interface WindowActivity {
  app_name: string;
  window_title: string;
  durationMinutes: number;
}

function generateCaptures(
  db: Database.Database,
  sessionId: string,
  startTime: Date,
  activities: WindowActivity[],
): void {
  const stmt = db.prepare(
    'INSERT INTO capture (capture_id, session_id, window_title, app_name, captured_at) VALUES (?, ?, ?, ?, ?)',
  );

  let cursor = new Date(startTime);

  for (const activity of activities) {
    const endTime = minutesAfter(cursor, activity.durationMinutes);
    // One capture every 3 seconds
    while (cursor < endTime) {
      stmt.run(randomUUID(), sessionId, activity.window_title, activity.app_name, iso(cursor));
      cursor = new Date(cursor.getTime() + 3_000);
    }
  }
}

// ---------------------------------------------------------------------------
// Feeling generation
// ---------------------------------------------------------------------------

function insertFeelings(
  db: Database.Database,
  sessionId: string,
  startTime: Date,
  feelings: { minutesIn: number; text: string }[],
): void {
  const stmt = db.prepare(
    'INSERT INTO feeling (feeling_id, session_id, text, created_at) VALUES (?, ?, ?, ?)',
  );

  for (const f of feelings) {
    stmt.run(randomUUID(), sessionId, f.text, iso(minutesAfter(startTime, f.minutesIn)));
  }
}

// ---------------------------------------------------------------------------
// Session creation helper
// ---------------------------------------------------------------------------

interface SessionSpec {
  intent: string;
  activities: WindowActivity[];
  feelings: { minutesIn: number; text: string }[];
  pauseAt?: number; // minutes into session to pause
  pauseDuration?: number; // minutes of pause
}

function createTestSession(db: Database.Database, spec: SessionSpec, baseDate: Date): void {
  const sessionId = randomUUID();
  const name = TEST_PREFIX + spec.intent;

  const totalActivityMinutes = spec.activities.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalMinutes = totalActivityMinutes + (spec.pauseDuration ?? 0);

  const startedAt = baseDate;
  const endedAt = minutesAfter(startedAt, totalMinutes);

  db.prepare(
    `INSERT INTO session (session_id, name, original_intent, final_intent, status, started_at, ended_at, ended_by, created_at)
     VALUES (?, ?, ?, ?, 'ended', ?, ?, 'user', ?)`,
  ).run(sessionId, name, spec.intent, spec.intent, iso(startedAt), iso(endedAt), iso(startedAt));

  // Pause/resume events
  if (spec.pauseAt != null && spec.pauseDuration != null) {
    const pauseTime = minutesAfter(startedAt, spec.pauseAt);
    const resumeTime = minutesAfter(pauseTime, spec.pauseDuration);

    const eventStmt = db.prepare(
      'INSERT INTO session_events (event_id, session_id, event_type, created_at) VALUES (?, ?, ?, ?)',
    );
    eventStmt.run(randomUUID(), sessionId, 'paused', iso(pauseTime));
    eventStmt.run(randomUUID(), sessionId, 'resumed', iso(resumeTime));

    // Split activities around the pause
    const activitiesBefore: WindowActivity[] = [];
    const activitiesAfter: WindowActivity[] = [];
    let elapsed = 0;

    for (const act of spec.activities) {
      if (elapsed + act.durationMinutes <= spec.pauseAt) {
        activitiesBefore.push(act);
      } else if (elapsed >= spec.pauseAt) {
        activitiesAfter.push(act);
      } else {
        // Activity spans the pause point — split it
        const beforePortion = spec.pauseAt - elapsed;
        const afterPortion = act.durationMinutes - beforePortion;
        activitiesBefore.push({ ...act, durationMinutes: beforePortion });
        activitiesAfter.push({ ...act, durationMinutes: afterPortion });
      }
      elapsed += act.durationMinutes;
    }

    generateCaptures(db, sessionId, startedAt, activitiesBefore);
    generateCaptures(db, sessionId, resumeTime, activitiesAfter);
  } else {
    generateCaptures(db, sessionId, startedAt, spec.activities);
  }

  insertFeelings(db, sessionId, startedAt, spec.feelings);
}

// ---------------------------------------------------------------------------
// 7 test scenarios
// ---------------------------------------------------------------------------

function seedAll(db: Database.Database): void {
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  // 1. Focused session — ~1 hour, all coding + docs
  createTestSession(db, {
    intent: 'Write the authentication module.',
    activities: [
      { app_name: 'com.microsoft.VSCode', window_title: 'auth.ts — unblurry', durationMinutes: 20 },
      { app_name: 'com.microsoft.VSCode', window_title: 'auth-service.ts — unblurry', durationMinutes: 15 },
      { app_name: 'com.google.Chrome', window_title: 'JWT Best Practices — Auth0 Docs', durationMinutes: 5 },
      { app_name: 'com.microsoft.VSCode', window_title: 'auth.test.ts — unblurry', durationMinutes: 15 },
      { app_name: 'com.apple.Terminal', window_title: 'npm test — ~/projects/unblurry', durationMinutes: 5 },
    ],
    feelings: [
      { minutesIn: 10, text: 'feeling good, making progress' },
      { minutesIn: 35, text: 'in the zone, tests are passing' },
      { minutesIn: 55, text: 'almost done, satisfied with the design' },
    ],
  }, today);

  // 2. Distracted session — ~1.5 hours, lots of context switching
  createTestSession(db, {
    intent: 'Finish the API integration.',
    activities: [
      { app_name: 'com.microsoft.VSCode', window_title: 'api-client.ts — unblurry', durationMinutes: 8 },
      { app_name: 'com.google.Chrome', window_title: 'Twitter / X', durationMinutes: 7 },
      { app_name: 'com.microsoft.VSCode', window_title: 'api-client.ts — unblurry', durationMinutes: 5 },
      { app_name: 'com.google.Chrome', window_title: 'YouTube — How to center a div', durationMinutes: 10 },
      { app_name: 'com.tinyspeck.slackmacgap', window_title: '#general — Slack', durationMinutes: 6 },
      { app_name: 'com.microsoft.VSCode', window_title: 'api-client.ts — unblurry', durationMinutes: 10 },
      { app_name: 'com.google.Chrome', window_title: 'Reddit — r/programming', durationMinutes: 12 },
      { app_name: 'com.microsoft.VSCode', window_title: 'api-types.ts — unblurry', durationMinutes: 7 },
      { app_name: 'com.google.Chrome', window_title: 'Twitter / X', durationMinutes: 8 },
      { app_name: 'com.microsoft.VSCode', window_title: 'api-client.test.ts — unblurry', durationMinutes: 5 },
      { app_name: 'com.google.Chrome', window_title: 'YouTube — lofi hip hop radio', durationMinutes: 12 },
    ],
    feelings: [
      { minutesIn: 15, text: "can't focus today" },
      { minutesIn: 30, text: 'bored, keep checking social media' },
      { minutesIn: 60, text: 'frustrated, not making progress' },
      { minutesIn: 80, text: 'trying to get back on track' },
    ],
  }, minutesAfter(today, 90));

  // 3. No feeling logs — realistic captures, zero feelings
  createTestSession(db, {
    intent: 'Review pull requests.',
    activities: [
      { app_name: 'com.google.Chrome', window_title: 'Pull Request #42 — GitHub', durationMinutes: 12 },
      { app_name: 'com.microsoft.VSCode', window_title: 'diff — user-service.ts', durationMinutes: 8 },
      { app_name: 'com.google.Chrome', window_title: 'Pull Request #43 — GitHub', durationMinutes: 10 },
      { app_name: 'com.google.Chrome', window_title: 'Pull Request #44 — GitHub', durationMinutes: 15 },
      { app_name: 'com.microsoft.VSCode', window_title: 'diff — config.ts', durationMinutes: 5 },
      { app_name: 'com.google.Chrome', window_title: 'CI Checks — Pull Request #44', durationMinutes: 5 },
    ],
    feelings: [],
  }, minutesAfter(today, 210));

  // 4. Many feeling logs — lots of emotional check-ins (~10)
  createTestSession(db, {
    intent: 'Design the onboarding flow.',
    activities: [
      { app_name: 'com.figma.Desktop', window_title: 'Onboarding v2 — Figma', durationMinutes: 15 },
      { app_name: 'com.google.Chrome', window_title: 'Dribbble — Onboarding Inspiration', durationMinutes: 5 },
      { app_name: 'com.figma.Desktop', window_title: 'Onboarding v2 — Figma', durationMinutes: 10 },
      { app_name: 'com.microsoft.VSCode', window_title: 'Onboarding.tsx — unblurry', durationMinutes: 15 },
      { app_name: 'com.google.Chrome', window_title: 'Tailwind CSS Docs — Transitions', durationMinutes: 3 },
      { app_name: 'com.microsoft.VSCode', window_title: 'Onboarding.tsx — unblurry', durationMinutes: 12 },
      { app_name: 'com.figma.Desktop', window_title: 'Onboarding v2 — Figma', durationMinutes: 10 },
    ],
    feelings: [
      { minutesIn: 3, text: 'excited to start this' },
      { minutesIn: 8, text: 'exploring ideas, feeling creative' },
      { minutesIn: 15, text: 'found a good direction' },
      { minutesIn: 22, text: 'a bit overwhelmed by options' },
      { minutesIn: 30, text: 'narrowed it down, feeling better' },
      { minutesIn: 38, text: 'coding it up, in flow state' },
      { minutesIn: 45, text: 'hit a tricky layout issue' },
      { minutesIn: 50, text: 'resolved it, feels clean now' },
      { minutesIn: 58, text: 'polishing transitions, satisfying work' },
      { minutesIn: 65, text: 'happy with the result' },
    ],
  }, minutesAfter(today, 300));

  // 5. Very short session — 5 minutes only
  createTestSession(db, {
    intent: 'Quick bug fix.',
    activities: [
      { app_name: 'com.microsoft.VSCode', window_title: 'session-service.ts — unblurry', durationMinutes: 3 },
      { app_name: 'com.apple.Terminal', window_title: 'npm test — ~/projects/unblurry', durationMinutes: 2 },
    ],
    feelings: [
      { minutesIn: 4, text: 'found it, easy fix' },
    ],
  }, minutesAfter(today, 380));

  // 6. Very long session — 4 hours with a 30-min pause in the middle
  createTestSession(db, {
    intent: 'Deep work on the report engine.',
    activities: [
      { app_name: 'com.microsoft.VSCode', window_title: 'report-service.ts — unblurry', durationMinutes: 30 },
      { app_name: 'com.microsoft.VSCode', window_title: 'ai-prompt-builder.ts — unblurry', durationMinutes: 25 },
      { app_name: 'com.google.Chrome', window_title: 'Gemini API Reference — Google AI', durationMinutes: 10 },
      { app_name: 'com.microsoft.VSCode', window_title: 'report-parser.ts — unblurry', durationMinutes: 25 },
      // pause happens at 90 minutes, lasts 30 minutes
      { app_name: 'com.microsoft.VSCode', window_title: 'report-parser.ts — unblurry', durationMinutes: 20 },
      { app_name: 'com.microsoft.VSCode', window_title: 'report-service.test.ts — unblurry', durationMinutes: 30 },
      { app_name: 'com.apple.Terminal', window_title: 'npm test — ~/projects/unblurry', durationMinutes: 10 },
      { app_name: 'com.microsoft.VSCode', window_title: 'report-renderer.tsx — unblurry', durationMinutes: 25 },
      { app_name: 'com.google.Chrome', window_title: 'Chart.js Docs — Bar Charts', durationMinutes: 5 },
      { app_name: 'com.microsoft.VSCode', window_title: 'report-renderer.tsx — unblurry', durationMinutes: 30 },
    ],
    feelings: [
      { minutesIn: 20, text: 'getting into it, complex but interesting' },
      { minutesIn: 60, text: 'making solid progress on the parser' },
      { minutesIn: 85, text: 'need a break, mentally tired' },
      { minutesIn: 130, text: 'back and refreshed, lets go' },
      { minutesIn: 180, text: 'deep in test writing, feels thorough' },
      { minutesIn: 230, text: 'wrapping up, proud of this work' },
    ],
    pauseAt: 90,
    pauseDuration: 30,
  }, minutesAfter(today, 400));

  // 7. Vague intent — mixed activity, non-specific goal
  createTestSession(db, {
    intent: 'Be productive.',
    activities: [
      { app_name: 'com.google.Chrome', window_title: 'Gmail — Inbox (12)', durationMinutes: 10 },
      { app_name: 'com.tinyspeck.slackmacgap', window_title: '#team-standup — Slack', durationMinutes: 8 },
      { app_name: 'com.microsoft.VSCode', window_title: 'README.md — unblurry', durationMinutes: 5 },
      { app_name: 'com.google.Chrome', window_title: 'Notion — Sprint Planning', durationMinutes: 12 },
      { app_name: 'com.microsoft.VSCode', window_title: 'config.ts — unblurry', durationMinutes: 7 },
      { app_name: 'com.google.Chrome', window_title: 'Google Calendar', durationMinutes: 5 },
      { app_name: 'com.microsoft.VSCode', window_title: 'index.ts — unblurry', durationMinutes: 8 },
      { app_name: 'com.tinyspeck.slackmacgap', window_title: 'DM — Alice — Slack', durationMinutes: 5 },
    ],
    feelings: [
      { minutesIn: 15, text: 'just doing random stuff' },
      { minutesIn: 40, text: "not sure what I should focus on" },
    ],
  }, minutesAfter(today, 660));
}

// ---------------------------------------------------------------------------
// Clear — remove all [TEST] sessions and associated data
// ---------------------------------------------------------------------------

function clearAll(db: Database.Database): void {
  const sessions = db
    .prepare("SELECT session_id FROM session WHERE name LIKE ?")
    .all(`${TEST_PREFIX}%`) as { session_id: string }[];

  if (sessions.length === 0) {
    console.log('No [TEST] sessions found. Nothing to clear.');
    return;
  }

  const ids = sessions.map((s) => s.session_id);
  const placeholders = ids.map(() => '?').join(', ');

  db.prepare(`DELETE FROM reports WHERE session_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM feeling WHERE session_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM capture WHERE session_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM session_events WHERE session_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM session WHERE session_id IN (${placeholders})`).run(...ids);

  console.log(`Cleared ${sessions.length} [TEST] session(s) and all associated data.`);
}

// ---------------------------------------------------------------------------
// Schema — mirrors src/main/database/db.ts so the script works standalone
// ---------------------------------------------------------------------------

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS session (
      session_id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      original_intent TEXT NOT NULL,
      final_intent TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      started_at TEXT,
      ended_at TEXT,
      ended_by TEXT,
      created_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      event_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS capture (
      capture_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      window_title TEXT NOT NULL,
      app_name TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeling (
      feeling_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      summary TEXT,
      patterns TEXT,
      suggestions TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES session(session_id)
    )
  `);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const clearFlag = process.argv.includes('--clear');
  const dbPath = getDbPath();

  console.log(`Database: ${dbPath}`);

  // Ensure the directory exists (app may not have been launched yet)
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  ensureSchema(db);

  try {
    if (clearFlag) {
      clearAll(db);
    } else {
      // Check for existing test sessions
      const existing = db
        .prepare("SELECT COUNT(*) as count FROM session WHERE name LIKE ?")
        .get(`${TEST_PREFIX}%`) as { count: number };

      if (existing.count > 0) {
        console.log(`Found ${existing.count} existing [TEST] session(s). Run with --clear first to remove them.`);
        process.exit(1);
      }

      console.log('Seeding 7 test sessions...\n');

      const startTime = Date.now();
      seedAll(db);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const captureCount = db
        .prepare(`SELECT COUNT(*) as count FROM capture WHERE session_id IN (SELECT session_id FROM session WHERE name LIKE ?)`)
        .get(`${TEST_PREFIX}%`) as { count: number };
      const feelingCount = db
        .prepare(`SELECT COUNT(*) as count FROM feeling WHERE session_id IN (SELECT session_id FROM session WHERE name LIKE ?)`)
        .get(`${TEST_PREFIX}%`) as { count: number };

      console.log(`Done in ${elapsed}s.`);
      console.log(`  Sessions:  7`);
      console.log(`  Captures:  ${captureCount.count.toLocaleString()}`);
      console.log(`  Feelings:  ${feelingCount.count.toLocaleString()}`);
      console.log('\nOpen the app to see them in the dashboard.');
      console.log('Run with --clear to remove all test data when done.');
    }
  } finally {
    db.close();
  }
}

main();
