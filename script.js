/* ==========================================
   0. 同期設定（GitHub Gist）
   ========================================== */
const GITHUB_TOKEN = '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';
const GIST_ID = '094b64809122f383d20fcd235aeae11b';

// --- Gistからデータを読み込む ---
async function loadAllDataFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const gist = await response.json();
        const content = gist.files['data.json'].content;
        const cloudData = JSON.parse(content);
        if (Object.keys(cloudData).length > 0) {
            for (let key in cloudData) {
                localStorage.setItem(key, cloudData[key]);
            }
            return true;
        }
    } catch (e) { console.error("読み込みエラー:", e); }
    return false;
}

// --- Gistに全データを保存する（同期実行） ---
async function syncToGist() {
    const keys = [
        'user-links', 'ura-links', 'gate-name', 'idea-pages', 
        'sticky-notes', 'todo-data', 'timetable-data', 'shift-data', 'daily-memo'
    ];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) keys.push(key);
    }
    const allData = {};
    keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) allData[key] = val;
    });
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: { 'data.json': { content: JSON.stringify(allData) } }
            })
        });
        console.log("クラウド同期完了");
    } catch (e) { console.error("同期失敗:", e); }
}

/* ==========================================
   1. セキュリティ：初回アクセス認証
   ========================================== */
(function() {
    const SECRET_KEY = "harakazu5566";
    const AUTH_ID = "my_dashboard_authenticated";
    if (localStorage.getItem(AUTH_ID) === "true") return;
    let pass = prompt("新しいデバイスを検知しました。パスワードを入力してください。");
    if (pass === SECRET_KEY) {
        localStorage.setItem(AUTH_ID, "true");
    } else {
        alert("パスワードが違います。");
        document.body.innerHTML = `<div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center;"><h1>🔒 Access Denied</h1></div>`;
    }
})();

/* ==========================================
   2. グローバル変数・データ管理
   ========================================== */
let links, uraLinks, gateName, ideaPages, stickies, todoData, timetableData, shiftData;
let isUraView = false, isUraEditorMode = false, currentPageIndex = 0, currentTodoCategoryIndex = 0, currentTodoFilter = 'all';
let displayDate = new Date(), selectedFullDate = "", currentSemester, currentShiftDate = new Date();
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];

function refreshGlobalVariables() {
    links = JSON.parse(localStorage.getItem('user-links')) || [{name: "Google", url: "https://google.com"}, {name: "YouTube", url: "https://youtube.com"}];
    uraLinks = JSON.parse(localStorage.getItem('ura-links')) || [];
    gateName = localStorage.getItem('gate-name') || "リンク設定";
    ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
    stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
    todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "映画", items: []}];
    currentSemester = localStorage.getItem('current-semester') || "1年 前期";
    timetableData = JSON.parse(localStorage.getItem('timetable-data')) || {};
    shiftData = JSON.parse(localStorage.getItem('shift-data')) || {};
}

/* ==========================================
   3. 共通システム（時計・ページ切り替え）
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
    if (pageId === 'home') { updateHomeTodayEvent(); renderHomeLinks(); }
    if (pageId === 'shift') initShift();
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'timetable') initTimetable();
    window.scrollTo(0, 0);
}

/* ==========================================
   4. クイックリンク機能
   ========================================== */
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

