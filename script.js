/* ==========================================
   0. 同期設定（GitHub Gist）
   ========================================== */
const GITHUB_TOKEN = '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';
const GIST_ID = '094b64809122f383d20fcd235aeae11b';

function syncToGist() {
    const keys = ['user-links', 'ura-links', 'gate-name', 'idea-pages', 'sticky-notes', 'todo-data', 'timetable-data', 'shift-data', 'daily-memo'];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) keys.push(key);
    }
    const allData = {};
    keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) allData[key] = val;
    });
    // 非同期で実行してラグを防止
    fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { 'data.json': { content: JSON.stringify(allData) } } })
    }).catch(e => console.error("同期失敗:", e));
}

async function loadAllDataFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const gist = await response.json();
        const content = gist.files['data.json'].content;
        const cloudData = JSON.parse(content);
        if (Object.keys(cloudData).length > 0) {
            for (let key in cloudData) { localStorage.setItem(key, cloudData[key]); }
            return true;
        }
    } catch (e) { console.error("読み込みエラー:", e); }
    return false;
}

/* ==========================================
   1. セキュリティ
   ========================================== */
(function() {
    const SECRET_KEY = "harakazu5566";
    const AUTH_ID = "my_dashboard_authenticated";
    if (localStorage.getItem(AUTH_ID) === "true") return;
    let pass = prompt("パスワードを入力してください。");
    if (pass === SECRET_KEY) localStorage.setItem(AUTH_ID, "true");
    else {
        alert("パスワードが違います。");
        document.body.innerHTML = `<div style="background:#1a1a1a; color:white; height:100vh; display:flex; align-items:center; justify-content:center;"><h1>🔒 Access Denied</h1></div>`;
    }
})();

/* ==========================================
   2. グローバル変数
   ========================================== */
let links, uraLinks, gateName, ideaPages, stickies, todoData, timetableData, shiftData;
let isUraView = false, isUraEditorMode = false, currentPageIndex = 0, currentTodoCategoryIndex = 0, currentTodoFilter = 'all';
let displayDate = new Date(), selectedFullDate = "", currentSemester, currentShiftDate = new Date();
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];

function refreshGlobalVariables() {
    links = JSON.parse(localStorage.getItem('user-links')) || [{name: "Google", url: "https://google.com"}];
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
   3. システム共通
   ========================================== */
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    if (document.getElementById('date')) document.getElementById('date').innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    if (document.getElementById('clock')) document.getElementById('clock').innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const t = document.getElementById(pageId);
    if (t) t.classList.add('active');
    if (pageId === 'home') { updateHomeTodayEvent(); renderHomeLinks(); }
    if (pageId === 'shift') initShift();
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'timetable') initTimetable();
    window.scrollTo(0, 0);
}

/* ==========================================
   4. クイックリンク
   ========================================== */
function renderHomeLinks() {
    const grid = document.getElementById('link-grid-container');
    if (!grid) return;
    grid.innerHTML = "";
    const list = isUraView ? uraLinks : links;
    document.getElementById('link-section-title').innerText = isUraView ? "リンク設定" : "クイックリンク";
    list.forEach(l => {
        const a = document.createElement('a');
        a.href = l.url; a.className = "quick-link-btn"; a.target = "_blank"; a.innerText = l.name;
        grid.appendChild(a);
    });
    const gate = document.createElement('a');
    gate.href = "javascript:void(0)";
    gate.className = (list.length % 2 === 0) ? "quick-link-btn span-2" : "quick-link-btn";
    gate.innerText = isUraView ? "↩ リンクに戻る" : gateName;
    gate.onclick = () => { isUraView = !isUraView; renderHomeLinks(); };
    grid.appendChild(gate);
}

