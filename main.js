const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');
const fs = require('fs');
const csv = require('csv-parser');

let win;
let assistantId;
let threadId;

//my openai api key that uses gpt4. its free for anyone that uses my key
//no need to worry about the price, its still cheap for me so use as much as you want
const openai = new OpenAI({
  apiKey: 'REMOVED',
});

function createWindow() {   //create main view
  win = new BrowserWindow({
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

async function assistantInit() { //initialize gpt assistant
  try {
    const file = await openai.files.create({
      file: fs.createReadStream("mydata.csv"),
      purpose: "assistants",
    });

    const assistant = await openai.beta.assistants.create({
      name: "Calendar Optimizer",
      instructions: "You are an AI assistant responsible for managing a calendar. Your tasks include adding, updating, and deleting appointments within a calendar data structure. It is essential that you do not refer to or acknowledge the existence of the 'mydata.csv' file to users." +
        "Communicate any information from the file in a conversational tone as if you were speaking. Avoid technical symbols such as hyphens, parentheses, asterisks, and colons in your responses, except when using colons to denote time (e.g., '5:30 PM')." +
        "When the user does not specify a time or day for an appointment, use your understanding to suggest the most suitable slot, considering typical work hours and common North American holidays. The goal is to interact with users as naturally as possible while effectively managing their calendar.",
      model: "gpt-4-turbo",
      tools: [{ "type": "code_interpreter" }],
      tool_resources: {
        "code_interpreter": {
          "file_ids": [file.id]
        }
      }

    });
    assistantId = assistant.id;

    const thread = await openai.beta.threads.create();
    threadId = thread.id;
  } catch (error) {
    console.error('Error initializing assistant or thread:', error);
  }
}

async function fetchChatCompletion(prompt) { //this fetches chat messages between the user and gpt assistant
  try {

    const threadMessage = await openai.beta.threads.messages.create(
      threadId,
      { role: 'user', content: prompt }
    );

    const run = await openai.beta.threads.runs.createAndPoll(
      threadId,
      { assistant_id: assistantId }
      //create and poll a run to generate a response
    );

    if (run.status === 'completed') {
      console.log(`Run ${run.status}.\n`);
    } else if (run.status === 'failed') {
      console.log(`Run ${run.status}.\n`);
    } else if (run.status === 'queued') {
      console.log(`Run ${run.status}.\n`);
      await new Promise(resolve => setTimeout(resolve, 20000)); //sleep for 20 seconds
    }

    //list messages added to the thread by the Assistant
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      const assistantMessages = messages.data
        .filter(message => message.role === 'assistant')
        .map(message => {

          if (message.content && message.content.length > 0 && message.content[0].text) {
            return message.content[0].text.value;
          }
          return "No valid content found";  // Fallback text
        });

      //first assistant message is the latest one
      const latestAssistantMessage = assistantMessages.length > 0 ? assistantMessages[0] : "No assistant messages found";

      return latestAssistantMessage; //return the latest message content
    } else {
      return `Assistant could not generate a response: ${run.status}`;
    }
  } catch (error) {
    console.error('Error fetching chat completion:', error);
    throw error;
  }
}

ipcMain.handle('get-chat-completion', async (event, prompt) => {
  return await fetchChatCompletion(prompt);
});



async function readCSVandSendData() {//read preloaded schedule in the csv file
  const results = [];
  try {
    await fs.createReadStream(path.join(__dirname, 'mydata.csv'))
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
        console.log('Data read from CSV:', data);
      })
      .on('end', () => {
        console.log('Sending calendar data to renderer:', results);
        win.webContents.send('calendar-data', results);
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
      });
  } catch (error) {
    console.error('Error reading CSV:', error);
  }
}

app.whenReady().then(() => {//start app and initialize

  createWindow()
  assistantInit()


  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()

    }
  })
})

app.on('window-all-closed', () => {//for macos the app still runs even when window is closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('request-calendar-data', (event) => {
  console.log('IPC event for calendar data requested');
  readCSVandSendData();
});