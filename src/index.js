const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const Store = require('electron-store').default;
const { parseM3UFile } = require('./main/playlistParser');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Enable hot reload in development
try {
  if (process.env.NODE_ENV === 'development') {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true,
    });
  }
} catch (_) {
  console.log('Error loading electron-reloader');
}

// Initialize electron-store
const store = new Store();

// Keep track of player windows
const playerWindows = new Map();
let mainWindow = null;
let settingsWindow = null;

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

  // Set app name for About menu
  app.setName('AirTV');

  // Load the index.html from webpack build
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Close all player windows when main window closes
  mainWindow.on('close', () => {
    playerWindows.forEach(({ window }) => {
      if (window && !window.isDestroyed()) {
        window.close();
      }
    });
  });
};

// Create floating player window
const createPlayerWindow = (data) => {
  // Check if there are other open player windows
  const hasOtherPlayers = playerWindows.size > 0;

  // Get last volume settings from store
  const lastVolume = store.get('lastVolume', 1.0);
  const lastMuted = store.get('lastMuted', false);
  const userAgent = store.get('userAgent', 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3');

  // Start muted if other windows exist (first window unmuted, others muted)
  const playerData = {
    ...data,
    volume: lastVolume,
    muted: hasOtherPlayers ? true : lastMuted,
    userAgent
  };

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

  // Load player HTML with channel data (channel, channelList, currentIndex, startMuted)
  const dataParam = encodeURIComponent(JSON.stringify(playerData));
  playerWindow.loadFile(path.join(__dirname, '../dist/player.html'), {
    query: { data: dataParam }
  });

  const windowId = Date.now().toString();
  playerWindows.set(windowId, { window: playerWindow, data: playerData });

  playerWindow.on('closed', () => {
    playerWindows.delete(windowId);
    // Reset muted state when last player window closes
    if (playerWindows.size === 0) {
      store.set('lastMuted', false);
    }
  });

  return windowId;
};

// Create settings window
const createSettingsWindow = () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    title: 'AirTV Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
  });

  settingsWindow.loadFile(path.join(__dirname, '../dist/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
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

// Save volume settings
ipcMain.on('save-volume-settings', (event, { volume, muted }) => {
  store.set('lastVolume', volume);
  store.set('lastMuted', muted);
});

// Settings
ipcMain.handle('open-settings', async () => {
  createSettingsWindow();
});

ipcMain.handle('get-settings', async () => {
  return {
    userAgent: store.get('userAgent', 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3')
  };
});

ipcMain.handle('save-settings', async (event, settings) => {
  if (settings.userAgent !== undefined) {
    store.set('userAgent', settings.userAgent);
  }
  return { success: true };
});

// Broadcast message to all player windows (except sender)
ipcMain.on('player:broadcast', (event, data) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  playerWindows.forEach(({ window }) => {
    if (window && !window.isDestroyed() && window !== senderWindow) {
      window.webContents.send('player:message', data);
    }
  });
});

// Broadcast to all players including sender
ipcMain.on('player:broadcast-all', (event, data) => {
  playerWindows.forEach(({ window }) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('player:message', data);
    }
  });
});

// Get player window info
ipcMain.handle('player:get-info', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  for (const [id, { window, data }] of playerWindows.entries()) {
    if (window === senderWindow) {
      return { id, playerData: data, totalPlayers: playerWindows.size };
    }
  }
  return null;
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
