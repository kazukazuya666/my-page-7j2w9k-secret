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
                
                // --- クラス判定の修正 ---
                // 1. 今日かどうか (赤っぽくなる枠線や背景)
                if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                }
                
                // 2. 予定があるかどうか (ドットや色)
                if (localStorage.getItem(fullDate)) {
                    cell.classList.add('has-event');
                }
                
                // 3. 選択中かどうか
                if (selectedFullDate === fullDate) {
                    cell.classList.add('selected');
                }

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
    
    // エラー防止：もしタブを表示する場所（tab-bar）がなければ、何もしないで終了
    if (!bar) return; 

    bar.innerHTML = "";
    ideaPages.forEach((p, i) => {
        const b = document.createElement('button');
        b.innerText = p.title;
        
        // デザイン設定
        b.style.backgroundColor = (i === currentPageIndex) ? "var(--accent)" : "#444";
        b.style.color = "white";
        b.style.borderRadius = "20px";
        b.style.padding = "8px 16px";
        b.style.border = "none";
        b.style.marginRight = "8px";
        b.style.fontSize = "14px";
        b.style.whiteSpace = "nowrap"; 
        b.style.cursor = "pointer";

        // クリックで切り替え
        b.onclick = () => { 
            currentPageIndex = i; 
            initIdeas(); 
        };

        // ダブルクリックで名前変更
        b.ondblclick = () => {
            const n = prompt("名前変更", p.title);
            if(n) { 
                p.title = n; 
                saveIdeas(); 
                initIdeas(); 
            }
        };
        
        bar.appendChild(b);
    });

    // ページの内容（テキストエリア）を表示
    const noteArea = document.getElementById('idea-note');
    if (noteArea) {
        noteArea.value = ideaPages[currentPageIndex].content;
    }
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




function saveEvent() {
    if (!selectedFullDate) return;
    const val = document.getElementById('event-input').value;
    if (val) {
        localStorage.setItem(selectedFullDate, val);
    } else {
        localStorage.removeItem(selectedFullDate);
    }
    
    createCalendar(); // カレンダーのドットを更新
    updateHomeTodayEvent(); // ★これでホーム画面の「今日の予定」が即座に変わります！
}

// --- ToDo機能の追加 ---
let todoData = JSON.parse(localStorage.getItem('todo-data')) || [{category: "映画", items: []}];
let currentTodoCategoryIndex = 0;
let currentTodoFilter = 'all';

function initTodo() {
    const bar = document.getElementById('todo-category-bar');
    // ↓ これを追加！
    if (!bar) return; 

    bar.innerHTML = "";
    // ...あとの処理はそのまま


    todoData.forEach((cat, i) => {
        const group = document.createElement('div');
        group.style.display = "inline-flex";
        group.style.alignItems = "center";
        group.style.background = (i === currentTodoCategoryIndex) ? "var(--accent)" : "#444";
        group.style.borderRadius = "20px";
        group.style.marginRight = "8px";
        group.style.padding = "2px 10px";

        // カテゴリー名（タップで切り替え）
        const nameBtn = document.createElement('span');
        nameBtn.innerText = cat.category;
        nameBtn.style.color = "white";
        nameBtn.style.fontSize = "0.8rem";
        nameBtn.style.padding = "5px 0";
        nameBtn.style.cursor = "pointer";
        nameBtn.onclick = () => { 
            currentTodoCategoryIndex = i; 
            initTodo(); 
        };

        // カテゴリー削除ボタン（小さな「×」）
        const delBtn = document.createElement('span');
        delBtn.innerText = "×";
        delBtn.style.marginLeft = "8px";
        delBtn.style.color = "rgba(255,255,255,0.6)";
        delBtn.style.fontSize = "1.2rem";
        delBtn.style.cursor = "pointer";
        delBtn.onclick = (e) => {
            e.stopPropagation(); // 切り替えイベントを邪魔しない
            if (todoData.length <= 1) {
                alert("最後の1つは削除できません");
                return;
            }
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
            <button onclick="deleteTodo(${index})" style="background:none; border:none; color:#ff2e63; font-size:1.5rem; padding:0 10px;">
                ×
            </button>
        `;
        container.appendChild(div);
    });
}




function addTodoItem() {
    const input = document.getElementById('todo-input');
    
    // スマホでの空振り防止
    if (!input) {
        console.error("todo-inputが見つかりません");
        return;
    }
    
    const text = input.value.trim();
    if (!text) return;

    todoData[currentTodoCategoryIndex].items.push({text: text, done: false});
    input.value = "";
    saveTodo();
    renderTodoList();
    
    // キーボードを閉じる（スマホ用）
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

// 最初に動かす
initTodo();


// --- 初期化の修正 ---
setInterval(updateClock, 1000);
updateClock();
createCalendar();
initIdeas();
initStickies();
initTodo();
updateHomeTodayEvent();

// メモの読み込み先IDが合っているか確認
const dailyMemoElem = document.getElementById('daily-memo');
if (dailyMemoElem) {
    dailyMemoElem.value = localStorage.getItem('daily-memo') || "";
}

showPage('home');
