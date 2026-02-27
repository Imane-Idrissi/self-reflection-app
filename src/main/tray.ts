import { Tray, nativeImage, BrowserWindow, Menu, ipcMain } from 'electron';

let tray: Tray | null = null;
let currentState: 'recording' | 'paused' = 'recording';
let currentSessionId: string | null = null;

function createTrayIcon(color: 'recording' | 'paused'): Electron.NativeImage {
  const size = 22;
  const canvas = Buffer.alloc(size * size * 4, 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = 5;

  const r = color === 'recording' ? 99 : 245;
  const g = color === 'recording' ? 102 : 158;
  const b = color === 'recording' ? 241 : 11;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const offset = (y * size + x) * 4;
        canvas[offset] = r;
        canvas[offset + 1] = g;
        canvas[offset + 2] = b;
        canvas[offset + 3] = 255;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function buildContextMenu(): Menu {
  const isPaused = currentState === 'paused';

  return Menu.buildFromTemplate([
    {
      label: isPaused ? 'Resume' : 'Pause',
      click: () => {
        if (!currentSessionId) return;
        const channel = isPaused ? 'session:resume' : 'session:pause';
        ipcMain.emit('tray-action', channel, currentSessionId);
      },
    },
    {
      label: 'End Session',
      click: () => {
        if (!currentSessionId) return;
        ipcMain.emit('tray-action', 'session:end', currentSessionId);
      },
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const win = windows[0];
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
    },
  ]);
}

export function showTray(state: 'recording' | 'paused', sessionId: string): void {
  currentState = state;
  currentSessionId = sessionId;
  const icon = createTrayIcon(state);
  const tooltip = state === 'recording' ? 'Unblurry — Recording' : 'Unblurry — Paused';

  if (tray) {
    tray.setImage(icon);
    tray.setToolTip(tooltip);
    tray.setContextMenu(buildContextMenu());
    return;
  }

  tray = new Tray(icon);
  tray.setToolTip(tooltip);
  tray.setContextMenu(buildContextMenu());
}

export function hideTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
  currentSessionId = null;
}
