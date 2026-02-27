/* ==========================================
   1. セキュリティ：初回アクセス認証
   ========================================== */
(function() {
    const SECRET_KEY = "harakazu5566"; // パスワード
    const AUTH_ID = "my_dashboard_authenticated";

    if (localStorage.getItem(AUTH_ID) === "true") {
        return;
    }

    let pass = prompt("新しいデバイスを検知しました。パスワードを入力してください。");

    if (pass === SECRET_KEY) {
        localStorage.setItem(AUTH_ID, "true");
        alert("認証に成功しました。次からは入力を省略します。");
    } else {
        alert("パスワードが違います。アクセスできません。");
        document.body.innerHTML = `
            <div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif;">
                <div style="text-align:center;">
                    <h1>🔒 Access Denied</h1>
                    <p>正しいパスワードが必要です。</p>
                    <button onclick="location.reload()" style="background:#ff2e63; color:white; border:none; padding:10px 20px; border-radius:10px;">再試行</button>
                </div>
            </div>`;
    }
})();

/* ==========================================
   2. グローバル変数・データ管理
   ========================================== */
// データの読み込み（安全策付き）
function getJSON(key, defaultVal) {
    const val = localStorage.getItem(key);
    if (!val) return defaultVal;
    try { return JSON.parse(val); } catch(e) { return defaultVal; }
}

let links = getJSON('user-links', [{name: "Google", url: "https://google.com"}, {name: "YouTube", url: "https://youtube.com"}]);
let uraLinks = getJSON('ura-links', []);
let gateName = localStorage.getItem('gate-name') || "リンク設定";
let isUraView = false;
let isUraEditorMode = false;
let displayDate = new Date();
let selectedFullDate = "";
let ideaPages = getJSON('idea-pages', [{title: "ページ1", content: ""}]);
let currentPageIndex = 0;
let stickies = getJSON('sticky-notes', []);
let todoData = getJSON('todo-data', [{category: "一般", items: []}]);
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';
let currentSemester = localStorage.getItem('current-semester') || "1年 前期";
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];
let timetableData = getJSON('timetable-data', {});
let shiftData = getJSON('shift-data', {});

/* ==========================================
   3. データ移行機能（コピー＆読み込み）
   ========================================== */
// ※エラーに強いように、他の機能より先に定義します

function toggleDataMenu(event) {
    if(event) event.stopPropagation();
    const menu = document.getElementById('data-menu');
    if(menu) menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
}

document.addEventListener('click', () => {
    const menu = document.getElementById('data-menu');
    if (menu) menu.style.display = 'none';
});

function exportData() {
    try {
        const allStorageData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            allStorageData[key] = localStorage.getItem(key);
        }
        const dataString = JSON.stringify(allStorageData);
        navigator.clipboard.writeText(dataString).then(() => {
            alert("【完全バックアップ成功】\n全てのデータをコピーしました。\n（シフト、リンク、メモ、ToDo、時間割、付箋、ネタ帳、カレンダー、パスワード認証すべてが含まれています）");
        }).catch(() => {
            prompt("コピーに失敗しました。以下の文字をすべて選択してコピーしてください：", dataString);
        });
    } catch (e) {
        alert("エラーが発生しました: " + e);
    }
}

function importData() {
    const jsonString = prompt("コピーしたデータをここに貼り付けてください：");
    if (!jsonString) return;
    try {
        const importedData = JSON.parse(jsonString);
        if (confirm("全てのデータを上書きしますか？")) {
            Object.keys(importedData).forEach(key => {
                localStorage.setItem(key, importedData[key]);
            });
            alert("同期が完了しました！アプリを再起動します。");
            location.reload();
        }
    } catch (e) {
        alert("形式が正しくありません。コピーし直してください。");
    }
}

/* ==========================================
   4. 共通システム（時計・ページ切り替え）
   ========================================== */
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dateElem = document.getElementById('date');
    const clockElem = document.getElementById('clock');
    if (dateElem) dateElem.innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    if (clockElem) clockElem.innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
    
    if (pageId === 'home') {
        updateHomeTodayEvent();
        renderHomeLinks();
    }
    if (pageId === 'shift') initShift();
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'timetable') initTimetable();
    window.scrollTo(0, 0);
}

/* --- 以下、元の機能の関数 --- */

