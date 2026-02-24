import { BrowserWindow, screen, ipcMain, app } from 'electron';
import path from 'path';

export interface FloatingState {
  session_id: string;
  status: 'active' | 'paused';
}

const BUTTON_WINDOW_SIZE = 72;
const MARGIN = 24;

export class FloatingWindowManager {
  private win: BrowserWindow | null = null;
  private state: FloatingState | null = null;

  constructor() {
    this.registerHandlers();
  }

  create(sessionId: string, status: 'active' | 'paused'): void {
    if (this.win) return;

    this.state = { session_id: sessionId, status };

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    this.win = new BrowserWindow({
      width: BUTTON_WINDOW_SIZE,
      height: BUTTON_WINDOW_SIZE,
      x: screenWidth - BUTTON_WINDOW_SIZE - MARGIN,
      y: screenHeight - BUTTON_WINDOW_SIZE - MARGIN,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'floating-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (!app.isPackaged) {
      this.win.loadURL('http://localhost:5173/floating.html');
    } else {
      this.win.loadFile(path.join(__dirname, '../renderer/floating.html'));
    }

    this.win.on('closed', () => {
      this.win = null;
    });
  }

  destroy(): void {
    if (this.win) {
      this.win.close();
      this.win = null;
    }
    this.state = null;
  }

  sendSessionState(status: 'active' | 'paused' | 'ended'): void {
    if (this.state && status !== 'ended') {
      this.state.status = status;
    }
    this.win?.webContents.send('floating:session-state-changed', { status });
  }

  isOpen(): boolean {
    return this.win !== null;
  }

  private registerHandlers(): void {
    ipcMain.handle('floating:get-state', () => this.state);

    ipcMain.on('floating:resize', (_event, { width, height }: { width: number; height: number }) => {
      if (!this.win) return;

      const [currentX, currentY] = this.win.getPosition();
      const [currentW, currentH] = this.win.getSize();

      const currentBottom = currentY + currentH;
      const currentRight = currentX + currentW;

      const newX = currentRight - width;
      const newY = currentBottom - height;

      this.win.setSize(width, height);
      this.win.setPosition(newX, newY);
    });

    ipcMain.on('floating:move', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
      if (!this.win) return;

      const [x, y] = this.win.getPosition();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      const [winWidth, winHeight] = this.win.getSize();

      const newX = Math.max(0, Math.min(x + deltaX, screenWidth - winWidth));
      const newY = Math.max(0, Math.min(y + deltaY, screenHeight - winHeight));

      this.win.setPosition(newX, newY);
    });

    ipcMain.on('floating:dismissed', () => {
      if (this.win) {
        this.win.blur();
      }
    });
  }
}