function renderEditorList() {
    const list = document.getElementById('editor-link-list');
    if (!list) return;
    const cur = isUraEditorMode ? uraLinks : links;
    list.innerHTML = "";
    cur.forEach((l, i) => {
        const item = document.createElement('div');
        item.style = "display:flex; align-items:center; background:#444; padding:10px; border-radius:10px; margin-bottom:8px; gap:10px; border:1px solid #555;";
        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button onclick="moveLink(${i}, -1)" style="background:#666; color:white; border:none; border-radius:4px; padding:5px 8px; font-size:12px;">▲</button>
                <button onclick="moveLink(${i}, 1)" style="background:#666; color:white; border:none; border-radius:4px; padding:5px 8px; font-size:12px;">▼</button>
            </div>
            <div onclick="editLinkContent(${i})" style="flex:1; cursor:pointer; min-width:0;">
                <div style="font-weight:bold; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.name}</div>
                <div style="font-size:0.7rem; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.url}</div>
            </div>
            <button onclick="deleteLink(${i})" style="background:none; border:none; color:#ff2e63; font-size:1.8rem; padding:0 10px;">×</button>`;
        list.appendChild(item);
    });
}
function moveLink(index, dir) {
    const list = isUraEditorMode ? uraLinks : links;
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    saveLinks(); renderEditorList(); renderHomeLinks();
}
function editLinkContent(i) {
    const list = isUraEditorMode ? uraLinks : links;
    const n = prompt("名前:", list[i].name); if(n===null) return;
    const u = prompt("URL:", list[i].url); if(u===null) return;
    list[i] = {name:n, url:u};
    saveLinks(); renderEditorList(); renderHomeLinks();
}
function deleteLink(i) { if(confirm("削除？")) { (isUraEditorMode?uraLinks:links).splice(i,1); saveLinks(); renderEditorList(); renderHomeLinks(); } }
function addLink() {
    const n = document.getElementById('new-link-name'), u = document.getElementById('new-link-url');
    if(!n.value || !u.value) return;
    (isUraEditorMode?uraLinks:links).push({name:n.value, url:u.value});
    saveLinks(); renderEditorList(); n.value=""; u.value="";
}
function saveLinks() { localStorage.setItem('user-links', JSON.stringify(links)); localStorage.setItem('ura-links', JSON.stringify(uraLinks)); syncToGist(); }
function openLinkEditor() { isUraEditorMode = isUraView; document.getElementById('link-editor-modal').style.display='block'; renderEditorList(); }
function closeLinkEditor() { document.getElementById('link-editor-modal').style.display='none'; renderHomeLinks(); }

/* ==========================================
   5. カレンダー
   ========================================== */
function createCalendar() {
    const y = displayDate.getFullYear(), m = displayDate.getMonth();
    const disp = document.getElementById('calendar-month'); if(disp) disp.innerText = `${y}年 ${m + 1}月`;
    const fDay = new Date(y, m, 1).getDay(), lDate = new Date(y, m+1, 0).getDate();
    const tbody = document.getElementById('calendar-body'); if(!tbody) return;
    tbody.innerHTML = "";
    const today = new Date(); const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
    if (!selectedFullDate) selectedFullDate = todayStr;
    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < fDay || date > lDate) cell.innerText = "";
            else {
                let d = date, full = `${y}-${m+1}-${d}`;
                cell.innerText = d;
                if (full === todayStr) cell.classList.add('today');
                if (localStorage.getItem(full)) cell.classList.add('has-event');
                if (selectedFullDate === full) cell.classList.add('selected');
                cell.onclick = () => {
                    document.querySelectorAll('#calendar-body td').forEach(t=>t.classList.remove('selected'));
                    cell.classList.add('selected'); selectedFullDate = full; refreshEventInput();
                };
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row); if (date > lDate) break;
    }
    refreshEventInput();
}
function refreshEventInput() {
    const input = document.getElementById('event-input'); if(input) input.value = localStorage.getItem(selectedFullDate) || "";
    const label = document.getElementById('selected-date-label'); if(label) label.innerText = selectedFullDate + " の予定";
}
function saveEvent() {
    const v = document.getElementById('event-input').value;
    if(v.trim()) localStorage.setItem(selectedFullDate, v); else localStorage.removeItem(selectedFullDate);
    createCalendar(); updateHomeTodayEvent(); syncToGist();
}
function changeMonth(d) { displayDate.setMonth(displayDate.getMonth() + d); createCalendar(); }
function updateHomeTodayEvent() {
    const full = `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`;
    const txt = localStorage.getItem(full) || "本日の予定はありません";
    if(document.getElementById('today-event-text')) document.getElementById('today-event-text').innerText = txt;
}

/* ==========================================
   6. ノート・付箋・ネタ帳（削除機能追加）
   ========================================== */
function saveDailyMemo() { localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); syncToGist(); }

function initStickies() {
    const c = document.getElementById('sticky-container'); if(!c) return;
    c.innerHTML = "";
    stickies.forEach((s, i) => {
        const d = document.createElement('div'); d.className = 'sticky-note'; d.style.backgroundColor = s.color;
        d.innerHTML = `<textarea oninput="stickies[${i}].content=this.value; localStorage.setItem('sticky-notes',JSON.stringify(stickies)); syncToGist();">${s.content}</textarea>
                       <span onclick="stickies.splice(${i},1); localStorage.setItem('sticky-notes',JSON.stringify(stickies)); syncToGist(); initStickies();" style="position:absolute;top:0;right:5px;cursor:pointer;">×</span>`;
        c.appendChild(d);
    });
}
function addStickyNote() {
    stickies.push({color: document.getElementById('note-color').value, content: ""});
    localStorage.setItem('sticky-notes', JSON.stringify(stickies)); syncToGist(); initStickies();
}

function initIdeas() {
    const bar = document.getElementById('tab-bar'); if(!bar) return;
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const group = document.createElement('div');
        group.style = `display:inline-flex; align-items:center; background:${(i===currentPageIndex)?"var(--accent)":"#444"}; color:white; border-radius:20px; margin-right:8px; padding:2px 12px; cursor:pointer;`;
        
        const b = document.createElement('span'); 
        b.innerText = p.title; b.style = "font-size:0.85rem;";
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => { const n = prompt("名前:", p.title); if(n){ p.title=n; saveIdeas(); } };
        
        const delBtn = document.createElement('span');
        delBtn.innerText = " ×"; delBtn.style = "color:rgba(255,255,255,0.6); margin-left:8px; font-weight:bold;";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (ideaPages.length > 1 && confirm(`「${p.title}」を削除しますか？`)) {
                ideaPages.splice(i, 1);
                if (currentPageIndex >= ideaPages.length) currentPageIndex = ideaPages.length - 1;
                saveIdeas();
            }
        };

        group.appendChild(b); group.appendChild(delBtn); bar.appendChild(group);
    });
    const area = document.getElementById('idea-note');
    if(area) area.value = ideaPages[currentPageIndex].content;
}

function saveCurrentIdea() { ideaPages[currentPageIndex].content = document.getElementById('idea-note').value; saveIdeas(); }
function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); syncToGist(); initIdeas(); }
function createNewPage() { const n = prompt("名前:",""); if(n){ ideaPages.push({title:n, content:""}); currentPageIndex=ideaPages.length-1; saveIdeas(); } }

/* ==========================================
   7. ToDo
   ========================================== */
function initTodo() {
    const bar = document.getElementById('todo-category-bar'); if (!bar) return;
    bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const group = document.createElement('div');
        group.style = `display:inline-flex; align-items:center; background:${(i===currentTodoCategoryIndex)?"var(--accent)":"#444"}; border-radius:20px; margin-right:8px; padding:2px 10px; cursor:pointer;`;
        
        const nameBtn = document.createElement('span');
        nameBtn.innerText = cat.category; nameBtn.style = "color:white; font-size:0.8rem;";
        nameBtn.onclick = () => {
            if (currentTodoCategoryIndex === i) {
                const n = prompt("カテゴリー名変更:", cat.category);
                if (n) { cat.category = n; saveTodo(); initTodo(); }
            } else { currentTodoCategoryIndex = i; initTodo(); }
        };

        const delBtn = document.createElement('span');
        delBtn.innerText = " ×"; delBtn.style = "color:rgba(255,255,255,0.6); margin-left:5px;";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (todoData.length > 1 && confirm("削除？")) { todoData.splice(i, 1); currentTodoCategoryIndex = 0; saveTodo(); initTodo(); }
        };
        group.appendChild(nameBtn); group.appendChild(delBtn); bar.appendChild(group);
    });
    renderTodoList();
}

function renderTodoList() {
    const container = document.getElementById('todo-list-container'); if (!container) return;
    container.innerHTML = "";
    todoData[currentTodoCategoryIndex].items.forEach((item, i) => {
        if (currentTodoFilter === 'active' && item.done) return;
        if (currentTodoFilter === 'completed' && !item.done) return;
        
        const div = document.createElement('div');
        div.className = `todo-item ${item.done ? 'completed' : ''}`;
        div.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="todoData[currentTodoCategoryIndex].items[${i}].done=!todoData[currentTodoCategoryIndex].items[${i}].done; saveTodo(); renderTodoList();">
            <span class="todo-text" style="flex:1; margin-left:10px; font-size:0.9rem; cursor:pointer;">${item.text}</span>
            <button onclick="todoData[currentTodoCategoryIndex].items.splice(${i},1); saveTodo(); renderTodoList();" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding:0 10px;">×</button>`;
        
        div.querySelector('.todo-text').onclick = () => {
            const n = prompt("項目変更:", item.text);
            if (n) { item.text = n; saveTodo(); renderTodoList(); }
        };
        container.appendChild(div);
    });
}
function addTodoItem() {
    const input = document.getElementById('todo-input');
    if(!input || !input.value.trim()) return;
    todoData[currentTodoCategoryIndex].items.push({text:input.value.trim(), done:false});
    input.value=""; saveTodo(); renderTodoList();
}
function saveTodo() { localStorage.setItem('todo-data', JSON.stringify(todoData)); syncToGist(); }
function setTodoFilter(f) { 
    currentTodoFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById('f-'+f)) document.getElementById('f-'+f).classList.add('active');
    renderTodoList(); 
}
function createTodoCategory() { const n = prompt("名前:",""); if(n){ todoData.push({category:n, items:[]}); currentTodoCategoryIndex=todoData.length-1; saveTodo(); initTodo(); } }