function renderHomeLinks() {
    const grid = document.getElementById('link-grid-container');
    const title = document.getElementById('link-section-title');
    if (!grid) return;
    grid.innerHTML = "";
    const currentList = isUraView ? uraLinks : links;
    if(title) title.innerText = isUraView ? "リンク設定" : "クイックリンク";
    currentList.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url; a.className = "quick-link-btn"; a.target = "_blank"; a.innerText = link.name;
        grid.appendChild(a);
    });
    const gateBtn = document.createElement('a');
    gateBtn.href = "javascript:void(0)";
    gateBtn.className = (currentList.length % 2 === 0) ? "quick-link-btn span-2" : "quick-link-btn";
    gateBtn.innerText = isUraView ? "↩ リンクに戻る" : gateName;
    gateBtn.onclick = (e) => { e.preventDefault(); isUraView = !isUraView; renderHomeLinks(); };
    grid.appendChild(gateBtn);
}

function openLinkEditor() { isUraEditorMode = isUraView; const m = document.getElementById('link-editor-modal'); if(m) m.style.display = 'block'; renderEditorList(); }
function closeLinkEditor() { const m = document.getElementById('link-editor-modal'); if(m) m.style.display = 'none'; renderHomeLinks(); }
function saveLinks() { localStorage.setItem('user-links', JSON.stringify(links)); localStorage.setItem('ura-links', JSON.stringify(uraLinks)); }

function createCalendar() {
    const y = displayDate.getFullYear(); const m = displayDate.getMonth();
    const disp = document.getElementById('calendar-month'); if(disp) disp.innerText = `${y}年 ${m + 1}月`;
    const tbody = document.getElementById('calendar-body'); if(!tbody) return;
    tbody.innerHTML = "";
    const firstDay = new Date(y, m, 1).getDay(); const lastDate = new Date(y, m + 1, 0).getDate();
    const today = new Date(); const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (!selectedFullDate) selectedFullDate = todayStr;
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) { cell.innerText = ""; } 
            else {
                let d = date; let fullDate = `${y}-${m + 1}-${d}`; cell.innerText = d;
                if (fullDate === todayStr) cell.classList.add('today');
                if (localStorage.getItem(fullDate)) cell.classList.add('has-event');
                if (selectedFullDate === fullDate) cell.classList.add('selected');
                cell.onclick = () => { document.querySelectorAll('#calendar-body td').forEach(td => td.classList.remove('selected')); cell.classList.add('selected'); selectedFullDate = fullDate; refreshEventInput(); };
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row); if (date > lastDate) break;
    }
    refreshEventInput();
}

function refreshEventInput() {
    const label = document.getElementById('selected-date-label'); const input = document.getElementById('event-input');
    if (selectedFullDate) { if (label) label.innerText = selectedFullDate + " の予定"; if (input) input.value = localStorage.getItem(selectedFullDate) || ""; }
}

function saveEvent() { if (!selectedFullDate) return; const val = document.getElementById('event-input').value; if (val.trim()) localStorage.setItem(selectedFullDate, val); else localStorage.removeItem(selectedFullDate); createCalendar(); updateHomeTodayEvent(); }
function changeMonth(diff) { displayDate.setMonth(displayDate.getMonth() + diff); createCalendar(); }
function updateHomeTodayEvent() { const now = new Date(); const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; const event = localStorage.getItem(fullDate) || "本日の予定はありません"; const elem = document.getElementById('today-event-text'); if (elem) elem.innerText = event; }

function saveDailyMemo() { const m = document.getElementById('daily-memo'); if(m) localStorage.setItem('daily-memo', m.value); }

function initStickies() {
    const c = document.getElementById('sticky-container'); if (!c) return;
    c.innerHTML = "";
    stickies.forEach((n, i) => {
        const d = document.createElement('div'); d.className = 'sticky-note'; d.style.backgroundColor = n.color; d.style.width = "100px"; d.style.height = "100px";
        d.innerHTML = `<textarea oninput="stickies[${i}].content = this.value; localStorage.setItem('sticky-notes', JSON.stringify(stickies))">${n.content}</textarea><span style="position:absolute;top:0;right:5px;cursor:pointer;" onclick="stickies.splice(${i},1); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies()">×</span>`;
        c.appendChild(d);
    });
}
function addStickyNote() { const col = document.getElementById('note-color'); stickies.push({color: col ? col.value : "#fff9c4", content: ""}); localStorage.setItem('sticky-notes', JSON.stringify(stickies)); initStickies(); }

function initIdeas() {
    const bar = document.getElementById('tab-bar'); if (!bar) return; 
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button'); b.innerText = p.title; b.className = "idea-tab-btn";
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.style.color = "white"; b.style.borderRadius = "20px"; b.style.padding = "8px 16px"; b.style.border = "none"; b.style.marginRight = "8px"; b.onclick = () => { currentPageIndex = i; initIdeas(); };
        bar.appendChild(b);
    });
    const noteArea = document.getElementById('idea-note'); if (noteArea) noteArea.value = ideaPages[currentPageIndex].content;
}
function saveCurrentIdea() { const area = document.getElementById('idea-note'); if(area) { ideaPages[currentPageIndex].content = area.value; localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); } }

