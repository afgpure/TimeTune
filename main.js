const { app, BrowserWindow, ipcMain } = require('electron');
const { OpenAI } = require("openai");
const path = require('node:path');
const fs = require('fs');


let assistantId;
let threadId;

const openai = new OpenAI({
  apiKey: 'sk-proj-dBLsdUnaCRYqDtC72L6fT3BlbkFJzhZ57zDk9zOv5U2PwUxk',
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

async function assistantInit() {
  try {
    const file = await openai.files.create({
      file: fs.createReadStream("mydata.csv"),
      purpose: "assistants",
    });

    const assistant = await openai.beta.assistants.create({
      name: "Calendar Optimizer",
      instructions: "You are an assistant that manages a calendar. You can add, update, and delete appointments based on user commands.",
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
    // First, create a message in the thread
    const threadMessage = await openai.beta.threads.messages.create(
      threadId,
      { role: 'user', content: prompt }
    );

    // Then, create and poll a run to generate a response
    const run = await openai.beta.threads.runs.createAndPoll(
      threadId,
      { assistant_id: assistantId }
    );

    if (run.status === 'completed') {
      console.log(`Run ${run.status}.\n`);
    } else if (run.status === 'failed') {
      console.log(`Run ${run.status}.\n`);
    } else if (run.status === 'queued') {
      console.log(`Run ${run.status}.\n`);
      await new Promise(resolve => setTimeout(resolve, 20000)); // Sleep for 20 seconds
    } 

    // After the run completes, list messages added to the thread by the Assistant
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      const assistantMessages = messages.data
        .filter(message => message.role === 'assistant')
        .map(message => {
          // Make sure to safely access nested properties
          if (message.content && message.content.length > 0 && message.content[0].text) {
            return message.content[0].text.value;
          }
          return "No valid content found";  // Fallback text
        });

      // Since messages are reversed, the first assistant message is the latest one
      const latestAssistantMessage = assistantMessages.length > 0 ? assistantMessages[0] : "No assistant messages found";

      return latestAssistantMessage; // Return the latest message content
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