import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import { runtimeDirectory } from './platform.js';

const dashboardUrl = `http://127.0.0.1:${Number(process.env.STREAMDEK_WIFI_PORT ?? 8_910)}`;
const iconPath = fileURLToPath(new URL('../assets/tray-icon.png', import.meta.url));
const runtimeRoot = runtimeDirectory();
const intentionalExitPath = join(runtimeRoot, 'desktop-exit');
const supervised = process.argv.includes('--supervised');

let tray: Tray | undefined;
let window: BrowserWindow | undefined;
let quitting = false;

function showWindow(): void {
  if (!window) {
    window = new BrowserWindow({
      width: 1100,
      height: 760,
      minWidth: 720,
      minHeight: 480,
      title: 'Streamdek',
      icon: iconPath,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    window.on('close', (event) => {
      if (!quitting) {
        event.preventDefault();
        window?.hide();
      }
    });
    window.on('closed', () => {
      window = undefined;
    });
  }

  void window.loadURL(dashboardUrl);
  window.show();
  window.focus();
}

function restart(): void {
  quitting = true;
  rmSync(intentionalExitPath, { force: true });
  app.exit(1);
}

function exit(): void {
  quitting = true;
  mkdirSync(runtimeRoot, { recursive: true });
  writeFileSync(intentionalExitPath, 'stopped by user');
  app.exit(0);
}

function createTray(): void {
  const image = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  if (process.platform === 'darwin') image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip('Streamdek');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Streamdek', click: showWindow },
    { label: 'Open in browser', click: () => void shell.openExternal(dashboardUrl) },
    { type: 'separator' },
    { label: 'Restart', click: restart },
    { label: 'Exit', click: exit },
  ]));
  tray.on('click', showWindow);
}

if (!supervised) rmSync(intentionalExitPath, { force: true });

if (supervised && existsSync(intentionalExitPath)) {
  app.quit();
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.on('window-all-closed', () => undefined);
  void app.whenReady().then(async () => {
    await import('./app.js');
    app.setAppUserModelId('com.jetcar.streamdek');
    if (process.platform === 'darwin') app.dock?.hide();
    createTray();
    if (!process.argv.includes('--background')) showWindow();
  });
}