/* ==========================================
   8. 時間割
   ========================================== */
function initTimetable() {
    const tabs = document.getElementById('semester-tabs'); const body = document.getElementById('timetable-body');
    if(!tabs || !body) return; tabs.innerHTML = "";
    semesters.forEach(s => {
        const b = document.createElement('button'); b.innerText = s; b.className = (currentSemester === s) ? "sem-btn active" : "sem-btn";
        b.onclick = () => { currentSemester = s; localStorage.setItem('current-semester', s); initTimetable(); };
        tabs.appendChild(b);
    });
    body.innerHTML = ""; const days = ["月","火","水","木","金"];
    for(let p=1; p<=5; p++) {
        const row = document.createElement('tr'); row.innerHTML = `<td>${p}</td>`;
        days.forEach(d => {
            const key = `${d}-${p}`;
            const dt = (timetableData[currentSemester] && timetableData[currentSemester][key]) ? timetableData[currentSemester][key] : {subject:"", place:""};
            const td = document.createElement('td');
            td.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center;"><span class="tt-subject">${dt.subject}</span><span class="tt-place">${dt.place}</span></div>`;
            td.onclick = () => {
                const s = prompt("科目:", dt.subject), pl = prompt("場所:", dt.place);
                if(s!==null && pl!==null) {
                    if(!timetableData[currentSemester]) timetableData[currentSemester]={};
                    timetableData[currentSemester][key]={subject:s, place:pl};
                    localStorage.setItem('timetable-data', JSON.stringify(timetableData)); syncToGist(); initTimetable();
                }
            };
            row.appendChild(td);
        });
        body.appendChild(row);
    }
}

