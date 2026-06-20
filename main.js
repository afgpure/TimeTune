const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');
const fs = require('fs');
const csv = require('csv-parser');
require('dotenv').config();

let win;
let assistantId;
let threadId;


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
      instructions: "As an AI assistant, you should manage the user's calendar in a conversational and human-like manner. Your role includes adding, updating, and deleting appointments. " +
      "When you provide information from the calendar, do so as if you are casually speaking or writing a message to a friend, with full sentences and no symbols like hyphens or asterisks. " +
      "Please format time using standard phrases such as 'at 5:30 PM'. When listing multiple events, separate them with phrases such as 'and then', 'following that', 'afterwards', or 'next'." +
      "If a specific time or day for an appointment is not provided by the user, use common sense to suggest a suitable time and intelligently schedule it. Make sure to account for typical work " +
      "hours and common North American holidays. Remember to sound natural and avoid any technical jargon or symbols that would reveal your operational nature as an AI.",
      model: "gpt-4o-mini",
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
