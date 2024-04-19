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
document.addEventListener('DOMContentLoaded', function () {
    openTab('chat');
});

function sendChat() {
    const inputElement = document.getElementById('chatInput');
    const outputElement = document.getElementById('chatOutput');
    const prompt = inputElement.value;
    inputElement.value = '';  // clear input after sending
    if (!prompt.trim()) return; // prevent sending empty prompts

    window.electron.sendChat(prompt).then((response) => {
    
        const messageHtml = `
          <div class="message user-message">${prompt}</div>
          <div class="message gpt-response">${response}</div>
        `;
        outputElement.innerHTML += messageHtml;  // append new messages
        outputElement.scrollTop = outputElement.scrollHeight;  // scroll to the bottom
    }).catch((error) => {
        console.error('Error sending chat message:', error);
        outputElement.innerHTML += `<div class="message error-message">Error: Could not fetch response.</div>`;
    });
}
window.sendChat = sendChat;

function buildCalendar() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6

    const calendarTable = document.getElementById('calendarTable');
    const calendarBody = calendarTable.querySelector('tbody');
    calendarBody.innerHTML = ''; // Clear existing calendar days

    let row = calendarBody.insertRow(); // Insert a new row for the first week
    let dayCount = 1;

    // insert blank cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        row.insertCell();
    }

    // Populate calendar days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = row.insertCell();
        cell.textContent = day;
        dayCount++;

        // start a new row if it's the end of the week
        if (dayCount > 7) {
            row = calendarBody.insertRow();
            dayCount = 1;
        }
    }

    // fill in remaining empty cells in the last row
    while (dayCount <= 7) {
        row.insertCell();
        dayCount++;
    }
}


document.addEventListener('DOMContentLoaded', function () {
    buildCalendar();
});
