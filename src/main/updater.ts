import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const isBeta = app.getVersion().includes('-beta');
  autoUpdater.allowPrerelease = isBeta;

  autoUpdater.on('update-downloaded', (info) => {
    const win = getMainWindow();
    win?.webContents.send('updater:update-ready', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  autoUpdater.checkForUpdates();
}

export function quitAndInstall() {
  autoUpdater.quitAndInstall();
}