function initTodo() {
    const bar = document.getElementById('todo-category-bar'); if (!bar) return; bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const group = document.createElement('div'); group.className = "todo-cat-tab";
        group.style.display = "inline-flex"; group.style.background = (i === currentTodoCategoryIndex) ? "var(--accent)" : "#444";
        group.style.borderRadius = "20px"; group.style.marginRight = "8px"; group.style.padding = "2px 10px";
        group.innerHTML = `<span onclick="currentTodoCategoryIndex=${i}; initTodo()">${cat.category}</span>`;
        bar.appendChild(group);
    });
    renderTodoList();
}
function renderTodoList() {
    const container = document.getElementById('todo-list-container'); if (!container) return; container.innerHTML = "";
    const items = todoData[currentTodoCategoryIndex].items;
    items.forEach((item, index) => {
        const div = document.createElement('div'); div.className = "todo-item";
        div.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''} onchange="todoData[${currentTodoCategoryIndex}].items[${index}].done=!todoData[${currentTodoCategoryIndex}].items[${index}].done; localStorage.setItem('todo-data', JSON.stringify(todoData)); renderTodoList();">
                         <span style="flex:1; margin-left:10px;">${item.text}</span>`;
        container.appendChild(div);
    });
}

function initTimetable() {
    const tbody = document.getElementById('timetable-body'); if (!tbody) return; tbody.innerHTML = "";
    const days = ["月", "火", "水", "木", "金"];
    for (let period = 1; period <= 5; period++) {
        const row = document.createElement('tr'); row.innerHTML = `<td>${period}</td>`;
        days.forEach(day => {
            const key = `${day}-${period}`;
            const data = (timetableData[currentSemester] && timetableData[currentSemester][key]) ? timetableData[currentSemester][key] : {subject: "", place: ""};
            const td = document.createElement('td'); td.innerHTML = `<div>${data.subject || ""}</div><div style="font-size:10px; color:#888;">${data.place || ""}</div>`;
            td.onclick = () => {
                const s = prompt("科目名:", data.subject); if (s === null) return;
                const p = prompt("場所:", data.place); if (p === null) return;
                if (!timetableData[currentSemester]) timetableData[currentSemester] = {};
                timetableData[currentSemester][key] = { subject: s, place: p };
                localStorage.setItem('timetable-data', JSON.stringify(timetableData)); initTimetable();
            };
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}

// シフト関連（簡易化してエラー防止）
let currentShiftDate = new Date();
function initShift() {
    const year = currentShiftDate.getFullYear(); const month = currentShiftDate.getMonth() + 1;
    const title = document.getElementById('shift-month-title'); if(title) title.innerText = `${year}年 ${month}月`;
    const container = document.getElementById('shift-list-container'); if(!container) return;
    container.innerHTML = "";
    const monthKey = `${year}-${month}`; const currentMonthData = shiftData[monthKey] || {};
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    for (let d = 1; d <= daysInMonth; d++) {
        const row = document.createElement('div'); row.className = "shift-row";
        const dayIdx = new Date(year, month - 1, d).getDay();
        const data = currentMonthData[d];
        const timeStr = data ? (data.work ? `${data.s}-${data.e}` : "休み") : "";
        row.innerHTML = `<div class="date-col">${d}</div><div class="day-col">(${dayNames[dayIdx]})</div><div class="time-col">${timeStr}</div><button onclick="openShiftEditor(${d})">編集</button>`;
        container.appendChild(row);
    }
}
function changeShiftMonth(diff) { currentShiftDate.setMonth(currentShiftDate.getMonth() + diff); initShift(); }
function openShiftEditor(d) { /* 既存のドラムロール等の処理 */ }

/* ==========================================
   10. 初期化処理（システムの起動）
   ========================================== */
window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    // 各コンポーネントを安全に呼び出す
    try { createCalendar(); } catch(e){}
    try { initIdeas(); } catch(e){}
    try { initStickies(); } catch(e){}
    try { initTodo(); } catch(e){}
    try { updateHomeTodayEvent(); } catch(e){}
    try { initTimetable(); } catch(e){}
    try { initShift(); } catch(e){}
    try { renderHomeLinks(); } catch(e){}

    const memoElem = document.getElementById('daily-memo');
    if (memoElem) memoElem.value = localStorage.getItem('daily-memo') || "";

    showPage('home');
};
