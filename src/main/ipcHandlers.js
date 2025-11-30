const { ipcMain, dialog, BrowserWindow } = require('electron');
const { parseM3UFile } = require('./playlistParser');

/**
 * Register all IPC handlers
 */
function registerHandlers(store, sourcesStore, playerWindows, getMainWindow, getSettingsWindow, createPlayerWindow, createSettingsWindow) {

  // Helper: notify main window to refresh library
  const notifyLibraryChanged = () => {
    try {
      const mw = getMainWindow();
      if (mw && !mw.isDestroyed()) {
        mw.webContents.send('library:refresh');
      }
    } catch (_) {}
  };

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

  // Open file picker for M3U (Add Source: File)
  ipcMain.handle('open-m3u-dialog', async () => {
    const mainWindow = getMainWindow();
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled) return null;
    return result.filePaths[0] || null;
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

  // Multi-source: Sources
  ipcMain.handle('sources:list', async () => {
    return sourcesStore.listSources(store);
  });

  ipcMain.handle('sources:add', async (event, payload) => {
    const res = sourcesStore.addSource(store, payload);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('sources:update', async (event, { id, data }) => {
    const res = sourcesStore.updateSource(store, id, data);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('sources:delete', async (event, id) => {
    const res = sourcesStore.deleteSource(store, id);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('sources:resync', async (event, id) => {
    const res = await sourcesStore.resyncSource(store, id);
    if (res && res.success) notifyLibraryChanged();
    return res;
  });

  // Incremental sync preview/apply
  ipcMain.handle('sources:resync-preview', async (event, id) => {
    return sourcesStore.resyncPreview(store, id);
  });
  ipcMain.handle('sources:resync-apply', async (event, id) => {
    const res = await sourcesStore.resyncApply(store, id);
    if (res && res.success) notifyLibraryChanged();
    return res;
  });

  // Preview categories for a new source payload (no persistence)
  ipcMain.handle('sources:preview-categories', async (event, payload) => {
    const importer = require('./importer');
    try {
      return await importer.previewCategories(store, payload);
    } catch (e) {
      return { success: false, error: String(e && e.message ? e.message : e) };
    }
  });

  // Test connection for a new source payload (no persistence)
  ipcMain.handle('sources:test-connection', async (event, payload) => {
    const importer = require('./importer');
    try {
      await importer.testConnection(store, payload);
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e && e.message ? e.message : e) };
    }
  });

  // Multi-source: Groups
  ipcMain.handle('groups:list', async () => {
    return sourcesStore.listGroups(store);
  });

  ipcMain.handle('groups:create', async (event, name) => {
    const res = sourcesStore.createGroup(store, name);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('groups:rename', async (event, { id, name }) => {
    const res = sourcesStore.renameGroup(store, id, name);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('groups:reorder', async (event, ids) => {
    const res = sourcesStore.reorderGroups(store, ids);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('groups:delete', async (event, { id, strategy }) => {
    const res = sourcesStore.deleteGroup(store, id, strategy);
    notifyLibraryChanged();
    return res;
  });

  // Multi-source: Channels
  ipcMain.handle('channels:list', async (event, filters) => {
    return sourcesStore.listChannels(store, filters || {});
  });

  ipcMain.handle('channels:move', async (event, { ids, targetGroupId }) => {
    const res = sourcesStore.moveChannels(store, ids, targetGroupId);
    notifyLibraryChanged();
    return res;
  });

  ipcMain.handle('channels:delete', async (event, ids) => {
    const res = sourcesStore.deleteChannels(store, ids);
    notifyLibraryChanged();
    return res;
  });
}

module.exports = {
  registerHandlers
};
