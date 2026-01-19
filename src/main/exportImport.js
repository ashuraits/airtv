const { dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');

/**
 * Export all app data to JSON file
 */
async function exportData(store, mainWindow) {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export AirTV Data',
      defaultPath: `airtv-backup-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    // Collect all data
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      sources: store.get('sources', []),
      groups: store.get('groups', []),
      channels: store.get('channels', []),
      favorites: store.get('favorites', [])
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Import app data from JSON file
 */
async function importData(store, mainWindow) {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import AirTV Data',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const content = await fs.readFile(filePaths[0], 'utf8');
    const data = JSON.parse(content);

    // Validate structure
    if (!data.version || data.version !== 1) {
      return { success: false, error: 'Invalid or unsupported backup version' };
    }

    // Show confirmation dialog
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Import Data',
      message: 'This will replace all current data',
      detail: `Sources: ${(data.sources || []).length}\nGroups: ${(data.groups || []).length}\nChannels: ${(data.channels || []).length}\nFavorites: ${(data.favorites || []).length}`,
      buttons: ['Cancel', 'Import'],
      defaultId: 0,
      cancelId: 0
    });

    if (response !== 1) return { success: false, canceled: true };

    // Import data
    store.set('sources', data.sources || []);
    store.set('groups', data.groups || []);
    store.set('channels', data.channels || []);
    store.set('favorites', data.favorites || []);

    return { 
      success: true, 
      counts: {
        sources: (data.sources || []).length,
        groups: (data.groups || []).length,
        channels: (data.channels || []).length,
        favorites: (data.favorites || []).length
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Erase all app data with confirmation
 */
async function eraseAllData(store, mainWindow) {
  try {
    // Get current counts for confirmation dialog
    const sources = store.get('sources', []);
    const groups = store.get('groups', []);
    const channels = store.get('channels', []);
    const favorites = store.get('favorites', []);

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Erase All Data',
      message: 'This will permanently delete all data',
      detail: `Sources: ${sources.length}\nGroups: ${groups.length}\nChannels: ${channels.length}\nFavorites: ${favorites.length}\n\nThis action cannot be undone!`,
      buttons: ['Cancel', 'Erase All'],
      defaultId: 0,
      cancelId: 0
    });

    if (response !== 1) return { success: false, canceled: true };

    // Clear all data
    store.set('sources', []);
    store.set('groups', []);
    store.set('channels', []);
    store.set('favorites', []);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  exportData,
  importData,
  eraseAllData
};
