import { app, BrowserWindow } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './database/db';
import { SessionRepository } from './database/session-repository';
import { SessionEventsRepository } from './database/session-events-repository';
import { SessionService } from './services/session-service';
import { AiService } from './services/ai-service';
import { registerSessionHandlers } from './ipc/session-handlers';

let sessionService: SessionService;
let mainWindow: BrowserWindow | null = null;
let autoEndInterval: ReturnType<typeof setInterval> | null = null;

const AUTO_END_CHECK_INTERVAL_MS = 60_000;
const AUTO_END_WARNING_MINUTES = 450; // 7.5 hours
const AUTO_END_LIMIT_MINUTES = 480; // 8 hours

function initServices() {
  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  const eventsRepo = new SessionEventsRepository(db);
  sessionService = new SessionService(sessionRepo, eventsRepo);

  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const aiService = new AiService(apiKey);

  registerSessionHandlers(sessionService, aiService);

  sessionService.cleanupAbandoned();
}

function startAutoEndTimer() {
  if (autoEndInterval) return;

  autoEndInterval = setInterval(() => {
    if (!sessionService.hasActiveSession()) return;

    const sessions = sessionService['repo'].findByStatuses(['active']);
    if (sessions.length === 0) return;

    const session = sessions[0];
    const activeMinutes = sessionService.getActiveTimeMinutes(session.session_id);

    if (activeMinutes >= AUTO_END_LIMIT_MINUTES) {
      const summary = sessionService.endSession(session.session_id, 'auto');
      mainWindow?.webContents.send('session:auto-end-triggered', summary);
    } else if (activeMinutes >= AUTO_END_WARNING_MINUTES) {
      mainWindow?.webContents.send('session:auto-end-warning');
    }
  }, AUTO_END_CHECK_INTERVAL_MS);
}

function stopAutoEndTimer() {
  if (autoEndInterval) {
    clearInterval(autoEndInterval);
    autoEndInterval = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initServices();
  createWindow();
  startAutoEndTimer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopAutoEndTimer();
  closeDatabase();
});
