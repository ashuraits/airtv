const { Menu, app, BrowserWindow } = require('electron');

let createSettingsWindowFn = null;
let checkForUpdatesFn = null;
let exportDataFn = null;
let importDataFn = null;
let eraseDataFn = null;

/**
 * Set settings window creator function
 */
function setSettingsWindowCreator(fn) {
  createSettingsWindowFn = fn;
}

/**
 * Set export data function
 */
function setExportData(fn) {
  exportDataFn = fn;
}

/**
 * Set import data function
 */
function setImportData(fn) {
  importDataFn = fn;
}

/**
 * Set erase data function
 */
function setEraseData(fn) {
  eraseDataFn = fn;
}

/**
 * Set check for updates function
 */
function setCheckForUpdates(fn) {
  checkForUpdatesFn = fn;
}

/**
 * Create application menu with About dialog
 */
function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: `About ${app.name}`,
              message: app.name,
              detail: `Version: ${app.getVersion()}\n\nModern macOS TV streaming application\n\nCreated by Alex Shuraits`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            if (createSettingsWindowFn) {
              createSettingsWindowFn();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            if (checkForUpdatesFn) {
              checkForUpdatesFn();
            }
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            if (exportDataFn) exportDataFn();
          }
        },
        {
          label: 'Import Data...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            if (importDataFn) importDataFn();
          }
        },
        { type: 'separator' },
        {
          label: 'Erase All Data...',
          click: () => {
            if (eraseDataFn) eraseDataFn();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = {
  createMenu,
  setSettingsWindowCreator,
  setCheckForUpdates,
  setExportData,
  setImportData,
  setEraseData
};
