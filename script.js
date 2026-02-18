// --- セキュリティ：初回アクセス時のみパスワードを要求 ---
(function() {
    const SECRET_KEY = "harakazu5566";
    const AUTH_ID = "my_dashboard_authenticated";
    if (localStorage.getItem(AUTH_ID) === "true") return;
    let pass = prompt("新しいデバイスを検知しました。パスワードを入力してください。");
    if (pass === SECRET_KEY) {
        localStorage.setItem(AUTH_ID, "true");
        alert("認証に成功しました。次からは入力を省略します。");
    } else {
        alert("パスワードが違います。アクセスできません。");
        document.body.innerHTML = `<div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;"><div style="text-align:center;"><h1>🔒 Access Denied</h1><p>正しいパスワードが必要です。</p><button onclick="location.reload()" style="background:var(--accent); color:white; border:none; padding:10px 20px; border-radius:10px;">再試行</button></div></div>`;
    }
})();

let displayDate = new Date();
let selectedFullDate = "";

// --- ページ切り替え ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    
    if (pageId === 'home') {
        updateHomeTodayEvent();
        renderHomeLinks(); 
    }
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'timetable') initTimetable();
    window.scrollTo(0, 0);
}

// --- リンク管理機能（ここを完全に整理しました） ---
let links = JSON.parse(localStorage.getItem('user-links')) || [];
let uraLinks = JSON.parse(localStorage.getItem('ura-links')) || [];
let gateName = localStorage.getItem('gate-name') || "リンク設定";
let isUraView = false; 
let isUraEditorMode = false;

function renderHomeLinks() {
    const grid = document.getElementById('link-grid-container');
    const title = document.getElementById('link-section-title');
    
    if (!grid) return;
    
    grid.innerHTML = ""; 
    const currentList = isUraView ? uraLinks : links;

    // タイトルの文字だけを更新（編集ボタンを消さないように）
    if(title) {
        title.innerText = isUraView ? "🔒 裏リンク集" : "クイックリンク";
    }


    // 1. 保存されたリンクを生成
    currentList.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.className = "btn";
        a.target = "_blank";
        a.innerText = link.name;
        a.onclick = (e) => {
            if(!link.url.startsWith('http')) return; // 無効なURL対策
        };
        grid.appendChild(a);
    });

    // 2. 扉ボタン（裏への切り替え）を追加
    const gateBtn = document.createElement('a');
    gateBtn.href = "javascript:void(0)";
    gateBtn.className = "btn span-2"; // CSSで2マス幅にするクラス
    gateBtn.innerText = isUraView ? "↩ 表に戻る" : gateName;
    
    gateBtn.onclick = (e) => {
        e.preventDefault();
        isUraView = !isUraView;
        renderHomeLinks();
    };

    // 名前変更（長押し/右クリック）
    gateBtn.oncontextmenu = (e) => {
        e.preventDefault();
        const newName = prompt("ボタンの名前を変更:", gateName);
        if(newName) {
            gateName = newName;
            localStorage.setItem('gate-name', gateName);
            renderHomeLinks();
        }
    };
    grid.appendChild(gateBtn);
}

// リンク追加（編集画面用）
function addLink() {
    const nameInput = document.getElementById('new-link-name');
    const urlInput = document.getElementById('new-link-url');
    if (!nameInput || !urlInput) return;

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) return;

    if (isUraEditorMode) {
        uraLinks.push({name, url});
    } else {
        links.push({name, url});
    }
    
    saveLinks();
    renderEditorList(); 
    renderHomeLinks(); 
    nameInput.value = "";
    urlInput.value = "";
}

function deleteLink(index) {
    if (!confirm("削除しますか？")) return;
    if (isUraEditorMode) {
        uraLinks.splice(index, 1);
    } else {
        links.splice(index, 1);
    }
    saveLinks();
    renderEditorList();
    renderHomeLinks();
}

function saveLinks() {
    localStorage.setItem('user-links', JSON.stringify(links));
    localStorage.setItem('ura-links', JSON.stringify(uraLinks));
}

// 編集画面の制御
function openLinkEditor() {
    isUraEditorMode = isUraView; 
    document.getElementById('link-editor-modal').style.display = 'block';
    renderEditorList();
}

function closeLinkEditor() {
    document.getElementById('link-editor-modal').style.display = 'none';
    renderHomeLinks();
}

function toggleUraMode() {
    isUraEditorMode = !isUraEditorMode;
    renderEditorList();
}

function renderEditorList() {
    const list = document.getElementById('editor-link-list');
    const title = document.getElementById('editor-title');
    if(!list) return;

    const currentList = isUraEditorMode ? uraLinks : links;
    title.innerText = isUraEditorMode ? "🔒 裏リンク編集" : "🔗 リンク編集";
    title.style.color = isUraEditorMode ? "#ff2e63" : "white";
    
    list.innerHTML = "";
    currentList.forEach((link, index) => {
        const item = document.createElement('div');
        item.style = "display:flex; justify-content:space-between; align-items:center; background:#333; padding:10px; border-radius:10px; margin-bottom:8px; border:1px solid #444;";
        item.innerHTML = `
            <div style="overflow:hidden;">
                <div style="font-weight:bold; color:white; font-size:0.9rem;">${link.name}</div>
                <div style="font-size:0.6rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${link.url}</div>
            </div>
            <button onclick="deleteLink(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding-left:10px;">×</button>
        `;
        list.appendChild(item);
    });
}

