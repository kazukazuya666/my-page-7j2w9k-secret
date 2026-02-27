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
                    <button onclick="location.reload()" style="background:var(--accent); color:white; border:none; padding:10px 20px; border-radius:10px;">再試行</button>
                </div>
            </div>`;
    }
})();

/* ==========================================
   2. グローバル変数・データ管理
   ========================================== */
// リンク関連
let links = JSON.parse(localStorage.getItem('user-links')) || [
    {name: "Google", url: "https://google.com"},
    {name: "YouTube", url: "https://youtube.com"}
];
let uraLinks = JSON.parse(localStorage.getItem('ura-links')) || [];
let gateName = localStorage.getItem('gate-name') || "リンク設定";
let isUraView = false;
let isUraEditorMode = false;

// カレンダー関連
let displayDate = new Date();
let selectedFullDate = "";

// ネタ帳・付箋・ToDo関連
let ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
let currentPageIndex = 0;
let stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
let todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "映画", items: []}];
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';

// 時間割関連
let currentSemester = localStorage.getItem('current-semester') || "1年 前期";
const semesters = ["1年 前期", "1年 後期", "2年 前期", "2年 後期", "3年 前期", "3年 後期", "4年 前期", "4年 後期"];
let timetableData = JSON.parse(localStorage.getItem('timetable-data')) || {};

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
    
    // ページ切り替え時の自動更新
    if (pageId === 'home') {
        updateHomeTodayEvent();
        renderHomeLinks();
    }
    // ★ここを追加！ シフトページを開いたらリストを即座に作る
    if (pageId === 'shift') {
        initShift();
    }
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
        a.href = link.url;
        a.className = "quick-link-btn";
        a.target = "_blank";
        a.innerText = link.name;
        grid.appendChild(a);
    });

    const gateBtn = document.createElement('a');
    gateBtn.href = "javascript:void(0)";
    const isEven = currentList.length % 2 === 0;
    gateBtn.className = isEven ? "quick-link-btn span-2" : "quick-link-btn";
    gateBtn.innerText = isUraView ? "↩ リンクに戻る" : gateName;
    gateBtn.onclick = (e) => {
        e.preventDefault();
        isUraView = !isUraView;
        renderHomeLinks();
    };
    grid.appendChild(gateBtn);
}

// リンク編集画面の描画
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
                <div style="font-weight:bold; font-size:0.9rem; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.name}</div>
                <div style="font-size:0.7rem; color:#888; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${link.url}</div>
            </div>
            <button onclick="deleteLink(${i})" style="background:none; border:none; color:#ff2e63; font-size:1.8rem; padding:0 10px;">×</button>
        `;
        list.appendChild(item);
    });
}

// リンク操作（移動・編集・削除・保存）
function moveLink(index, direction) {
    const list = isUraEditorMode ? uraLinks : links;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    saveLinks();
    renderEditorList();
    renderHomeLinks();
}

function editLinkContent(index) {
    const list = isUraEditorMode ? uraLinks : links;
    const item = list[index];
    const newName = prompt("名前を変更:", item.name);
    if (newName === null) return;
    const newUrl = prompt("URLを変更:", item.url);
    if (newUrl === null) return;
    list[index] = { name: newName, url: newUrl };
    saveLinks();
    renderEditorList();
    renderHomeLinks();
}

function deleteLink(index) {
    if (!confirm("本当に削除しますか？")) return;
    const list = isUraEditorMode ? uraLinks : links;
    list.splice(index, 1);
    saveLinks();
    renderEditorList();
    renderHomeLinks();
}

function addLink() {
    const n = document.getElementById('new-link-name');
    const u = document.getElementById('new-link-url');
    if(!n.value || !u.value) return;
    const list = isUraEditorMode ? uraLinks : links;
    list.push({name: n.value, url: u.value});
    saveLinks(); renderEditorList(); n.value=""; u.value="";
}

