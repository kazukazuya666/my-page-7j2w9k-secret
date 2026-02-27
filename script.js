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
        
        // 取得した文字列を一度オブジェクトに戻す
        const cloudData = JSON.parse(content);
        
        if (Object.keys(cloudData).length > 0) {
            for (let key in cloudData) {
                // cloudData[key] の中身はすでにJSON文字列なので、そのまま保存
                localStorage.setItem(key, cloudData[key]);
            }
            console.log("クラウドから同期完了");
            return true;
        }
    } catch (e) {
        console.error("読み込みエラー:", e);
    }
    return false;
}

// --- Gistに全データを保存する ---
async function syncToGist() {
    // 同期対象のメインキー
    const keys = [
        'user-links', 'ura-links', 'gate-name', 'idea-pages', 
        'sticky-notes', 'todo-data', 'timetable-data', 'shift-data', 'daily-memo'
    ];
    
    // カレンダーの日付データを追加
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            keys.push(key);
        }
    }

    const allData = {};
    keys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) allData[key] = val; // ここは文字列のまま格納
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
        console.log("クラウドに保存しました");
    } catch (e) {
        console.error("同期失敗:", e);
    }
}

/* ==========================================
   1. セキュリティ：初回アクセス認証
   ========================================== */
(function() {
    const SECRET_KEY = "harakazu5566";
    const AUTH_ID = "my_dashboard_authenticated";
    if (localStorage.getItem(AUTH_ID) === "true") return;

    let pass = prompt("パスワードを入力してください。");
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
    try {
        links = JSON.parse(localStorage.getItem('user-links')) || [{name: "Google", url: "https://google.com"}];
        uraLinks = JSON.parse(localStorage.getItem('ura-links')) || [];
        gateName = localStorage.getItem('gate-name') || "リンク設定";
        ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
        stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
        todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "カテゴリ", items: []}];
        currentSemester = localStorage.getItem('current-semester') || "1年 前期";
        timetableData = JSON.parse(localStorage.getItem('timetable-data')) || {};
        shiftData = JSON.parse(localStorage.getItem('shift-data')) || {};
    } catch (e) {
        console.error("パースエラー。初期値を使用します:", e);
        // エラー時は最低限の初期値をセット
        links = [{name: "Google", url: "https://google.com"}];
        uraLinks = [];
        ideaPages = [{title: "ページ1", content: ""}];
        stickies = [];
        todoData = [{category: "カテゴリ", items: []}];
        timetableData = {};
        shiftData = {};
    }
}

/* ==========================================
   3. システム共通
   ========================================== */
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dElem = document.getElementById('date');
    const cElem = document.getElementById('clock');
    if (dElem) dElem.innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    if (cElem) cElem.innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
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
    gate.innerText = isUraView ? "↩ 戻る" : gateName;
    gate.onclick = () => { isUraView = !isUraView; renderHomeLinks(); };
    grid.appendChild(gate);
}

function renderEditorList() {
    const list = document.getElementById('editor-link-list');
    if (!list) return;
    const cur = isUraEditorMode ? uraLinks : links;
    list.innerHTML = "";
    cur.forEach((l, i) => {
        const d = document.createElement('div');
        d.className = "editor-item"; // スタイルはCSSに依存
        d.style = "display:flex; align-items:center; background:#444; padding:10px; margin-bottom:5px; border-radius:10px; gap:10px;";
        d.innerHTML = `
            <div style="flex:1;"><b>${l.name}</b><br><small>${l.url}</small></div>
            <button onclick="deleteLink(${i})">削除</button>`;
        list.appendChild(d);
    });
}

function saveLinks() {
    localStorage.setItem('user-links', JSON.stringify(links));
    localStorage.setItem('ura-links', JSON.stringify(uraLinks));
    syncToGist();
}
function deleteLink(i) { (isUraEditorMode ? uraLinks : links).splice(i, 1); saveLinks(); renderEditorList(); renderHomeLinks(); }
function addLink() {
    const n = document.getElementById('new-link-name'), u = document.getElementById('new-link-url');
    if(!n.value || !u.value) return;
    (isUraEditorMode ? uraLinks : links).push({name:n.value, url:u.value});
    saveLinks(); renderEditorList(); n.value=""; u.value="";
}
function openLinkEditor() { isUraEditorMode = isUraView; document.getElementById('link-editor-modal').style.display='block'; renderEditorList(); }
function closeLinkEditor() { document.getElementById('link-editor-modal').style.display='none'; renderHomeLinks(); }

