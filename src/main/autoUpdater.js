const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Disable automatic download - we'll ask user first
autoUpdater.autoDownload = false;

// Store main window reference
let mainWindow = null;
let isManualCheck = false; // Track if user manually triggered check

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
      // Silent check on startup (don't set isManualCheck flag)
      autoUpdater.checkForUpdates();
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
        message: `New version ${info.version} is available. Download now?`,
        detail: 'The update will be installed when you restart the app.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // User clicked Download
          autoUpdater.downloadUpdate();
        }
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available. Current version:', info.version);
    // Only show dialog if user manually checked
    if (isManualCheck && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are already running the latest version.',
        buttons: ['OK']
      });
    }
    isManualCheck = false; // Reset flag
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    // Only show dialog if user manually checked
    if (isManualCheck && mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates.',
        detail: err.message,
        buttons: ['OK']
      });
    }
    isManualCheck = false; // Reset flag
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
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1
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
  isManualCheck = true; // Mark as manual check
  autoUpdater.checkForUpdates();
}

module.exports = {
  initialize,
  checkForUpdates
};