function saveLinks() {
    localStorage.setItem('user-links', JSON.stringify(links));
    localStorage.setItem('ura-links', JSON.stringify(uraLinks));
}

function openLinkEditor() {
    isUraEditorMode = isUraView;
    document.getElementById('link-editor-modal').style.display = 'block';
    renderEditorList();
}
function closeLinkEditor() {
    document.getElementById('link-editor-modal').style.display = 'none';
    renderHomeLinks();
}
function toggleUraMode() { isUraEditorMode = !isUraEditorMode; renderEditorList(); }

/* ==========================================
   5. カレンダー・予定表機能
   ========================================== */
function createCalendar() {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const monthDisplay = document.getElementById('calendar-month');
    if(monthDisplay) monthDisplay.innerText = `${year}年 ${month + 1}月`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    if(!tbody) return;
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

function updateHomeTodayEvent() {
    const now = new Date();
    const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const event = localStorage.getItem(fullDate) || "本日の予定はありません";
    const elem = document.getElementById('today-event-text');
    if (elem) elem.innerText = event;
}

/* ==========================================
   6. ノート機能（メモ・付箋・ネタ帳）
   ========================================== */
// デイリーメモ
function saveDailyMemo() { localStorage.setItem('daily-memo', document.getElementById('daily-memo').value); }

// 付箋
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

// ネタ帳
function initIdeas() {
    const bar = document.getElementById('tab-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button');
        b.innerText = p.title;
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.style.color = "white"; b.style.borderRadius = "20px"; b.style.padding = "8px 16px";
        b.style.border = "none"; b.style.marginRight = "8px"; b.style.fontSize = "14px";
        b.style.whiteSpace = "nowrap"; b.style.cursor = "pointer";
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

/* ==========================================
   7. ToDo機能（完全版：編集・フィルタ・追加対応）
   ========================================== */
function initTodo() {
    const bar = document.getElementById('todo-category-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    
    // カテゴリータブの生成
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
        
        // カテゴリータップ時の動作
        nameBtn.onclick = (e) => { 
            e.preventDefault();
            if (currentTodoCategoryIndex === i) {
                // すでに選択されている場合は名前編集
                const newName = prompt("カテゴリー名を変更:", cat.category);
                if (newName && newName.trim() !== "") {
                    cat.category = newName;
                    saveTodo();
                    initTodo();
                }
            } else {
                // 選択されていない場合は切り替え
                currentTodoCategoryIndex = i; 
                initTodo(); 
            }
        };

        const delBtn = document.createElement('span');
        delBtn.innerText = " ×"; 
        delBtn.style.color = "rgba(255,255,255,0.6)";
        delBtn.style.marginLeft = "5px";
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
        // フィルターによる絞り込み
        if (currentTodoFilter === 'active' && item.done) return;
        if (currentTodoFilter === 'completed' && !item.done) return;

        const div = document.createElement('div');
        div.className = `todo-item`;
        
        // 「全部」タブの時だけ完了した項目に横線を引く
        if (currentTodoFilter === 'all' && item.done) {
            div.classList.add('completed');
        }

        div.innerHTML = `
            <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span class="todo-text" style="flex:1; margin-left:10px; font-size:0.9rem; cursor:pointer;">${item.text}</span>
            <button onclick="deleteTodo(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding:0 10px;">×</button>
        `;

        // 項目名の編集（文字部分をタップ）
        const textSpan = div.querySelector('.todo-text');
        textSpan.onclick = () => {
            const newText = prompt("項目名を変更:", item.text);
            if (newText && newText.trim() !== "") {
                item.text = newText;
                saveTodo();
                renderTodoList();
            }
        };

        container.appendChild(div);
    });
}

// 項目追加
function addTodoItem() {
    const input = document.getElementById('todo-input');
    if (!input || input.value.trim() === "") return;
    todoData[currentTodoCategoryIndex].items.push({text: input.value.trim(), done: false});
    input.value = ""; 
    saveTodo(); 
    renderTodoList(); 
    input.blur(); 
}

// 完了/未完了の切り替え
function toggleTodo(index) {
    todoData[currentTodoCategoryIndex].items[index].done = !todoData[currentTodoCategoryIndex].items[index].done;
    saveTodo();
    renderTodoList();
}

// 項目削除
function deleteTodo(index) {
    if(confirm("この項目を削除しますか？")) {
        todoData[currentTodoCategoryIndex].items.splice(index, 1);
        saveTodo();
        renderTodoList();
    }
}

// フィルター切り替え（全部・未達成・達成済）
function setTodoFilter(filter) {
    currentTodoFilter = filter;
    // ボタンの見た目を更新
    const fAll = document.getElementById('f-all');
    const fActive = document.getElementById('f-active');
    const fCompleted = document.getElementById('f-completed');
    
    if(fAll) fAll.classList.toggle('active', filter === 'all');
    if(fActive) fActive.classList.toggle('active', filter === 'active');
    if(fCompleted) fCompleted.classList.toggle('active', filter === 'completed');
    
    renderTodoList();
}

// 新しいカテゴリー作成
function createTodoCategory() {
    const n = prompt("新しいカテゴリー名", "");
    if(n && n.trim() !== "") {
        todoData.push({category: n.trim(), items: []});
        currentTodoCategoryIndex = todoData.length - 1;
        saveTodo();
        initTodo();
    }
}

// ストレージ保存
function saveTodo() { 
    localStorage.setItem('todo-data', JSON.stringify(todoData)); 
}

/* ==========================================
   8. 時間割機能
   ========================================== */
function initTimetable() {
    const tabContainer = document.getElementById('semester-tabs');
    const tbody = document.getElementById('timetable-body');
    if (!tabContainer || !tbody) return;

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

    tbody.innerHTML = "";
    const days = ["月", "火", "水", "木", "金"];
    for (let period = 1; period <= 5; period++) {
        const row = document.createElement('tr');
        const timeTd = document.createElement('td');
        timeTd.innerText = period;
        row.appendChild(timeTd);

        days.forEach(day => {
            const td = document.createElement('td');
            const key = `${day}-${period}`;
            const data = (timetableData[currentSemester] && timetableData[currentSemester][key]) 
                         ? timetableData[currentSemester][key] 
                         : {subject: "", place: ""};

            td.innerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <span class="tt-subject" style="white-space: normal; word-wrap: break-word; display: block; width: 100%;">${data.subject || ""}</span>
                    <span class="tt-place" style="white-space: normal; word-wrap: break-word; display: block; width: 100%; margin-top: 4px;">${data.place || ""}</span>
                </div>
            `;
            td.onclick = () => editTimetableSlot(currentSemester, key, data.subject, data.place);
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }
}

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


/* ==========================================
   9. シフト管理機能（修正・安定版）
   ========================================== */
let shiftData = JSON.parse(localStorage.getItem('shift-data')) || {};
let tempShiftData = {}; 
let editingDate = 1; 
let currentShiftDate = new Date(); 
let isWorkingTemp = false;

// 1. ドラムロールの選択肢（00-23, 00-59）を生成
function setupDrumRolls() {
    const hours = ["s-hour", "e-hour"];
    const mins = ["s-min", "e-min"];
    
    hours.forEach(id => {
        const sel = document.getElementById(id);
        if(!sel || sel.options.length > 0) return;
        for(let i=0; i<24; i++) {
            let val = i.toString().padStart(2, '0');
            sel.add(new Option(val, val));
        }
    });
    mins.forEach(id => {
        const sel = document.getElementById(id);
        if(!sel || sel.options.length > 0) return;
        for(let i=0; i<60; i++) {
            let val = i.toString().padStart(2, '0');
            sel.add(new Option(val, val));
        }
    });
}

// 2. 出勤・休みの切り替え
function setWorkStatus(status) {
    isWorkingTemp = status;
    const btnOn = document.getElementById('btn-work-on');
    const btnOff = document.getElementById('btn-work-off');
    const timeUI = document.getElementById('shift-time-ui');
    
    if(status) {
        btnOn.style.background = "var(--accent)"; // 出勤：アクセントカラー
        btnOff.style.background = "#444";
        timeUI.style.opacity = "1";
        timeUI.style.pointerEvents = "auto";
    } else {
        btnOn.style.background = "#444";
        btnOff.style.background = "#ff4444"; // 休み：赤
        timeUI.style.opacity = "0.2";
        timeUI.style.pointerEvents = "none";
    }
}

// 3. エディタを開く
function openShiftEditor(day) {
    setupDrumRolls(); // 選択肢を生成
    editingDate = day;
    const year = currentShiftDate.getFullYear();
    const month = currentShiftDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    
    // メモリに現在のデータをロード
    tempShiftData = JSON.parse(JSON.stringify(shiftData[monthKey] || {}));
    
    updateEditorUI();
    document.getElementById('shift-editor-modal').style.display = 'block';
}

// 4. エディタの表示更新
function updateEditorUI() {
    const year = currentShiftDate.getFullYear();
    const month = currentShiftDate.getMonth() + 1;
    const dateObj = new Date(year, month - 1, editingDate);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    
    document.getElementById('edit-date-display').innerText = `${month}月 ${editingDate}日 (${days[dateObj.getDay()]})`;
    
    const data = tempShiftData[editingDate] || { work: false, s: "09:00", e: "18:00" };
    
    // 状態反映
    setWorkStatus(data.work);
    
    // 時間反映（09:00 形式を分割してセット）
    const sParts = data.s.split(':');
    const eParts = data.e.split(':');
    
    document.getElementById('s-hour').value = sParts[0];
    document.getElementById('s-min').value = sParts[1];
    document.getElementById('e-hour').value = eParts[0];
    document.getElementById('e-min').value = eParts[1];
}

// 5. 保存ロジック
function saveToMemory() {
    const sh = document.getElementById('s-hour').value;
    const sm = document.getElementById('s-min').value;
    const eh = document.getElementById('e-hour').value;
    const em = document.getElementById('e-min').value;

    tempShiftData[editingDate] = {
        work: isWorkingTemp,
        s: `${sh}:${sm}`,
        e: `${eh}:${em}`
    };
}

function moveShiftDate(diff) {
    saveToMemory();
    const year = currentShiftDate.getFullYear();
    const month = currentShiftDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let nextDate = editingDate + diff;
    if (nextDate < 1 || nextDate > daysInMonth) return;

    commitTempToPermanent(); // 矢印移動で保存
    editingDate = nextDate;
    updateEditorUI();
}

function commitTempToPermanent() {
    const year = currentShiftDate.getFullYear();
    const month = currentShiftDate.getMonth() + 1;
    const monthKey = `${year}-${month}`;
    shiftData[monthKey] = JSON.parse(JSON.stringify(tempShiftData));
    localStorage.setItem('shift-data', JSON.stringify(shiftData));
}

function closeShiftEditor(isSave) {
    if (isSave) {
        saveToMemory();
        commitTempToPermanent();
    }
    document.getElementById('shift-editor-modal').style.display = 'none';
    initShift();
}



/* ==========================================
   10. 初期化処理（システムの起動）
   ========================================== */
window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    // 各コンポーネントの初期化
    createCalendar();
    initIdeas();
    initStickies();
    initTodo();
    updateHomeTodayEvent();
    initTimetable();
    initShift(); // ★ここを追加！ 起動時にデータを用意しておく
    renderHomeLinks();

    const memoElem = document.getElementById('daily-memo');
    if (memoElem) memoElem.value = localStorage.getItem('daily-memo') || "";

    showPage('home');
};
