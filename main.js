const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');

const openai = new OpenAI({
  apiKey: 'REMOVED',
});

function createWindow() {
  const win = new BrowserWindow({
    title: 'TimeTune',
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
}

async function fetchChatCompletion(prompt) {
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }], // Make sure to use the variable 'prompt'
      model: 'gpt-3.5-turbo',
    });
    // The structure of the response should be verified.
    // If the response structure is correct, the following line should access the message properly.
    // It's common to check the OpenAI API documentation for the exact response structure.
    const message = response.choices[0].message.content;
    console.log(response.choices[0]);
    return message;
  } catch (error) {
    console.error('Error fetching chat completion:', error);
    throw error;
  }
}

ipcMain.handle('get-chat-completion', async (event, prompt) => {
  return await fetchChatCompletion(prompt);
});


app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})