function renderEditorList() {
    const list = document.getElementById('editor-link-list');
    const title = document.getElementById('editor-title');
    if (!list) return;
    const currentList = isUraEditorMode ? uraLinks : links;
    title.innerText = isUraEditorMode ? "リンク編集" : "🔗 リンク編集";
    list.innerHTML = "";
    currentList.forEach((link, i) => {
        const item = document.createElement('div');
        item.style = "display:flex; align-items:center; background:#444; padding:10px; border-radius:10px; margin-bottom:8px; gap:10px; border:1px solid #555;";
        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button onclick="moveLink(${i}, -1)" style="background:#666; color:white; border:none; border-radius:4px; padding:5px 8px; font-size:12px;">▲</button>
                <button onclick="moveLink(${i}, 1)" style="background:#666; color:white; border:none; border-radius:4px; padding:5px 8px; font-size:12px;">▼</button>
            </div>
            <div onclick="editLinkContent(${i})" style="flex:1; cursor:pointer; min-width:0;">
                <div style="font-weight:bold; color:white;">${link.name}</div>
                <div style="font-size:0.7rem; color:#888;">${link.url}</div>
            </div>
            <button onclick="deleteLink(${i})" style="background:none; border:none; color:#ff2e63; font-size:1.8rem;">×</button>`;
        list.appendChild(item);
    });
}

function moveLink(index, direction) {
    const list = isUraEditorMode ? uraLinks : links;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    saveLinks(); renderEditorList(); renderHomeLinks();
}

function editLinkContent(index) {
    const list = isUraEditorMode ? uraLinks : links;
    const n = prompt("名前:", list[index].name); if (n === null) return;
    const u = prompt("URL:", list[index].url); if (u === null) return;
    list[index] = { name: n, url: u };
    saveLinks(); renderEditorList(); renderHomeLinks();
}

function deleteLink(index) {
    if (!confirm("削除しますか？")) return;
    (isUraEditorMode ? uraLinks : links).splice(index, 1);
    saveLinks(); renderEditorList(); renderHomeLinks();
}

function addLink() {
    const n = document.getElementById('new-link-name');
    const u = document.getElementById('new-link-url');
    if(!n.value || !u.value) return;
    (isUraEditorMode ? uraLinks : links).push({name: n.value, url: u.value});
    saveLinks(); renderEditorList(); n.value=""; u.value="";
}

function saveLinks() {
    localStorage.setItem('user-links', JSON.stringify(links));
    localStorage.setItem('ura-links', JSON.stringify(uraLinks));
    syncToGist();
}

function openLinkEditor() { isUraEditorMode = isUraView; document.getElementById('link-editor-modal').style.display = 'block'; renderEditorList(); }
function closeLinkEditor() { document.getElementById('link-editor-modal').style.display = 'none'; renderHomeLinks(); }
function toggleUraMode() { isUraEditorMode = !isUraEditorMode; renderEditorList(); }

/* ==========================================
   5. カレンダー機能
   ========================================== */
function createCalendar() {
    const year = displayDate.getFullYear(); const month = displayDate.getMonth();
    const display = document.getElementById('calendar-month'); if(display) display.innerText = `${year}年 ${month + 1}月`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body'); if(!tbody) return;
    tbody.innerHTML = "";
    const today = new Date(); const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (!selectedFullDate) selectedFullDate = todayStr;
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) { cell.innerText = ""; } 
            else {
                let d = date; let fullDate = `${year}-${month + 1}-${d}`;
                cell.innerText = d;
                if (fullDate === todayStr) cell.classList.add('today');
                if (localStorage.getItem(fullDate)) cell.classList.add('has-event');
                if (selectedFullDate === fullDate) cell.classList.add('selected');
                cell.onclick = () => selectDate(cell, fullDate);
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row); if (date > lastDate) break;
    }
    refreshEventInput();
}

function selectDate(element, fullDate) {
    document.querySelectorAll('#calendar-body td').forEach(td => td.classList.remove('selected'));
    element.classList.add('selected'); selectedFullDate = fullDate; refreshEventInput();
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
    createCalendar(); updateHomeTodayEvent(); syncToGist();
}

function changeMonth(diff) { displayDate.setMonth(displayDate.getMonth() + diff); createCalendar(); }

function updateHomeTodayEvent() {
    const now = new Date(); const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const event = localStorage.getItem(fullDate) || "本日の予定はありません";
    const elem = document.getElementById('today-event-text'); if (elem) elem.innerText = event;
}

/* ==========================================
   6. ノート機能
   ========================================== */
function saveDailyMemo() { 
    localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); 
    syncToGist();
}

function initStickies() {
    const c = document.getElementById('sticky-container'); if (!c) return;
    c.innerHTML = "";
    stickies.forEach((n, i) => {
        const d = document.createElement('div'); d.className = 'sticky-note'; d.style.backgroundColor = n.color;
        d.innerHTML = `<textarea oninput="updateSticky(${i}, this.value)">${n.content}</textarea><span style="position:absolute;top:0;right:5px;cursor:pointer;" onclick="delSticky(${i})">×</span>`;
        c.appendChild(d);
    });
}
function addStickyNote() {
    stickies.push({color: document.getElementById('note-color').value, content: ""});
    saveStickies(); initStickies();
}
function updateSticky(i, v) { stickies[i].content = v; saveStickies(); }
function delSticky(i) { stickies.splice(i,1); saveStickies(); initStickies(); }
function saveStickies() { localStorage.setItem('sticky-notes', JSON.stringify(stickies)); syncToGist(); }

function initIdeas() {
    const bar = document.getElementById('tab-bar'); if (!bar) return; bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button'); b.innerText = p.title;
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => { const n = prompt("名前変更", p.title); if(n) { p.title = n; saveIdeas(); initIdeas(); } };
        bar.appendChild(b);
    });
    const area = document.getElementById('idea-note'); if (area) area.value = ideaPages[currentPageIndex].content;
}
function createNewPage() {
    const n = prompt("ページ名", "新ページ");
    if(n) { ideaPages.push({title: n, content: ""}); currentPageIndex = ideaPages.length - 1; saveIdeas(); initIdeas(); }
}
function saveCurrentIdea() { ideaPages[currentPageIndex].content = document.getElementById('idea-note').value; saveIdeas(); }
function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); syncToGist(); }

/* ==========================================
   7. ToDo機能
   ========================================== */
function initTodo() {
    const bar = document.getElementById('todo-category-bar'); if (!bar) return; bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const group = document.createElement('div'); group.className = "todo-cat-group";
        group.style.background = (i === currentTodoCategoryIndex) ? "var(--accent)" : "#444";
        const nameBtn = document.createElement('span'); nameBtn.innerText = cat.category;
        nameBtn.onclick = () => { if (currentTodoCategoryIndex === i) { const n = prompt("変更:", cat.category); if(n) { cat.category = n; saveTodo(); initTodo(); } } else { currentTodoCategoryIndex = i; initTodo(); } };
        const delBtn = document.createElement('span'); delBtn.innerText = " ×";
        delBtn.onclick = (e) => { e.stopPropagation(); if (todoData.length > 1 && confirm("削除？")) { todoData.splice(i, 1); currentTodoCategoryIndex = 0; saveTodo(); initTodo(); } };
        group.appendChild(nameBtn); group.appendChild(delBtn); bar.appendChild(group);
    });
    renderTodoList();
}
function renderTodoList() {
    const container = document.getElementById('todo-list-container'); if (!container) return; container.innerHTML = "";
    const items = todoData[currentTodoCategoryIndex].items;
    items.forEach((item, index) => {
        if (currentTodoFilter === 'active' && item.done) return;
        if (currentTodoFilter === 'completed' && !item.done) return;
        const div = document.createElement('div'); div.className = `todo-item ${item.done ? 'completed' : ''}`;
        div.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span class="todo-text" style="flex:1; margin-left:10px;">${item.text}</span>
            <button onclick="deleteTodo(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem;">×</button>`;
        div.querySelector('.todo-text').onclick = () => { const n = prompt("変更:", item.text); if(n) { item.text = n; saveTodo(); renderTodoList(); } };
        container.appendChild(div);
    });
}
function addTodoItem() {
    const input = document.getElementById('todo-input'); if (!input || !input.value.trim()) return;
    todoData[currentTodoCategoryIndex].items.push({text: input.value.trim(), done: false});
    input.value = ""; saveTodo(); renderTodoList();
}
function toggleTodo(i) { todoData[currentTodoCategoryIndex].items[i].done = !todoData[currentTodoCategoryIndex].items[i].done; saveTodo(); renderTodoList(); }
function deleteTodo(i) { if(confirm("削除？")) { todoData[currentTodoCategoryIndex].items.splice(i, 1); saveTodo(); renderTodoList(); } }
function setTodoFilter(f) { currentTodoFilter = f; renderTodoList(); }
function createTodoCategory() { const n = prompt("新カテゴリ:", ""); if(n) { todoData.push({category: n, items: []}); currentTodoCategoryIndex = todoData.length - 1; saveTodo(); initTodo(); } }
function saveTodo() { localStorage.setItem('todo-data', JSON.stringify(todoData)); syncToGist(); }

