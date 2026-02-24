import { Tray, nativeImage, BrowserWindow } from 'electron';

let tray: Tray | null = null;

function createTrayIcon(color: 'recording' | 'paused'): Electron.NativeImage {
  const size = 22;
  const canvas = Buffer.alloc(size * size * 4, 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = 5;

  const r = color === 'recording' ? 99 : 168;
  const g = color === 'recording' ? 102 : 162;
  const b = color === 'recording' ? 241 : 158;

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

export function showTray(state: 'recording' | 'paused'): void {
  const icon = createTrayIcon(state);

  if (tray) {
    tray.setImage(icon);
    tray.setToolTip(state === 'recording' ? 'Self Reflection — Recording' : 'Self Reflection — Paused');
    return;
  }

  tray = new Tray(icon);
  tray.setToolTip(state === 'recording' ? 'Self Reflection — Recording' : 'Self Reflection — Paused');

  tray.on('click', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

export function hideTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
