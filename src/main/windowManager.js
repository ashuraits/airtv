const { BrowserWindow } = require('electron');
const path = require('node:path');

// Keep track of windows
const playerWindows = new Map();
let mainWindow = null;
let settingsWindow = null;
let store = null;

/**
 * Initialize window manager with store
 */
function initialize(electronStore) {
  store = electronStore;
}

/**
 * Create main application window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AirTV',
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
  });

  // Set app name for About menu
  const { app } = require('electron');
  app.setName('AirTV');

  // Load the index.html from webpack build
  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));

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

  return mainWindow;
}

/**
 * Create floating player window
 */
function createPlayerWindow(data) {
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
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#000000',
  });

  // Load player HTML with channel data
  const dataParam = encodeURIComponent(JSON.stringify(playerData));
  playerWindow.loadFile(path.join(__dirname, '../../dist/player.html'), {
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
}

/**
 * Create settings window
 */
function createSettingsWindow() {
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
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a1a',
  });

  settingsWindow.loadFile(path.join(__dirname, '../../dist/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/**
 * Get main window reference
 */
function getMainWindow() {
  return mainWindow;
}

/**
 * Get settings window reference
 */
function getSettingsWindow() {
  return settingsWindow;
}

/**
 * Get player windows map
 */
function getPlayerWindows() {
  return playerWindows;
}

module.exports = {
  initialize,
  createMainWindow,
  createPlayerWindow,
  createSettingsWindow,
  getMainWindow,
  getSettingsWindow,
  getPlayerWindows
};
