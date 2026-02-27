import { Tray, nativeImage, BrowserWindow, Menu } from 'electron';
import { deflateSync } from 'zlib';

export interface TrayActions {
  onPause: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  onEnd: (sessionId: string) => void;
}

let tray: Tray | null = null;
let currentState: 'recording' | 'paused' = 'recording';
let currentSessionId: string | null = null;
let currentActions: TrayActions | null = null;
let getMainWindow: (() => BrowserWindow | null) | null = null;

function buildPng(width: number, height: number, rgba: Buffer): Buffer {
  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createTrayIcon(color: 'recording' | 'paused'): Electron.NativeImage {
  const size = 32;
  const rgba = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = 7;
  const borderWidth = 2;
  const outerRadius = radius + borderWidth;

  const r = color === 'recording' ? 99 : 245;
  const g = color === 'recording' ? 102 : 158;
  const b = color === 'recording' ? 241 : 11;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const off = (y * size + x) * 4;

      if (dist <= radius) {
        // Inner colored circle
        const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255;
        rgba[off] = r;
        rgba[off + 1] = g;
        rgba[off + 2] = b;
        rgba[off + 3] = alpha;
      } else if (dist <= outerRadius) {
        // White border ring
        const alpha = dist > outerRadius - 1 ? Math.round((outerRadius - dist) * 255) : 255;
        rgba[off] = 255;
        rgba[off + 1] = 255;
        rgba[off + 2] = 255;
        rgba[off + 3] = alpha;
      }
    }
  }

  const png = buildPng(size, size, rgba);
  const image = nativeImage.createFromBuffer(png, { scaleFactor: 2 });
  image.setTemplateImage(false);
  return image;
}

function buildContextMenu(): Menu {
  const isPaused = currentState === 'paused';

  return Menu.buildFromTemplate([
    {
      label: isPaused ? 'Resume' : 'Pause',
      click: () => {
        if (!currentSessionId || !currentActions) return;
        if (isPaused) currentActions.onResume(currentSessionId);
        else currentActions.onPause(currentSessionId);
      },
    },
    {
      label: 'End Session',
      click: () => {
        if (!currentSessionId || !currentActions) return;
        currentActions.onEnd(currentSessionId);
      },
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        const win = getMainWindow?.();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
    },
  ]);
}

export function showTray(state: 'recording' | 'paused', sessionId: string, actions?: TrayActions, mainWindowGetter?: () => BrowserWindow | null): void {
  currentState = state;
  currentSessionId = sessionId;
  if (actions) currentActions = actions;
  if (mainWindowGetter) getMainWindow = mainWindowGetter;
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
