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
});
