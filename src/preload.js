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
});
