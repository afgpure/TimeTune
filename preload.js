const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  sendChat: (prompt) => ipcRenderer.invoke('get-chat-completion', prompt),
  onCalendarData: (callback) => { console.log('onCalendarData called'); ipcRenderer.on('calendar-data', callback); },
  requestCalendarData: () => {
    console.log('requestCalendarData called');
    ipcRenderer.send('request-calendar-data');
  },
});