/* ==========================================
   9. シフト
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
    const container = document.getElementById('shift-list-container'); if(!container) return;
    container.innerHTML = "";
    const mData = shiftData[`${y}-${m}`] || {};
    const daysInM = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInM; d++) {
        const date = new Date(y, m-1, d); const dayIdx = date.getDay();
        const row = document.createElement('div'); row.className = "shift-row";
        const val = mData[d];
        let timeStr = "", timeStyle = "";
        if (val) {
            if (val.work) { timeStr = `${val.s} - ${val.e}`; timeStyle = "color: var(--accent);"; }
            else { timeStr = "休み"; timeStyle = "color: #ff4444; font-weight: bold; opacity: 0.8;"; }
        }
        row.innerHTML = `<div class="date-col">${d}</div><div class="day-col ${dayIdx===0?'day-sun':dayIdx===6?'day-sat':''}">(${["日","月","火","水","木","金","土"][dayIdx]})</div>
            <div class="time-col" style="${timeStyle}">${timeStr}</div>
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
    const y = currentShiftDate.getFullYear(), m = currentShiftDate.getMonth() + 1;
    const dateObj = new Date(y, m - 1, editingDate);
    document.getElementById('edit-date-display').innerText = `${m}月 ${editingDate}日 (${["日","月","火","水","木","金","土"][dateObj.getDay()]})`;
    const data = tempShiftData[editingDate] || { work: true, s: "09:00", e: "18:00" };
    isWorkingTemp = data.work;
    document.getElementById('btn-work-on').style.background = isWorkingTemp ? "var(--accent)" : "#444";
    document.getElementById('btn-work-off').style.background = !isWorkingTemp ? "#ff4444" : "#444";
    document.getElementById('shift-time-ui').style.opacity = isWorkingTemp ? "1" : "0.2";
    document.getElementById('shift-time-ui').style.pointerEvents = isWorkingTemp ? "auto" : "none";
    const [sh, sm] = data.s.split(':'), [eh, em] = data.e.split(':');
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
function moveShiftDate(diff) {
    tempShiftData[editingDate] = { work: isWorkingTemp, s: `${getDrumValue('drum-s-hour')}:${getDrumValue('drum-s-min')}`, e: `${getDrumValue('drum-e-hour')}:${getDrumValue('drum-e-min')}` };
    const lastDay = new Date(currentShiftDate.getFullYear(), currentShiftDate.getMonth() + 1, 0).getDate();
    let next = editingDate + diff; if (next < 1 || next > lastDay) return;
    editingDate = next; updateEditorUI();
}

/* ==========================================
   10. 起動
   ========================================== */
window.onload = async () => {
    updateClock(); setInterval(updateClock, 1000);
    await loadAllDataFromGist();
    refreshGlobalVariables();
    renderHomeLinks(); createCalendar(); initIdeas(); initStickies(); initTodo(); initTimetable(); initShift(); updateHomeTodayEvent();
    if(document.getElementById('daily-memo')) document.getElementById('daily-memo').value = localStorage.getItem('daily-memo') || "";
    showPage('home');
};
