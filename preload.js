const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  sendChat: (prompt) => ipcRenderer.invoke('get-chat-completion', prompt)
});
