const { autoUpdater } = require('electron-updater');
const { dialog, Notification } = require('electron');
const log = require('electron-log');
const { repository } = require('../../package.json');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Disable automatic download - we'll ask user first
autoUpdater.autoDownload = false;

// Store main window reference
let mainWindow = null;
let isManualCheck = false; // Track if user manually triggered check
let updateDownloaded = false; // Track if update is already downloaded
let downloadedVersion = null; // Track which version was downloaded

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

    // If this exact version is already downloaded, skip re-download
    if (updateDownloaded && downloadedVersion === info.version) {
      log.info(`Update ${info.version} already downloaded, skipping...`);
      return;
    }

    // Reset flag if this is a new version
    if (downloadedVersion && downloadedVersion !== info.version) {
      log.info(`New version ${info.version} available (previous: ${downloadedVersion}), resetting download flag`);
      updateDownloaded = false;
      downloadedVersion = null;
    }

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

          // Show notification that download started
          if (Notification.isSupported()) {
            new Notification({
              title: 'AirTV Update',
              body: `Downloading version ${info.version}...`
            }).show();
          }
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
    log.error('Error stack:', err.stack);

    // Check if it's a code signing error
    const isCodeSigningError = err.message && (
      err.message.includes('code signature') ||
      err.message.includes('did not pass validation') ||
      err.message.includes('code failed to satisfy')
    );

    if (isCodeSigningError && mainWindow && !mainWindow.isDestroyed()) {
      // Code signing error - suggest manual download
      dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Auto-Update Not Available',
        message: 'Automatic update failed due to code signing.',
        detail: 'Please download the latest version manually from the releases page.',
        buttons: ['Download Manually', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // Open releases page in browser
          // Extract repo URL from package.json (format: https://github.com/user/repo)
          const repoUrl = repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
          require('electron').shell.openExternal(`${repoUrl}/releases/latest`);
        }
      });
    } else if (isManualCheck && mainWindow && !mainWindow.isDestroyed()) {
      // Show generic error dialog only if user manually checked
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates.',
        detail: `${err.message}\n\nCheck logs for more details.`,
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
    updateDownloaded = true; // Mark as downloaded to prevent re-download
    downloadedVersion = info.version; // Store downloaded version

    // Show notification that download completed
    if (Notification.isSupported()) {
      new Notification({
        title: 'AirTV Update',
        body: `Version ${info.version} is ready to install!`
      }).show();
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} downloaded. Restart now?`,
        detail: 'The app will close and automatically reopen with the new version.',
        buttons: ['Restart', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // User clicked Restart
          setImmediate(() => {
            // Force app quit and install update
            // First param: isSilent (true = quit without dialogs)
            // Second param: forceRunAfter (true = restart app after install)
            autoUpdater.quitAndInstall(true, true);
          });
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
