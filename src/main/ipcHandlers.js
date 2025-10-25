const { ipcMain, dialog, BrowserWindow } = require('electron');
const { parseM3UFile } = require('./playlistParser');

/**
 * Register all IPC handlers
 */
function registerHandlers(store, playerWindows, getMainWindow, getSettingsWindow, createPlayerWindow, createSettingsWindow) {

  // Load playlist file
  ipcMain.handle('load-playlist', async (event, filePath) => {
    try {
      if (!filePath) {
        const mainWindow = getMainWindow();
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
}

module.exports = {
  registerHandlers
};
