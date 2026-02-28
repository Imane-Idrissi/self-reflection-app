import { BrowserWindow, screen, ipcMain, app } from 'electron';
import path from 'path';

export interface FloatingState {
  session_id: string;
  status: 'active' | 'paused';
}

const INITIAL_WIDTH = 250;
const INITIAL_HEIGHT = 44;
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
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
      x: screenWidth - INITIAL_WIDTH - MARGIN,
      y: Math.round((screenHeight - INITIAL_HEIGHT) / 2),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      resizable: false,
      movable: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'floating-preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    this.win.setAlwaysOnTop(true, 'screen-saver');
    this.win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    this.win.setFullScreenable(false);

    if (!app.isPackaged) {
      this.win.loadURL('http://localhost:5173/floating.html');
    } else {
      this.win.loadFile(path.join(__dirname, '../renderer/floating.html'));
    }

    this.win.once('ready-to-show', () => {
      this.win?.showInactive();
    });

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

    ipcMain.on('floating:resize', (_event, { width, height, growDirection }: { width: number; height: number; growDirection?: 'up' | 'down' }) => {
      if (!this.win) return;

      const [currentX, currentY] = this.win.getPosition();
      const [currentW, currentH] = this.win.getSize();

      if (growDirection === 'down') {
        const newX = currentX + currentW - width;
        this.win.setSize(width, height);
        this.win.setPosition(newX, currentY);
      } else {
        const currentBottom = currentY + currentH;
        const currentRight = currentX + currentW;
        this.win.setSize(width, height);
        this.win.setPosition(currentRight - width, currentBottom - height);
      }
    });

    ipcMain.on('floating:move', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
      if (!this.win) return;

      const [x, y] = this.win.getPosition();
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
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

    ipcMain.on('floating:set-ignore-mouse', (_event, ignore: boolean) => {
      if (!this.win) return;
      if (ignore) {
        this.win.setIgnoreMouseEvents(true, { forward: true });
      } else {
        this.win.setIgnoreMouseEvents(false);
      }
    });
  }
}
