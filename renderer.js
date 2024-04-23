
function openTab(tabName) {
    console.log('Opening tab:', tabName);
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

    if (tabName === 'calendar') {
        console.log('trying electron');
        window.electron.requestCalendarData();
        console.log('electron was called');
    }
}



console.log('Script start');
// Default to open chat tab
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');
    openTab('chat');
    console.log('Renderer ready, setting up IPC listener for calendar-data');
    window.electron.onCalendarData((data) => {
        console.log('Received calendar data from main process:', data);
        generateCalendar();
        populateCalendar(data);
    });
});
console.log('Script executed');

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

function populateCalendar(events) {
    if (!Array.isArray(events)) {
        console.error('Expected events to be an array, but received:', events);
        return; // Exit the function if not an array
    }
    console.log('Populating calendar with events:', events);
    events.forEach(event => {
        const { Date: date, Time: time, Description: description } = event;
        const textarea = document.querySelector(`textarea[data-date="${date}"]`);
        if (textarea) {
            textarea.value += `${time}: ${description}\n`;
        } else {
            console.log(`No textarea found for date: ${date}`);
        }
    });
}


function generateCalendar() {
    const calendarView = document.getElementById('calendarView');
    const calendarHeader = document.getElementById('calendarHeader');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Number of days in the current month
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // Day of the week (0-6) for the first day of the month

    // clear previous calendar content
    calendarHeader.innerHTML = '';
    calendarView.innerHTML = '';

    // create and set calendar header with current month and year
    const headerText = document.createElement('h2');
    headerText.textContent = monthNames[month] + ' ' + year;
    calendarHeader.appendChild(headerText);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const calendarTable = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // create table header with weekdays
    let headerRow = document.createElement('tr');
    weekdays.forEach(weekday => {
        let th = document.createElement('th');
        th.textContent = weekday;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    calendarTable.appendChild(thead);

    // create table body with calendar dates and text areas
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDayOfWeek) {
                cell.textContent = ''; // leave empty if before the first day of the month
            } else {
                let date = (i * 7 + j - firstDayOfWeek + 1).toString().padStart(2, '0');
                if (date <= daysInMonth) {
                    let textarea = document.createElement('textarea');
                    textarea.classList.add('day-textarea');
                    let paddedMonth = (month + 1).toString().padStart(2, '0');
                    let dateString = `${year}-${paddedMonth}-${date}`;
                    textarea.setAttribute('data-date', dateString); // add data-date attribute
                    cell.textContent = date;
                    if (parseInt(date, 10) === day) {
                        cell.classList.add('current-day');
                    }
                    cell.appendChild(textarea);
                } else {
                    cell.textContent = ''; // l empty if after the last day of the month
                }
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }
    calendarTable.appendChild(tbody);
    calendarView.appendChild(calendarTable);


}

