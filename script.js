let displayDate = new Date();
let selectedFullDate = "";

// ページ切り替え
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'home') updateHomeTodayEvent();
    window.scrollTo(0, 0);
}

// 今日の予定をホームに表示
function updateHomeTodayEvent() {
    const now = new Date();
    const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const event = localStorage.getItem(fullDate) || "本日の予定はありません";
    document.getElementById('today-event-text').innerText = event;
}

// 時計の更新
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    document.getElementById('date').innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    document.getElementById('clock').innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

// カレンダー作成
function createCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    document.getElementById('calendar-month').innerText = `${year}年 ${month + 1}月`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    tbody.innerHTML = "";
    const today = new Date();
    let date = 1;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) {
                cell.innerText = "";
            } else {
                let d = date;
                cell.innerText = d;
                let fullDate = `${year}-${month + 1}-${d}`;
                if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) cell.classList.add('today');
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
    document.getElementById('selected-date-label').innerText = fullDate + " の予定";
    document.getElementById('event-input').value = localStorage.getItem(fullDate) || "";
}

function saveEvent() {
    if (!selectedFullDate) return;
    const val = document.getElementById('event-input').value;
    if (val) localStorage.setItem(selectedFullDate, val);
    else localStorage.removeItem(selectedFullDate);
    createCalendar();
}

function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    createCalendar();
}

// ネタ帳
let ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
let currentPageIndex = 0;

function initIdeas() {
    const bar = document.getElementById('tab-bar');
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button');
        b.innerText = p.title;
        b.className = "nav-btn";
        b.style.background = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => {
            const n = prompt("名前変更", p.title);
            if(n) { p.title = n; saveIdeas(); initIdeas(); }
        };
        bar.appendChild(b);
    });
    document.getElementById('idea-note').value = ideaPages[currentPageIndex].content;
}

function createNewPage() {
    const n = prompt("ページ名", "新ページ");
    if(n) { ideaPages.push({title: n, content: ""}); currentPageIndex = ideaPages.length - 1; saveIdeas(); initIdeas(); }
}

function saveCurrentIdea() {
    ideaPages[currentPageIndex].content = document.getElementById('idea-note').value;
    saveIdeas();
}

function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); }

// 付箋
let stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
function initStickies() {
    const c = document.getElementById('sticky-container');
    c.innerHTML = "";
    stickies.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'sticky-note';
        d.style.backgroundColor = n.color;
        d.style.width = "100px"; d.style.height = "100px";
        d.innerHTML = `<textarea oninput="updateSticky(${i}, this.value)">${n.content}</textarea><span style="position:absolute;top:0;right:5px;" onclick="delSticky(${i})">×</span>`;
        c.appendChild(d);
    });
}
function addStickyNote() {
    stickies.push({color: document.getElementById('note-color').value, content: ""});
    localStorage.setItem('sticky-notes', JSON.stringify(stickies));
    initStickies();
}
function updateSticky(i, v) { stickies[i].content = v; localStorage.setItem('sticky-notes', JSON.stringify(stickies)); }
function delSticky(i) { stickies.splice(i,1); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies(); }

function saveDailyMemo() { localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); }

// 初期化
setInterval(updateClock, 1000);
updateClock();
createCalendar();
initIdeas();
initStickies();
updateHomeTodayEvent();
document.getElementById('daily-memo').value = localStorage.getItem('daily-memo') || "";
