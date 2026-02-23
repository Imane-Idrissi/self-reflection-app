import { app, BrowserWindow } from 'electron';
import path from 'path';
import { getDatabase, closeDatabase } from './database/db';
import { SessionRepository } from './database/session-repository';
import { SessionService } from './services/session-service';
import { AiService } from './services/ai-service';
import { registerSessionHandlers } from './ipc/session-handlers';

let sessionService: SessionService;

function initServices() {
  const db = getDatabase();
  const sessionRepo = new SessionRepository(db);
  sessionService = new SessionService(sessionRepo);

  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const aiService = new AiService(apiKey);

  registerSessionHandlers(sessionService, aiService);

  sessionService.cleanupAbandoned();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
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
    mainWindow.show();
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  initServices();
  createWindow();
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
  closeDatabase();
});
