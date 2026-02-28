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
        alert("拒否されました。");
        document.body.innerHTML = "<h1>Access Denied</h1>";
    }
})();

/* ==========================================
   2. グローバル変数・データ管理
   ========================================== */
let links = JSON.parse(localStorage.getItem('user-links')) || [{name: "Google", url: "https://google.com"}];
let uraLinks = JSON.parse(localStorage.getItem('ura-links')) || [];
let gateName = localStorage.getItem('gate-name') || "リンク設定";
let isUraView = false;
let isUraEditorMode = false;

let displayDate = new Date();
let selectedFullDate = "";

let ideaPages = JSON.parse(localStorage.getItem('idea-pages')) || [{title: "ページ1", content: ""}];
let currentPageIndex = 0;
let stickies = JSON.parse(localStorage.getItem('sticky-notes')) || [];
let todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "一般", items: []}];
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';

/* ==========================================
   3. 共通システム（時計・ページ切り替え）
   ========================================== */
function updateClock() {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    document.getElementById('date').innerText = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')} (${days[now.getDay()]})`;
    document.getElementById('clock').innerText = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}

function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'home') { updateHomeTodayEvent(); renderHomeLinks(); initTodo(); }
    if (pageId === 'notes-all') { initIdeas(); initStickies(); }
    if (pageId === 'calendar') createCalendar();
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
    document.getElementById('calendar-month').innerText = `${year}年 ${month + 1}月`;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const tbody = document.getElementById('calendar-body');
    tbody.innerHTML = "";
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    if (!selectedFullDate) selectedFullDate = todayStr;

    let date = 1;
    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay || date > lastDate) { cell.innerText = ""; }
            else {
                let fullDate = `${year}-${month + 1}-${date}`;
                cell.innerText = date;
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
    document.getElementById('selected-date-label').innerText = selectedFullDate + " の予定";
    document.getElementById('event-input').value = localStorage.getItem(selectedFullDate) || "";
}

function saveEvent() {
    const val = document.getElementById('event-input').value;
    if (val.trim()) localStorage.setItem(selectedFullDate, val);
    else localStorage.removeItem(selectedFullDate);
    createCalendar(); updateHomeTodayEvent();
}

function changeMonth(diff) { displayDate.setMonth(displayDate.getMonth() + diff); createCalendar(); }

function updateHomeTodayEvent() {
    const now = new Date();
    const fullDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    document.getElementById('today-event-text').innerText = localStorage.getItem(fullDate) || "本日の予定はありません";
}

/* ==========================================
   6. ToDo機能（完全版：編集・フィルタ・追加対応）
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
   7. ノート機能（メモ・付箋・ネタ帳）
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

// ネタ帳（×ボタン追加版）
function initIdeas() {
    const bar = document.getElementById('tab-bar');
    if (!bar) return; 
    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        // ボタンの代わりにdivでグループ化（ToDoと同じ構造）
        const group = document.createElement('div');
        group.style = `display:inline-flex; align-items:center; background:${i === currentPageIndex ? 'var(--accent)' : '#444'}; color:white; border-radius:20px; padding:8px 16px; margin-right:8px; cursor:pointer; font-size:14px; white-space:nowrap;`;
        
        // 名前部分
        const nameSpan = document.createElement('span');
        nameSpan.innerText = p.title;
        nameSpan.onclick = () => { currentPageIndex = i; initIdeas(); };
        nameSpan.ondblclick = () => {
            const n = prompt("名前変更", p.title);
            if(n) { p.title = n; saveIdeas(); initIdeas(); }
        };

        // 削除用のバツ印
        const delBtn = document.createElement('span');
        delBtn.innerText = " ×";
        delBtn.style = "margin-left:8px; opacity:0.6; font-weight:bold;";
        delBtn.onclick = (e) => {
            e.stopPropagation(); // 重なり防止
            if (ideaPages.length > 1) {
                if(confirm(`「${p.title}」を削除しますか？`)) {
                    ideaPages.splice(i, 1);
                    currentPageIndex = 0;
                    saveIdeas();
                    initIdeas();
                }
            } else {
                alert("これ以上削除できません");
            }
        };

        group.appendChild(nameSpan);
        group.appendChild(delBtn);
        bar.appendChild(group);
    });
    const noteArea = document.getElementById('idea-note');
    if (noteArea && ideaPages[currentPageIndex]) {
        noteArea.value = ideaPages[currentPageIndex].content;
    }
}
function createNewPage() {
    const n = prompt("ページ名", "新ページ");
    if(n) { ideaPages.push({title: n, content: ""}); currentPageIndex = ideaPages.length - 1; saveIdeas(); initIdeas(); }
}
function saveCurrentIdea() {
    if (ideaPages[currentPageIndex]) {
        ideaPages[currentPageIndex].content = document.getElementById('idea-note').value;
        saveIdeas();
    }
}
function saveIdeas() { localStorage.setItem('idea-pages', JSON.stringify(ideaPages)); }



/* ==========================================
   8. シフト管理システム
   ========================================== */
let shiftData = JSON.parse(localStorage.getItem('shift-data')) || {}; // { "2026-2-1": {type:'work', start:'09:00', end:'18:00'} }
let tempShiftBuffer = {}; // 編集中の一次保存用
let editorCurrentDate = null; // 現在編集中のDateオブジェクト
let shiftDisplayDate = new Date(); // 表示中の年月

