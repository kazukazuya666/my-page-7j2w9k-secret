let displayDate = new Date();
let selectedFullDate = "";

function updateDisplay() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    document.getElementById('date').innerText = now.getFullYear() + '/' + (now.getMonth() + 1).toString().padStart(2, '0') + '/' + now.getDate().toString().padStart(2, '0') + ' (' + days[now.getDay()] + ')';
    document.getElementById('clock').innerText = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
}

function saveDailyMemo() {
    localStorage.setItem('daily-memo-content', document.getElementById('daily-memo').value);
}

function loadDailyMemo() {
    document.getElementById('daily-memo').value = localStorage.getItem('daily-memo-content') || "";
}

function createCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    document.getElementById('calendar-month').innerText = `${year}年 ${month + 1}月`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    tbody.innerHTML = ""; 
    const today = new Date();

    for (let i = 0, date = 1; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) {
                cell.innerText = "";
            } else {
                cell.innerText = date;
                const fullDate = `${year}-${month + 1}-${date}`;
                
                if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                    if(!selectedFullDate) selectDate(cell, fullDate);
                }
                
                if (localStorage.getItem(fullDate)) cell.classList.add('has-event');
                
                cell.onclick = () => selectDate(cell, fullDate);
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
        if (date > lastDate) break;
    }
}

function selectDate(element, fullDate) {
    document.querySelectorAll('#calendar-body td').forEach(td => td.classList.remove('selected'));
    element.classList.add('selected');
    selectedFullDate = fullDate;
    const parts = fullDate.split('-');
    document.getElementById('selected-date-label').innerText = `${parts[1]}月${parts[2]}日の予定：`;
    document.getElementById('event-input').value = localStorage.getItem(fullDate) || "";
}

function saveEvent() {
    if (!selectedFullDate) return;
    const text = document.getElementById('event-input').value;
    if (text) localStorage.setItem(selectedFullDate, text);
    else localStorage.removeItem(selectedFullDate);
    updateCalendarDots();
}

function updateCalendarDots() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const cells = document.querySelectorAll('#calendar-body td');
    cells.forEach(cell => {
        if(cell.innerText === "") return;
        const fullDate = `${year}-${month + 1}-${cell.innerText}`;
        if (localStorage.getItem(fullDate)) cell.classList.add('has-event');
        else cell.classList.remove('has-event');
    });
}

function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    selectedFullDate = ""; 
    createCalendar();
    document.getElementById('event-input').value = "";
    document.getElementById('selected-date-label').innerText = "日付を選択してください";
}

// ネタ帳
let ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
let currentPageIndex = JSON.parse(localStorage.getItem('current-page-index')) || 0;

function initIdeas() {
    const tabBar = document.getElementById('tab-bar');
    tabBar.innerHTML = "";
    ideaPages.forEach((page, index) => {
        const btn = document.createElement('button');
        btn.innerText = page.title;
        btn.style.backgroundColor = (index === currentPageIndex) ? "var(--accent)" : "#444";
        btn.style.color = "white";
        btn.style.borderRadius = "15px";
        btn.style.padding = "5px 15px";
        btn.style.border = "none";
        btn.onclick = () => switchPage(index);
        btn.ondblclick = () => renamePage(index);
        btn.oncontextmenu = (e) => { e.preventDefault(); renamePage(index); };
        tabBar.appendChild(btn);
    });
    document.getElementById('idea-note').value = ideaPages[currentPageIndex].content;
}

function switchPage(index) {
    currentPageIndex = index;
    initIdeas();
    localStorage.setItem('current-page-index', currentPageIndex);
}

function createNewPage() {
    const newTitle = prompt("ページ名を入力してください", `ページ${ideaPages.length + 1}`);
    if (newTitle) {
        ideaPages.push({title: newTitle, content: ""});
        currentPageIndex = ideaPages.length - 1;
        saveAllIdeas();
        initIdeas();
    }
}

function saveCurrentIdea() {
    ideaPages[currentPageIndex].content = document.getElementById('idea-note').value;
    saveAllIdeas();
}

function saveAllIdeas() {
    localStorage.setItem('idea-pages', JSON.stringify(ideaPages));
    localStorage.setItem('current-page-index', currentPageIndex);
}

function renamePage(index) {
    const currentTitle = ideaPages[index].title;
    const newTitle = prompt("新しい名前を入力（空にすると削除）", currentTitle);
    if (newTitle === null) return;
    if (newTitle.trim() === "") {
        if (confirm("このページを削除しますか？")) {
            ideaPages.splice(index, 1);
            if (ideaPages.length === 0) ideaPages = [{title: "ページ1", content: ""}];
            currentPageIndex = 0;
            saveAllIdeas();
            initIdeas();
        }
    } else {
        ideaPages[index].title = newTitle;
        saveAllIdeas();
        initIdeas();
    }
}

// 付箋
let stickyNotes = JSON.parse(localStorage.getItem('sticky-notes')) || [];

function initStickyNotes() {
    const container = document.getElementById('sticky-container');
    container.innerHTML = "";
    stickyNotes.forEach((note, index) => {
        const div = document.createElement('div');
        div.className = 'sticky-note';
        div.style.backgroundColor = note.color;
        div.style.width = note.size;
        div.style.height = note.size;
        div.innerHTML = `
            <span class="delete-note" onclick="deleteStickyNote(${index})">✖</span>
            <textarea oninput="updateStickyNote(${index}, this.value)">${note.content}</textarea>
        `;
        container.appendChild(div);
    });
}

function addStickyNote() {
    const color = document.getElementById('note-color').value;
    const size = document.getElementById('note-size').value;
    stickyNotes.push({ color, size, content: "" });
    saveStickyNotes();
    initStickyNotes();
}

function updateStickyNote(index, value) {
    stickyNotes[index].content = value;
    saveStickyNotes();
}

function deleteStickyNote(index) {
    if (confirm("この付箋を剥がしますか？")) {
        stickyNotes.splice(index, 1);
        saveStickyNotes();
        initStickyNotes();
    }
}

function saveStickyNotes() {
    localStorage.setItem('sticky-notes', JSON.stringify(stickyNotes));
}

// 初期起動
setInterval(updateDisplay, 1000);
updateDisplay();
createCalendar();
loadDailyMemo();
initIdeas();
initStickyNotes();
