import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      // point to your preload file
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    },
  });

  const startURL =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, '../out/index.html')}`;

  win.loadURL(startURL);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});