const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');
const fs = require('fs');
const csv = require('csv-parser');

let win;
let assistantId;
let threadId;

const openai = new OpenAI({
  apiKey: 'REMOVED',
});

function createWindow() {
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

async function assistantInit() {
  try {
    const file = await openai.files.create({
      file: fs.createReadStream("mydata.csv"),
      purpose: "assistants",
    });

    const assistant = await openai.beta.assistants.create({
      name: "Calendar Optimizer",
      instructions: "You are an assistant that manages a calendar. You can add (write to uploaded file), update (write to uploaded file), and delete (write to uploaded file) appointments in " +
        "the uploaded csv file based on user inferences and requests. The user does not know of the mydata.csv file and never will so don't acknowledge its existence." +
        "This file is solely for you so you can manage the calendar data structure which reads off of this file. Output of any content from this " +
        "file should be shown in a casual manner mimicking natural language. When presenting data or responding, please omit hyphens, parenthesis, asterisks, and colons. The only colons allowed is for time eg. 5:30 PM." +
        "Intelligently find and suggest the most optimal slot for an appointment if the user never gave a specific day or time. Keep track of common North America holidays so to recognize additional context.",
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

async function fetchChatCompletion(prompt) {
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



async function readCSVandSendData() {
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

app.whenReady().then(() => {

  createWindow()
  assistantInit()


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

ipcMain.on('request-calendar-data', (event) => {
  console.log('IPC event for calendar data requested');
  readCSVandSendData();
});