// シフト画面の表示
function renderShiftList() {
    const container = document.getElementById('shift-list-container');
    const monthDisp = document.getElementById('shift-month-display');
    if (!container) return;

    const year = shiftDisplayDate.getFullYear();
    const month = shiftDisplayDate.getMonth();
    monthDisp.innerText = `${year}年 ${month + 1}月`;

    container.innerHTML = "";
    const lastDate = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= lastDate; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = `${year}-${month + 1}-${d}`;
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        const dayClass = dateObj.getDay() === 0 ? 'sun' : (dateObj.getDay() === 6 ? 'sat' : '');
        
        const data = shiftData[dateStr] || { type: 'none' };
        
        const row = document.createElement('div');
        row.className = 'shift-row';
        row.innerHTML = `
            <div class="shift-date-info ${dayClass}">${d} (${dayNames[dateObj.getDay()]})</div>
            <div class="shift-time-info ${data.type === 'off' ? 'off' : ''}">
                ${data.type === 'work' ? `${data.start} - ${data.end}` : (data.type === 'off' ? '休み' : '-')}
            </div>
            <button class="edit-icon-btn" onclick="openShiftEditor(${d})">編集</button>
        `;
        container.appendChild(row);
    }
}

// 編集モーダルを開く
function openShiftEditor(day) {
    const year = shiftDisplayDate.getFullYear();
    const month = shiftDisplayDate.getMonth();
    editorCurrentDate = new Date(year, month, day);
    tempShiftBuffer = {}; // バッファをリセット
    
    updateEditorUI();
    document.getElementById('shift-editor-modal').style.display = 'flex';
}

// エディタ内のUI更新（日付切り替え時など）
function updateEditorUI() {
    const y = editorCurrentDate.getFullYear();
    const m = editorCurrentDate.getMonth() + 1;
    const d = editorCurrentDate.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dateStr = `${y}-${m}-${d}`;

    document.getElementById('editor-date-display').innerText = `${m}月 ${d}日 (${dayNames[editorCurrentDate.getDay()]})`;

    // 保存済みデータまたはバッファ、なければデフォルトを読み込み
    const data = tempShiftBuffer[dateStr] || shiftData[dateStr] || { type: 'work', start: '09:00', end: '18:00' };
    
    setShiftType(data.type || 'work');
    document.getElementById('shift-start').value = data.start || '09:00';
    document.getElementById('shift-end').value = data.end || '18:00';
}

// 出勤・休みの切り替え
function setShiftType(type) {
    const isWork = type === 'work';
    document.getElementById('btn-work').classList.toggle('active', isWork);
    document.getElementById('btn-off').classList.toggle('active', !isWork);
    document.getElementById('time-input-area').style.opacity = isWork ? "1" : "0.3";
    document.getElementById('time-input-area').style.pointerEvents = isWork ? "auto" : "none";
}

// エディタ内で日付移動（自動保存ロジック）
function moveEditorDate(diff) {
    // 現在の入力をバッファに保存
    saveToBuffer();

    const nextDate = new Date(editorCurrentDate);
    nextDate.setDate(editorCurrentDate.getDate() + diff);

    // 月を跨がないチェック
    if (nextDate.getMonth() === shiftDisplayDate.getMonth()) {
        editorCurrentDate = nextDate;
        updateEditorUI();
    }
}

// 入力内容を一時的な箱（バッファ）に保存
function saveToBuffer() {
    const y = editorCurrentDate.getFullYear();
    const m = editorCurrentDate.getMonth() + 1;
    const d = editorCurrentDate.getDate();
    const dateStr = `${y}-${m}-${d}`;

    tempShiftBuffer[dateStr] = {
        type: document.getElementById('btn-work').classList.contains('active') ? 'work' : 'off',
        start: document.getElementById('shift-start').value,
        end: document.getElementById('shift-end').value
    };
}

// 完了・キャンセル
function closeShiftEditor(isSave) {
    if (isSave) {
        saveToBuffer(); // 最後の日付分を保存
        // バッファの内容を本番データに統合
        Object.assign(shiftData, tempShiftBuffer);
        localStorage.setItem('shift-data', JSON.stringify(shiftData));
    }
    // isSaveがfalse（キャンセル）の場合はtempShiftBufferを捨てるだけなので何もしない
    
    document.getElementById('shift-editor-modal').style.display = 'none';
    renderShiftList();
}

// 月切り替え
function changeShiftMonth(diff) {
    shiftDisplayDate.setMonth(shiftDisplayDate.getMonth() + diff);
    renderShiftList();
}

// 既存のshowPage関数に追記
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'home') { updateHomeTodayEvent(); renderHomeLinks(); initTodo(); }
    if (pageId === 'notes-all') { initIdeas(); initStickies(); }
    if (pageId === 'calendar') createCalendar();
    if (pageId === 'shift-mgr') renderShiftList(); // 追加
    window.scrollTo(0, 0);
}


   
/* ==========================================
   起動処理
   ========================================== */
window.onload = () => {
    updateClock(); setInterval(updateClock, 1000);
    document.getElementById('daily-memo').value = localStorage.getItem('daily-memo') || "";
    showPage('home');
};
