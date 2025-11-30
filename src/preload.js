const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  loadPlaylist: (filePath) => ipcRenderer.invoke('load-playlist', filePath),
  getPlaylist: () => ipcRenderer.invoke('get-playlist'),
  playChannel: (channel) => ipcRenderer.invoke('play-channel', channel),
  togglePin: (isPinned) => ipcRenderer.send('toggle-pin', isPinned),
  closePlayer: () => ipcRenderer.send('close-player'),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  addFavorite: (channel) => ipcRenderer.invoke('add-favorite', channel),
  removeFavorite: (channelUrl) => ipcRenderer.invoke('remove-favorite', channelUrl),
  saveVolumeSettings: (volume, muted) => ipcRenderer.send('save-volume-settings', { volume, muted }),

  // Settings
  openSettings: () => ipcRenderer.invoke('open-settings'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openM3UDialog: () => ipcRenderer.invoke('open-m3u-dialog'),

  // Bidirectional communication main <-> player
  // From player to main
  sendToMain: (channel, data) => ipcRenderer.send(channel, data),
  // From main to player (returns unsubscribe function)
  onFromMain: (channel, callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  // Request-response from player to main
  invokeMain: (channel, data) => ipcRenderer.invoke(channel, data),

  // Multi-source APIs
  sourcesList: () => ipcRenderer.invoke('sources:list'),
  sourcesAdd: (payload) => ipcRenderer.invoke('sources:add', payload),
  sourcesUpdate: (id, data) => ipcRenderer.invoke('sources:update', { id, data }),
  sourcesDelete: (id) => ipcRenderer.invoke('sources:delete', id),
  sourcesResync: (id) => ipcRenderer.invoke('sources:resync', id),
  sourcesResyncPreview: (id) => ipcRenderer.invoke('sources:resync-preview', id),
  sourcesResyncApply: (id) => ipcRenderer.invoke('sources:resync-apply', id),
  sourcesPreviewCategories: (payload) => ipcRenderer.invoke('sources:preview-categories', payload),
  sourcesTestConnection: (payload) => ipcRenderer.invoke('sources:test-connection', payload),

  groupsList: () => ipcRenderer.invoke('groups:list'),
  groupCreate: (name) => ipcRenderer.invoke('groups:create', name),
  groupRename: (id, name) => ipcRenderer.invoke('groups:rename', { id, name }),
  groupReorder: (ids) => ipcRenderer.invoke('groups:reorder', ids),
  groupDelete: (id, strategy) => ipcRenderer.invoke('groups:delete', { id, strategy }),

  channelsList: (filters) => ipcRenderer.invoke('channels:list', filters),
  channelsMove: (ids, targetGroupId) => ipcRenderer.invoke('channels:move', { ids, targetGroupId }),
  channelsDelete: (ids) => ipcRenderer.invoke('channels:delete', ids),
});