/* ==========================================
   5. カレンダー
   ========================================== */
function createCalendar() {
    const y = displayDate.getFullYear(), m = displayDate.getMonth();
    const display = document.getElementById('calendar-month'); if(display) display.innerText = `${y}年 ${m + 1}月`;
    const fDay = new Date(y, m, 1).getDay(), lDate = new Date(y, m+1, 0).getDate();
    const tbody = document.getElementById('calendar-body'); if(!tbody) return;
    tbody.innerHTML = "";
    const todayStr = `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`;
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
    const input = document.getElementById('event-input');
    if (input) input.value = localStorage.getItem(selectedFullDate) || "";
    const label = document.getElementById('selected-date-label');
    if (label) label.innerText = selectedFullDate + " の予定";
}
function saveEvent() {
    const v = document.getElementById('event-input').value;
    if (v.trim()) localStorage.setItem(selectedFullDate, v);
    else localStorage.removeItem(selectedFullDate);
    createCalendar(); updateHomeTodayEvent(); syncToGist();
}
function changeMonth(d) { displayDate.setMonth(displayDate.getMonth() + d); createCalendar(); }
function updateHomeTodayEvent() {
    const full = `${new Date().getFullYear()}-${new Date().getMonth()+1}-${new Date().getDate()}`;
    const txt = localStorage.getItem(full) || "本日の予定はありません";
    const el = document.getElementById('today-event-text'); if(el) el.innerText = txt;
}

/* ==========================================
   6. ノート・付箋
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
        const b = document.createElement('button'); b.innerText = p.title;
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.onclick = () => { currentPageIndex = i; initIdeas(); };
        b.ondblclick = () => { const n = prompt("名前:", p.title); if(n){ p.title=n; saveIdeas(); } };
        bar.appendChild(b);
    });
    const area = document.getElementById('idea-note'); if(area) area.value = ideaPages[currentPageIndex].content;
}
function saveCurrentIdea() { ideaPages[currentPageIndex].content = document.getElementById('idea-note').value; saveIdeas(); }
function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); syncToGist(); initIdeas(); }
function createNewPage() { const n = prompt("ページ名:",""); if(n){ ideaPages.push({title:n, content:""}); currentPageIndex=ideaPages.length-1; saveIdeas(); } }

/* ==========================================
   7. ToDo
   ========================================== */
function initTodo() {
    const bar = document.getElementById('todo-category-bar'); if(!bar) return;
    bar.innerHTML = "";
    todoData.forEach((cat, i) => {
        const div = document.createElement('div'); div.className = "todo-cat-group";
        div.style.background = (i === currentTodoCategoryIndex) ? "var(--accent)" : "#444";
        div.innerHTML = `<span onclick="currentTodoCategoryIndex=${i}; initTodo();">${cat.category}</span>
                         <span onclick="todoData.splice(${i},1); currentTodoCategoryIndex=0; saveTodo(); initTodo();"> ×</span>`;
        bar.appendChild(div);
    });
    renderTodoList();
}
function renderTodoList() {
    const con = document.getElementById('todo-list-container'); if(!con) return;
    con.innerHTML = "";
    todoData[currentTodoCategoryIndex].items.forEach((item, i) => {
        if(currentTodoFilter==='active' && item.done) return;
        if(currentTodoFilter==='completed' && !item.done) return;
        const d = document.createElement('div'); d.className = `todo-item ${item.done?'completed':''}`;
        d.innerHTML = `<input type="checkbox" ${item.done?'checked':''} onchange="todoData[currentTodoCategoryIndex].items[${i}].done=!todoData[currentTodoCategoryIndex].items[${i}].done; saveTodo(); renderTodoList();">
                       <span style="flex:1; margin-left:10px;">${item.text}</span>
                       <button onclick="todoData[currentTodoCategoryIndex].items.splice(${i},1); saveTodo(); renderTodoList();">×</button>`;
        con.appendChild(d);
    });
}
function addTodoItem() {
    const input = document.getElementById('todo-input');
    if(!input || !input.value.trim()) return;
    todoData[currentTodoCategoryIndex].items.push({text:input.value.trim(), done:false});
    input.value=""; saveTodo(); renderTodoList();
}
function saveTodo() { localStorage.setItem('todo-data', JSON.stringify(todoData)); syncToGist(); }
function setTodoFilter(f) { currentTodoFilter = f; renderTodoList(); }
function createTodoCategory() { const n = prompt("名前:",""); if(n){ todoData.push({category:n, items:[]}); currentTodoCategoryIndex=todoData.length-1; saveTodo(); initTodo(); } }

