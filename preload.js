const { contextBridge, ipcRenderer } = require('electron');

//this is the bridge that connects nodejs modules to the chromium in renderer
// without it openai api & file reads would not work

contextBridge.exposeInMainWorld('electron', {
  sendChat: (prompt) => ipcRenderer.invoke('get-chat-completion', prompt),
  onCalendarData: (callback) => { 
    console.log('onCalendarData called'); 
    ipcRenderer.on('calendar-data', (event, data) => callback(data)); },
  requestCalendarData: () => {
    console.log('requestCalendarData called');
    ipcRenderer.send('request-calendar-data');
  },
});
