const { app } = require('electron');
const log = require('electron-log');

/**
 * Check if the app was just updated and show release notes popup if so.
 * Call after mainWindow is created.
 */
function checkAndShow(mainWindow, store) {
  const currentVersion = app.getVersion();

  const lastVersion = store.get('lastLaunchedVersion');

  if (lastVersion && lastVersion !== currentVersion) {
    const notes = store.get('pendingReleaseNotes', null);
    log.info(`App updated from ${lastVersion} to ${currentVersion}`);

    if (notes && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('whats-new', {
              version: currentVersion,
              notes,
            });
          }
        }, 1000);
      });
    }

    store.delete('pendingReleaseNotes');
  }

  store.set('lastLaunchedVersion', currentVersion);
}

module.exports = { checkAndShow };
