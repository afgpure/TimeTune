const { ipcRenderer } = require('electron');

function openTab(tabName) {
    var i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
}

// Default to open chat tab
document.addEventListener('DOMContentLoaded', function() {
    openTab('chat');
});

const { generateText } = require('./path/to/generateText'); // ensure this path is correct

function sendChat() {
    const prompt = document.getElementById('chatInput').value;
    if (!prompt.trim()) return; // Don't send empty prompts
    
    window.electron.sendChat(prompt).then((response) => {
      // Process the successful response from your main process
      const outputElement = document.getElementById('chatOutput');
      outputElement.innerHTML += `<div>AI: ${response}</div>`;
    }).catch((error) => {
      // Handle any errors that occur during the IPC communication
      console.error('Error sending chat message:', error);
    });
  }
  window.sendChat = sendChat;

function buildCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const date = new Date();
    const month = date.getMonth();

    document.getElementById("calendarView").innerHTML = `<h3>${monthNames[month]} ${date.getFullYear()}</h3>`;
    // Here, add more sophisticated calendar generation logic as needed
}

document.addEventListener('DOMContentLoaded', function() {
    buildCalendar();
});