/* ==========================================
   8. 時間割
   ========================================== */
function initTimetable() {
    const tabs = document.getElementById('semester-tabs');
    const body = document.getElementById('timetable-body');
    if(!tabs || !body) return;
    tabs.innerHTML = "";
    semesters.forEach(s => {
        const b = document.createElement('button'); b.innerText = s;
        b.className = (currentSemester === s) ? "sem-btn active" : "sem-btn";
        b.onclick = () => { currentSemester = s; localStorage.setItem('current-semester', s); initTimetable(); };
        tabs.appendChild(b);
    });
    body.innerHTML = "";
    const days = ["月","火","水","木","金"];
    for(let p=1; p<=5; p++) {
        const row = document.createElement('tr'); row.innerHTML = `<td>${p}</td>`;
        days.forEach(d => {
            const key = `${d}-${p}`;
            const data = (timetableData[currentSemester] && timetableData[currentSemester][key]) ? timetableData[currentSemester][key] : {subject:"", place:""};
            const td = document.createElement('td');
            td.innerHTML = `<b>${data.subject}</b><br><small>${data.place}</small>`;
            td.onclick = () => {
                const s = prompt("科目:", data.subject), pl = prompt("場所:", data.place);
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
   9. シフト（簡易版ロジック）
   ========================================== */
function initShift() {
    const y = currentShiftDate.getFullYear(), m = currentShiftDate.getMonth()+1;
    const title = document.getElementById('shift-month-title'); if(title) title.innerText = `${y}年 ${m}月`;
    const con = document.getElementById('shift-list-container'); if(!con) return;
    con.innerHTML = "";
    const mData = shiftData[`${y}-${m}`] || {};
    const lastDay = new Date(y, m, 0).getDate();
    for(let d=1; d<=lastDay; d++) {
        const dayIdx = new Date(y, m-1, d).getDay();
        const row = document.createElement('div'); row.className = "shift-row";
        const val = mData[d];
        row.innerHTML = `<div class="date-col">${d} (${["日","月","火","水","木","金","土"][dayIdx]})</div>
                         <div class="time-col">${val ? (val.work ? val.s+"-"+val.e : "休み") : ""}</div>
                         <button onclick="editShiftDay(${d})">編集</button>`;
        con.appendChild(row);
    }
}
function editShiftDay(d) {
    const y = currentShiftDate.getFullYear(), m = currentShiftDate.getMonth()+1;
    const s = prompt("開始 (HH:mm) ※休みは空白", "09:00");
    if (s === "") {
        if(!shiftData[`${y}-${m}`]) shiftData[`${y}-${m}`]={};
        shiftData[`${y}-${m}`][d] = {work:false};
    } else if (s) {
        const e = prompt("終了 (HH:mm)", "18:00");
        if(!shiftData[`${y}-${m}`]) shiftData[`${y}-${m}`]={};
        shiftData[`${y}-${m}`][d] = {work:true, s:s, e:e};
    }
    localStorage.setItem('shift-data', JSON.stringify(shiftData)); syncToGist(); initShift();
}
function changeShiftMonth(diff) { currentShiftDate.setMonth(currentShiftDate.getMonth()+diff); initShift(); }

/* ==========================================
   10. 起動
   ========================================== */
window.onload = async () => {
    updateClock(); setInterval(updateClock, 1000);
    
    // 1. クラウドからロード
    await loadAllDataFromGist();
    
    // 2. 変数へ展開
    refreshGlobalVariables();
    
    // 3. UI構築
    renderHomeLinks();
    createCalendar();
    initIdeas();
    initStickies();
    initTodo();
    initTimetable();
    initShift();
    updateHomeTodayEvent();
    
    const memo = document.getElementById('daily-memo');
    if(memo) memo.value = localStorage.getItem('daily-memo') || "";

    showPage('home');
};