// --- 時計・カレンダー・ToDo・ノート・時間割の既存機能（変更なし） ---
function updateHomeTodayEvent() {
    const now = new Date();
    const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const event = localStorage.getItem(fullDate) || "本日の予定はありません";
    const elem = document.getElementById('today-event-text');
    if (elem) elem.innerText = event;
}

function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dateElem = document.getElementById('date');
    const clockElem = document.getElementById('clock');
    if (dateElem) dateElem.innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    if (clockElem) clockElem.innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

function createCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const monthLabel = document.getElementById('calendar-month');
    if (monthLabel) monthLabel.innerText = `${year}年 ${month + 1}月`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    if (!tbody) return;
    tbody.innerHTML = "";
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (!selectedFullDate) selectedFullDate = todayStr;
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) {
                cell.innerText = "";
            } else {
                let d = date;
                let fullDate = `${year}-${month + 1}-${d}`;
                cell.innerText = d;
                if (fullDate === todayStr) cell.classList.add('today');
                if (localStorage.getItem(fullDate)) cell.classList.add('has-event');
                if (selectedFullDate === fullDate) cell.classList.add('selected');
                cell.onclick = () => selectDate(cell, fullDate);
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
        if (date > lastDate) break;
    }
    refreshEventInput();
}

function selectDate(element, fullDate) {
    document.querySelectorAll('#calendar-body td').forEach(td => td.classList.remove('selected'));
    element.classList.add('selected');
    selectedFullDate = fullDate;
    refreshEventInput();
}

function refreshEventInput() {
    const label = document.getElementById('selected-date-label');
    const input = document.getElementById('event-input');
    if (selectedFullDate) {
        if (label) label.innerText = selectedFullDate + " の予定";
        if (input) input.value = localStorage.getItem(selectedFullDate) || "";
    }
}

function saveEvent() {
    if (!selectedFullDate) return;
    const val = document.getElementById('event-input').value;
    if (val.trim()) localStorage.setItem(selectedFullDate, val);
    else localStorage.removeItem(selectedFullDate);
    createCalendar(); 
    updateHomeTodayEvent(); 
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
    if (!bar) return; 
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button');
        b.innerText = p.title;
        b.style = `background-color:${(i===currentPageIndex)?"var(--accent)":"#444"}; color:white; border-radius:20px; padding:8px 16px; border:none; margin-right:8px; font-size:14px; white-space:nowrap; cursor:pointer;`;
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => { const n = prompt("名前変更", p.title); if(n) { p.title = n; saveIdeas(); initIdeas(); } };
        bar.appendChild(b);
    });
    const noteArea = document.getElementById('idea-note');
    if (noteArea) noteArea.value = ideaPages[currentPageIndex].content;
}
function createNewPage() { const n = prompt("ページ名", "新ページ"); if(n) { ideaPages.push({title: n, content: ""}); currentPageIndex = ideaPages.length - 1; saveIdeas(); initIdeas(); } }
function saveCurrentIdea() { ideaPages[currentPageIndex].content = document.getElementById('idea-note').value; saveIdeas(); }
function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); }

// 付箋
let stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
function initStickies() {
    const c = document.getElementById('sticky-container');
    if (!c) return;
    c.innerHTML = "";
    stickies.forEach((n, i) => {
        const d = document.createElement('div');
        d.className = 'sticky-note';
        d.style.backgroundColor = n.color;
        d.style.width = "100px"; d.style.height = "100px";
        d.innerHTML = `<textarea oninput="updateSticky(${i}, this.value)">${n.content}</textarea><span style="position:absolute;top:0;right:5px;cursor:pointer;" onclick="delSticky(${i})">×</span>`;
        c.appendChild(d);
    });
}
function addStickyNote() { stickies.push({color: document.getElementById('note-color').value, content: ""}); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies(); }
function updateSticky(i, v) { stickies[i].content = v; localStorage.setItem('sticky-notes', JSON.stringify(stickies)); }
function delSticky(i) { stickies.splice(i,1); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies(); }
function saveDailyMemo() { localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); }

