// --- セキュリティ：初回アクセス時のみパスワードを要求 ---
(function() {
    const SECRET_KEY = "5566"; // ★好きなパスワードに変えてください
    const AUTH_ID = "my_dashboard_authenticated";

    // すでに認証済み（このデバイスのブラウザに記録がある）なら何もしない
    if (localStorage.getItem(AUTH_ID) === "true") {
        return;
    }

    // まだ認証されていない場合のみ、パスワードを聞く
    let pass = prompt("新しいデバイスを検知しました。パスワードを入力してください。");

    if (pass === SECRET_KEY) {
        // パスワードが合っていれば、このブラウザに「許可」を保存する
        localStorage.setItem(AUTH_ID, "true");
        alert("認証に成功しました。次からは入力を省略します。");
    } else {
        // 間違っていたら画面を真っ白にする
        alert("パスワードが違います。アクセスできません。");
        document.body.innerHTML = `
            <div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
                <div style="text-align:center;">
                    <h1>🔒 Access Denied</h1>
                    <p>正しいパスワードが必要です。</p>
                    <button onclick="location.reload()" style="background:var(--accent); color:white; border:none; padding:10px 20px; border-radius:10px;">再試行</button>
                </div>
            </div>`;
    }
})();



let displayDate = new Date();
let selectedFullDate = "";

// --- ページ切り替え ---
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // ページを切り替えた瞬間に描画をリフレッシュする
    if (pageId === 'home') updateHomeTodayEvent();
    if (pageId === 'calendar') createCalendar();
    
    window.scrollTo(0, 0);
}

// 今日の予定をホームに表示
function updateHomeTodayEvent() {
    const now = new Date();
    const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const event = localStorage.getItem(fullDate) || "本日の予定はありません";
    const elem = document.getElementById('today-event-text');
    if (elem) elem.innerText = event;
}

// 時計の更新
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dateElem = document.getElementById('date');
    const clockElem = document.getElementById('clock');
    if (dateElem) dateElem.innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    if (clockElem) clockElem.innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

// --- カレンダー機能 ---
function createCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    document.getElementById('calendar-month').innerText = `${year}年 ${month + 1}月`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    tbody.innerHTML = "";
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    // 初回起動時、何も選択されていなければ今日をセット
    if (!selectedFullDate) {
        selectedFullDate = todayStr;
    }

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

    // ★重要：カレンダー再描画時に、選択中の予定を入力欄に強制反映
    refreshEventInput();
}

function selectDate(element, fullDate) {
    document.querySelectorAll('#calendar-body td').forEach(td => td.classList.remove('selected'));
    element.classList.add('selected');
    selectedFullDate = fullDate;
    refreshEventInput();
}

// 入力欄を更新する専用関数
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
    if (val.trim()) {
        localStorage.setItem(selectedFullDate, val);
    } else {
        localStorage.removeItem(selectedFullDate);
    }
    createCalendar(); 
    updateHomeTodayEvent(); 
}

function changeMonth(diff) {
    displayDate.setMonth(displayDate.getMonth() + diff);
    createCalendar();
}

// --- ネタ帳 ---
let ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
let currentPageIndex = 0;

function initIdeas() {
    const bar = document.getElementById('tab-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button');
        b.innerText = p.title;
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.style.color = "white";
        b.style.borderRadius = "20px";
        b.style.padding = "8px 16px";
        b.style.border = "none";
        b.style.marginRight = "8px";
        b.style.fontSize = "14px";
        b.style.whiteSpace = "nowrap"; 
        b.style.cursor = "pointer";
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => {
            const n = prompt("名前変更", p.title);
            if(n) { p.title = n; saveIdeas(); initIdeas(); }
        };
        bar.appendChild(b);
    });
    const noteArea = document.getElementById('idea-note');
    if (noteArea) noteArea.value = ideaPages[currentPageIndex].content;
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

// --- 付箋 ---
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
function addStickyNote() {
    stickies.push({color: document.getElementById('note-color').value, content: ""});
    localStorage.setItem('sticky-notes', JSON.stringify(stickies));
    initStickies();
}
function updateSticky(i, v) { stickies[i].content = v; localStorage.setItem('sticky-notes', JSON.stringify(stickies)); }
function delSticky(i) { stickies.splice(i,1); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies(); }

function saveDailyMemo() { localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); }

// --- ToDo機能 ---
let todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "映画", items: []}];
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';

