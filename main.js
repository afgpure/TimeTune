const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');
const { parseChatGPTResponse } = require('./parseResponse');

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
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-3.5-turbo',
    });

    const parsedEvent = parsePlainTextResponse(response.choices[0].message.content);

    // Create calendar event based on parsed event details
    createCalendarEvent(parsedEvent);

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching chat completion:', error);
    throw error;
  }
}

function parsePlainTextResponse(responseText) {
  // Define delimiters and expected order of event details
  const delimiters = [',', ';', '|']; // Add more delimiters as needed
  const expectedOrder = ['name', 'date', 'time', 'location', 'description'];

  // Split the response into individual components based on delimiters
  let eventDetails = responseText.split(new RegExp(delimiters.join('|'), 'g'));

  // Initialize an object to store parsed event details
  let parsedEvent = {};

  // Iterate over the expected order of event details
  for (let i = 0; i < expectedOrder.length; i++) {
    // Trim whitespace from each component and assign it to the corresponding property in the parsedEvent object
    parsedEvent[expectedOrder[i]] = eventDetails[i] ? eventDetails[i].trim() : ''; // Handle cases where a detail might be missing
  }

  return parsedEvent;
}

// Function to create calendar events
function createCalendarEvent(eventDetails) {
  // Log the event details to the console for testing
  console.log("Calendar Event Details:");
  console.log(eventDetails);

  // Alternatively, display the event details in the Electron app's window
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('display-event-details', eventDetails);
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