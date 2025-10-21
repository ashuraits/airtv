const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const Store = require('electron-store').default;
const { parseM3UFile } = require('./main/playlistParser');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize electron-store
const store = new Store();

// Keep track of player windows
const playerWindows = new Map();
let mainWindow = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AirTV',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
  });

  // Load the index.html from webpack build
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// Create floating player window
const createPlayerWindow = (data) => {
  const playerWindow = new BrowserWindow({
    width: 896,  // 640 * 1.4
    height: 504, // 360 * 1.4
    minWidth: 448,  // 320 * 1.4
    minHeight: 252, // 180 * 1.4
    alwaysOnTop: true,
    visibleOnAllWorkspaces: true,
    skipTaskbar: false,
    frame: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#000000',
  });

  // Load player HTML with channel data (channel, channelList, currentIndex)
  const dataParam = encodeURIComponent(JSON.stringify(data));
  playerWindow.loadFile(path.join(__dirname, '../dist/player.html'), {
    query: { data: dataParam }
  });

  const windowId = Date.now().toString();
  playerWindows.set(windowId, playerWindow);

  playerWindow.on('closed', () => {
    playerWindows.delete(windowId);
  });

  return windowId;
};

// IPC Handlers

// Load playlist file
ipcMain.handle('load-playlist', async (event, filePath) => {
  try {
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled) {
        return null;
      }

      filePath = result.filePaths[0];
    }

    const data = parseM3UFile(filePath);

    // Save to store
    store.set('currentPlaylist', data);
    store.set('playlistPath', filePath);

    return data;
  } catch (error) {
    console.error('Error loading playlist:', error);
    throw error;
  }
});

// Get stored playlist
ipcMain.handle('get-playlist', async () => {
  return store.get('currentPlaylist', null);
});

// Play channel
ipcMain.handle('play-channel', async (event, data) => {
  try {
    // data should contain: { channel, channelList, currentIndex }
    const windowId = createPlayerWindow(data);
    return windowId;
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
});

// Toggle pin on player window
ipcMain.on('toggle-pin', (event, isPinned) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.setAlwaysOnTop(isPinned);
    window.setVisibleOnAllWorkspaces(isPinned);
  }
});

// Close player window
ipcMain.on('close-player', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.close();
  }
});

// Favorites
ipcMain.handle('get-favorites', async () => {
  return store.get('favorites', []);
});

ipcMain.handle('add-favorite', async (event, channel) => {
  const favorites = store.get('favorites', []);
  const exists = favorites.find(f => f.url === channel.url);
  if (!exists) {
    favorites.push(channel);
    store.set('favorites', favorites);
  }
  return favorites;
});

ipcMain.handle('remove-favorite', async (event, channelUrl) => {
  const favorites = store.get('favorites', []);
  const filtered = favorites.filter(f => f.url !== channelUrl);
  store.set('favorites', filtered);
  return filtered;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
