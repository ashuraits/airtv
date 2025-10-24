const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Allow dev testing (remove in production or use env var)
if (process.env.NODE_ENV === 'development') {
  autoUpdater.forceDevUpdateConfig = true;
}

// Store main window reference
let mainWindow = null;

/**
 * Initialize auto-updater with main window reference
 */
function initialize(window) {
  mainWindow = window;

  // Setup event handlers
  setupEventHandlers();

  // Check for updates on start (skip in development)
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      checkForUpdates();
    }, 3000); // Wait 3 seconds after app start
  }
}

/**
 * Setup auto-updater event handlers
 */
function setupEventHandlers() {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `New version ${info.version} found. Downloading in background...`,
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available. Current version:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are already running the latest version.',
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates.',
        detail: err.message,
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const message = `Speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
    log.info(message);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} downloaded. Restart now?`,
        buttons: ['Restart', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });
}

/**
 * Manually check for updates
 */
function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = {
  initialize,
  checkForUpdates
};