/* ==========================================
   8. 時間割機能
   ========================================== */
function initTimetable() {
    const tabs = document.getElementById('semester-tabs'); const tbody = document.getElementById('timetable-body');
    if (!tabs || !tbody) return; tabs.innerHTML = "";
    semesters.forEach(sem => {
        const b = document.createElement('button'); b.innerText = sem; b.className = (currentSemester === sem) ? "sem-btn active" : "sem-btn";
        b.onclick = () => { currentSemester = sem; localStorage.setItem('current-semester', sem); initTimetable(); };
        tabs.appendChild(b);
    });
    tbody.innerHTML = ""; const days = ["月", "火", "水", "木", "金"];
    for (let p = 1; p <= 5; p++) {
        const row = document.createElement('tr'); row.innerHTML = `<td>${p}</td>`;
        days.forEach(day => {
            const key = `${day}-${p}`;
            const d = (timetableData[currentSemester] && timetableData[currentSemester][key]) ? timetableData[currentSemester][key] : {subject: "", place: ""};
            const td = document.createElement('td'); td.innerHTML = `<span class="tt-subject">${d.subject}</span><span class="tt-place">${d.place}</span>`;
            td.onclick = () => editSlot(currentSemester, key, d.subject, d.place);
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}
function editSlot(sem, key, os, op) {
    const s = prompt("科目:", os); if (s === null) return;
    const p = prompt("場所:", op); if (p === null) return;
    if (!timetableData[sem]) timetableData[sem] = {};
    timetableData[sem][key] = { subject: s, place: p };
    localStorage.setItem('timetable-data', JSON.stringify(timetableData)); syncToGist(); initTimetable();
}

/* ==========================================
   9. シフト管理機能
   ========================================== */
let tempShiftData = {}, editingDate = 1, isWorkingTemp = false;
function initDrums() {
    const drums = [{id:'drum-s-hour',m:24},{id:'drum-s-min',m:60},{id:'drum-e-hour',m:24},{id:'drum-e-min',m:60}];
    drums.forEach(d => {
        const el = document.getElementById(d.id); if (!el || el.children.length > 0) return;
        el.innerHTML = '<div style="height:40px;"></div>';
        for(let i=0; i<d.m; i++) el.innerHTML += `<div class="drum-unit">${i.toString().padStart(2,'0')}</div>`;
        el.innerHTML += '<div style="height:40px;"></div>';
        el.onscroll = () => {
            const idx = Math.round(el.scrollTop / 40);
            el.querySelectorAll('.drum-unit').forEach((u, i) => u.classList.toggle('active', i === idx));
        };
    });
}
function getDrumValue(id) { return Math.round(document.getElementById(id).scrollTop / 40).toString().padStart(2, '0'); }
function setDrumValue(id, v) { document.getElementById(id).scrollTo({ top: parseInt(v)*40 }); }
function changeShiftMonth(diff) { currentShiftDate.setMonth(currentShiftDate.getMonth() + diff); initShift(); }
function initShift() {
    const y = currentShiftDate.getFullYear(), m = currentShiftDate.getMonth() + 1;
    document.getElementById('shift-month-title').innerText = `${y}年 ${m}月`;
    const container = document.getElementById('shift-list-container'); if(!container) return; container.innerHTML = "";
    const mData = shiftData[`${y}-${m}`] || {};
    const daysInM = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInM; d++) {
        const date = new Date(y, m-1, d); const dayIdx = date.getDay();
        const row = document.createElement('div'); row.className = "shift-row";
        const data = mData[d];
        row.innerHTML = `<div class="date-col">${d}</div><div class="day-col ${(dayIdx===0)?'day-sun':(dayIdx===6)?'day-sat':''}">(${["日","月","火","水","木","金","土"][dayIdx]})</div>
            <div class="time-col" style="${data ? (data.work ? 'color:var(--accent)' : 'color:#ff4444') : ''}">${data ? (data.work ? `${data.s}-${data.e}` : '休み') : ''}</div>
            <div class="edit-col"><button class="mini-edit-btn" onclick="openShiftEditor(${d})">編集</button></div>`;
        container.appendChild(row);
    }
}
function openShiftEditor(day) {
    editingDate = day; initDrums();
    const y = currentShiftDate.getFullYear(), m = currentShiftDate.getMonth() + 1;
    tempShiftData = JSON.parse(JSON.stringify(shiftData[`${y}-${m}`] || {}));
    updateEditorUI(); document.getElementById('shift-editor-modal').style.display = 'block';
}
function updateEditorUI() {
    const data = tempShiftData[editingDate] || { work: true, s: "09:00", e: "18:00" };
    isWorkingTemp = data.work;
    document.getElementById('btn-work-on').style.background = isWorkingTemp ? "var(--accent)" : "#444";
    document.getElementById('btn-work-off').style.background = !isWorkingTemp ? "#ff4444" : "#444";
    const [sh, sm] = data.s.split(':'); const [eh, em] = data.e.split(':');
    setTimeout(() => { setDrumValue('drum-s-hour',sh); setDrumValue('drum-s-min',sm); setDrumValue('drum-e-hour',eh); setDrumValue('drum-e-min',em); }, 50);
}
function closeShiftEditor(save) {
    if (save) {
        tempShiftData[editingDate] = { work: isWorkingTemp, s: `${getDrumValue('drum-s-hour')}:${getDrumValue('drum-s-min')}`, e: `${getDrumValue('drum-e-hour')}:${getDrumValue('drum-e-min')}` };
        shiftData[`${currentShiftDate.getFullYear()}-${currentShiftDate.getMonth()+1}`] = tempShiftData;
        localStorage.setItem('shift-data', JSON.stringify(shiftData)); syncToGist();
    }
    document.getElementById('shift-editor-modal').style.display = 'none'; initShift();
}

/* ==========================================
   10. 初期化処理（システムの起動）
   ========================================== */
window.onload = async () => {
    updateClock(); setInterval(updateClock, 1000);
    await loadAllDataFromGist(); // クラウドから読み込み
    refreshGlobalVariables(); // 変数に反映
    createCalendar(); initIdeas(); initStickies(); initTodo(); updateHomeTodayEvent(); initTimetable(); initShift(); renderHomeLinks();
    const m = document.getElementById('daily-memo'); if (m) m.value = localStorage.getItem('daily-memo') || "";
    showPage('home');
};
