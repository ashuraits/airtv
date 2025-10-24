const { Menu, app } = require('electron');

let createSettingsWindowFn = null;
let checkForUpdatesFn = null;

/**
 * Set settings window creator function
 */
function setSettingsWindowCreator(fn) {
  createSettingsWindowFn = fn;
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
  setCheckForUpdates
};
