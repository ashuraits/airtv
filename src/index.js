const { app, BrowserWindow } = require('electron');
const Store = require('electron-store').default;
const windowManager = require('./main/windowManager');
const ipcHandlers = require('./main/ipcHandlers');
const autoUpdater = require('./main/autoUpdater');
const menu = require('./main/menu');

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

// Initialize window manager
windowManager.initialize(store);

// Register IPC handlers
ipcHandlers.registerHandlers(
  store,
  windowManager.getPlayerWindows(),
  windowManager.getMainWindow,
  windowManager.getSettingsWindow,
  windowManager.createPlayerWindow,
  windowManager.createSettingsWindow
);

// App lifecycle
app.whenReady().then(() => {
  // Setup menu with settings and updates
  menu.setSettingsWindowCreator(windowManager.createSettingsWindow);
  menu.setCheckForUpdates(autoUpdater.checkForUpdates);
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