function initTodo() {
    const bar = document.getElementById('todo-category-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const group = document.createElement('div');
        group.style.display = "inline-flex";
        group.style.alignItems = "center";
        group.style.background = (i === currentTodoCategoryIndex) ? "var(--accent)" : "#444";
        group.style.borderRadius = "20px";
        group.style.marginRight = "8px";
        group.style.padding = "2px 10px";
        group.style.cursor = "pointer";

        const nameBtn = document.createElement('span');
        nameBtn.innerText = cat.category;
        nameBtn.style.color = "white";
        nameBtn.style.fontSize = "0.8rem";
        nameBtn.onclick = () => { currentTodoCategoryIndex = i; initTodo(); };

        const delBtn = document.createElement('span');
        delBtn.innerText = " ×";
        delBtn.style.color = "rgba(255,255,255,0.6)";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (todoData.length <= 1) return;
            if (confirm(`カテゴリー「${cat.category}」を削除しますか？`)) {
                todoData.splice(i, 1);
                currentTodoCategoryIndex = 0;
                saveTodo();
                initTodo();
            }
        };
        group.appendChild(nameBtn);
        group.appendChild(delBtn);
        bar.appendChild(group);
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
        div.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span>${item.text}</span>
            <button onclick="deleteTodo(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding:0 10px;">×</button>
        `;
        container.appendChild(div);
    });
}

function addTodoItem() {
    const input = document.getElementById('todo-input');
    if (!input || input.value.trim() === "") return;
    todoData[currentTodoCategoryIndex].items.push({text: input.value.trim(), done: false});
    input.value = "";
    saveTodo();
    renderTodoList();
    input.blur(); 
}

function toggleTodo(index) {
    todoData[currentTodoCategoryIndex].items[index].done = !todoData[currentTodoCategoryIndex].items[index].done;
    saveTodo();
    renderTodoList();
}

function deleteTodo(index) {
    if(confirm("削除しますか？")) {
        todoData[currentTodoCategoryIndex].items.splice(index, 1);
        saveTodo();
        renderTodoList();
    }
}

function setTodoFilter(filter) {
    currentTodoFilter = filter;
    document.getElementById('f-all').classList.toggle('active', filter === 'all');
    document.getElementById('f-active').classList.toggle('active', filter === 'active');
    document.getElementById('f-completed').classList.toggle('active', filter === 'completed');
    renderTodoList();
}

function createTodoCategory() {
    const n = prompt("新しいカテゴリー名", "");
    if(n) {
        todoData.push({category: n, items: []});
        currentTodoCategoryIndex = todoData.length - 1;
        saveTodo();
        initTodo();
    }
}

function saveTodo() { localStorage.setItem('todo-data', JSON.stringify(todoData)); }

// --- クイックリンクを別タブで開く ---
function initExternalLinks() {
    document.querySelectorAll('.link-grid a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            window.open(link.href, '_blank', 'noopener,noreferrer');
        };
    });
}

// --- 初期化処理 ---
window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    // 各機能の初期化
    createCalendar();
    initIdeas();
    initStickies();
    initTodo();
    updateHomeTodayEvent();
    initExternalLinks();

    const dailyMemoElem = document.getElementById('daily-memo');
    if (dailyMemoElem) {
        dailyMemoElem.value = localStorage.getItem('daily-memo') || "";
    }

    showPage('home');
};



// --- 時間割のデータ管理 ---
let currentSemester = localStorage.getItem('current-semester') || "1年 前期";
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];
let timetableData = JSON.parse(localStorage.getItem('timetable-data')) || {};

// 時間割の初期化
function initTimetable() {
    const tabContainer = document.getElementById('semester-tabs');
    const tbody = document.getElementById('timetable-body');
    if (!tabContainer || !tbody) return;

    // 学期タブの生成
    tabContainer.innerHTML = "";
    semesters.forEach(sem => {
        const btn = document.createElement('button');
        btn.innerText = sem;
        btn.className = (currentSemester === sem) ? "sem-btn active" : "sem-btn";
        btn.onclick = () => {
            currentSemester = sem;
            localStorage.setItem('current-semester', sem);
            initTimetable();
        };
        tabContainer.appendChild(btn);
    });

    // 5限×5日のテーブル生成
    tbody.innerHTML = "";
    const days = ["月", "火", "水", "木", "金"];
    for (let period = 1; period <= 5; period++) {
        const row = document.createElement('tr');
        
        // 時限表示 (左端)
        const timeTd = document.createElement('td');
        timeTd.innerText = period;
        timeTd.style.background = "#333";
        timeTd.style.width = "30px";
        row.appendChild(timeTd);

        // 各曜日のセル
        days.forEach(day => {
            const td = document.createElement('td');
            const key = `${day}-${period}`;
            const data = (timetableData[currentSemester] && timetableData[currentSemester][key]) 
                         ? timetableData[currentSemester][key] 
                         : {subject: "", place: ""};

            td.innerHTML = `
                <span class="tt-subject">${data.subject}</span>
                <span class="tt-place">${data.place}</span>
            `;
            
            td.onclick = () => editTimetableSlot(currentSemester, key, data.subject, data.place);
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}

// マスをタップした時の編集処理
function editTimetableSlot(sem, key, oldSub, oldPlace) {
    const sub = prompt(`${sem}【${key}】\n科目名を入力:`, oldSub);
    if (sub === null) return;
    const place = prompt(`${sem}【${key}】\n教室・場所を入力:`, oldPlace);
    if (place === null) return;

    if (!timetableData[sem]) timetableData[sem] = {};
    timetableData[sem][key] = { subject: sub, place: place };
    
    localStorage.setItem('timetable-data', JSON.stringify(timetableData));
    initTimetable();
}

// --- 既存の初期化処理(window.onload)に追記 ---
// 既存の window.onload の中に initTimetable(); を追加してください
const originalOnload = window.onload;
window.onload = () => {
    if (originalOnload) originalOnload();
    initTimetable();
};

// showPage関数も更新して、時間割タブが押された時に初期化するようにします
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'home') updateHomeTodayEvent();
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'timetable') initTimetable(); // 追加
    
    window.scrollTo(0, 0);
}



// initTimetable 内の td.innerHTML の部分をこれに差し替え
td.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <span class="tt-subject" style="white-space: normal; word-wrap: break-word; display: block; width: 100%;">${data.subject || ""}</span>
        <span class="tt-place" style="white-space: normal; word-wrap: break-word; display: block; width: 100%; margin-top: 4px;">${data.place || ""}</span>
    </div>
`;