// ToDo
let todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "映画", items: []}];
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';
function initTodo() {
    const bar = document.getElementById('todo-category-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const group = document.createElement('div');
        group.style = `display:inline-flex; align-items:center; background:${(i===currentTodoCategoryIndex)?"var(--accent)":"#444"}; border-radius:20px; margin-right:8px; padding:2px 10px; cursor:pointer;`;
        const nameBtn = document.createElement('span');
        nameBtn.innerText = cat.category;
        nameBtn.style = "color:white; font-size:0.8rem;";
        nameBtn.onclick = () => { currentTodoCategoryIndex = i; initTodo(); };
        const delBtn = document.createElement('span');
        delBtn.innerText = " ×";
        delBtn.style.color = "rgba(255,255,255,0.6)";
        delBtn.onclick = (e) => { e.stopPropagation(); if (todoData.length <= 1) return; if (confirm(`カテゴリー「${cat.category}」を削除しますか？`)) { todoData.splice(i, 1); currentTodoCategoryIndex = 0; saveTodo(); initTodo(); } };
        group.appendChild(nameBtn); group.appendChild(delBtn); bar.appendChild(group);
    });
    renderTodoList();
}
function renderTodoList() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    container.innerHTML = "";
    const items = todoData[currentTodoCategoryIndex].items;
    items.forEach((item, index) => {
        if (currentTodoFilter === 'active' && item.done) return;
        if (currentTodoFilter === 'completed' && !item.done) return;
        const div = document.createElement('div');
        div.className = `todo-item ${item.done ? 'completed' : ''}`;
        div.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})"><span>${item.text}</span><button onclick="deleteTodo(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding:0 10px;">×</button>`;
        container.appendChild(div);
    });
}
function addTodoItem() { const input = document.getElementById('todo-input'); if (!input || input.value.trim() === "") return; todoData[currentTodoCategoryIndex].items.push({text: input.value.trim(), done: false}); input.value = ""; saveTodo(); renderTodoList(); }
function toggleTodo(index) { todoData[currentTodoCategoryIndex].items[index].done = !todoData[currentTodoCategoryIndex].items[index].done; saveTodo(); renderTodoList(); }
function deleteTodo(index) { if(confirm("削除しますか？")) { todoData[currentTodoCategoryIndex].items.splice(index, 1); saveTodo(); renderTodoList(); } }
function setTodoFilter(filter) { currentTodoFilter = filter; document.getElementById('f-all').classList.toggle('active', filter === 'all'); document.getElementById('f-active').classList.toggle('active', filter === 'active'); document.getElementById('f-completed').classList.toggle('active', filter === 'completed'); renderTodoList(); }
function createTodoCategory() { const n = prompt("新しいカテゴリー名", ""); if(n) { todoData.push({category: n, items: []}); currentTodoCategoryIndex = todoData.length - 1; saveTodo(); initTodo(); } }
function saveTodo() { localStorage.setItem('todo-data', JSON.stringify(todoData)); }

// 時間割
let currentSemester = localStorage.getItem('current-semester') || "1年 前期";
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];
let timetableData = JSON.parse(localStorage.getItem('timetable-data')) || {};
function initTimetable() {
    const tabContainer = document.getElementById('semester-tabs');
    const tbody = document.getElementById('timetable-body');
    if (!tabContainer || !tbody) return;
    tabContainer.innerHTML = "";
    semesters.forEach(sem => {
        const btn = document.createElement('button');
        btn.innerText = sem;
        btn.className = (currentSemester === sem) ? "sem-btn active" : "sem-btn";
        btn.onclick = () => { currentSemester = sem; localStorage.setItem('current-semester', sem); initTimetable(); };
        tabContainer.appendChild(btn);
    });
    tbody.innerHTML = "";
    const days = ["月", "火", "水", "木", "金"];
    for (let period = 1; period <= 5; period++) {
        const row = document.createElement('tr');
        const timeTd = document.createElement('td');
        timeTd.innerText = period; timeTd.style = "background:#333; width:30px;"; row.appendChild(timeTd);
        days.forEach(day => {
            const td = document.createElement('td');
            const key = `${day}-${period}`;
            const data = (timetableData[currentSemester] && timetableData[currentSemester][key]) ? timetableData[currentSemester][key] : {subject: "", place: ""};
            td.innerHTML = `<div style="width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center;"><span class="tt-subject" style="white-space:normal; word-wrap:break-word; display:block; width:100%;">${data.subject || ""}</span><span class="tt-place" style="white-space:normal; word-wrap:break-word; display:block; width:100%; margin-top:4px;">${data.place || ""}</span></div>`;
            td.onclick = () => editTimetableSlot(currentSemester, key, data.subject, data.place);
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}
function editTimetableSlot(sem, key, oldSub, oldPlace) {
    const sub = prompt(`${sem}【${key}】\n科目名を入力:`, oldSub); if (sub === null) return;
    const place = prompt(`${sem}【${key}】\n教室・場所を入力:`, oldPlace); if (place === null) return;
    if (!timetableData[sem]) timetableData[sem] = {};
    timetableData[sem][key] = { subject: sub, place: place };
    localStorage.setItem('timetable-data', JSON.stringify(timetableData));
    initTimetable();
}

// --- 初期化処理 ---
window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    createCalendar();
    initIdeas();
    initStickies();
    initTodo();
    updateHomeTodayEvent();
    initTimetable();
    
    // 【重要】最初にリンクを表示
    renderHomeLinks(); 

    const memoElem = document.getElementById('daily-memo');
    if (memoElem) memoElem.value = localStorage.getItem('daily-memo') || "";
    showPage('home');
};
