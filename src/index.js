const { app, BrowserWindow } = require('electron');
const Store = require('electron-store').default;
const windowManager = require('./main/windowManager');
const ipcHandlers = require('./main/ipcHandlers');
const sourcesStore = require('./main/sourcesStore');
const autoUpdater = require('./main/autoUpdater');
const menu = require('./main/menu');
const exportImport = require('./main/exportImport');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Enable hot reload in development
try {
  if (process.env.NODE_ENV === 'development') {
    require('electron-reloader')(module, {
      debug: false,
      watchRenderer: false, // Webpack handles renderer reload
      ignore: [
        /node_modules/,
        /dist/,
        /out/,
        /\.git/,
      ]
    });
  }
} catch (_) {
  console.log('Error loading electron-reloader');
}

// Initialize electron-store
const store = new Store();

// Initialize data layer and migration
sourcesStore.initialize(store);
try {
  sourcesStore.migrateIfNeeded(store);
} catch (e) {
  console.error('Migration error:', e);
}

// Initialize window manager
windowManager.initialize(store);

// Register IPC handlers
ipcHandlers.registerHandlers(
  store,
  sourcesStore,
  windowManager.getPlayerWindows(),
  windowManager.getMainWindow,
  windowManager.getSettingsWindow,
  windowManager.createPlayerWindow,
  windowManager.createSettingsWindow
);

// App lifecycle
app.whenReady().then(() => {
  // Setup menu with settings, updates, and export/import
  menu.setSettingsWindowCreator(windowManager.createSettingsWindow);
  menu.setCheckForUpdates(autoUpdater.checkForUpdates);
  menu.setExportData(() => exportImport.exportData(store, mainWindow));
  menu.setImportData(async () => {
    const result = await exportImport.importData(store, mainWindow);
    if (result.success) mainWindow.webContents.send('data-imported');
  });
  menu.setEraseData(async () => {
    const result = await exportImport.eraseAllData(store, mainWindow);
    if (result.success) mainWindow.webContents.send('data-imported');
  });
  menu.createMenu();

  const mainWindow = windowManager.createMainWindow();

  // Initialize auto-updater
  autoUpdater.initialize(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
