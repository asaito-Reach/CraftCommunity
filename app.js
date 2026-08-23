const STORE = 'balance-board-tasks-v3';
const categories = [
  ['からだ', '#35a571'], ['食事', '#f28a3a'], ['暮らし', '#3da6d8'],
  ['ペット', '#8a62d5'], ['自分時間', '#e96fa5']
];
const defaults = [
  { id: 1, category: 'からだ', title: '朝のストレッチを10分する', status: '習慣', priority: '中', start: '2026-08-18', due: '2026-08-23', progress: 80, notes: '肩と股関節を中心に。' },
  { id: 2, category: '食事', title: '1週間分の献立を決めて買い出し', status: '未着手', priority: '高', start: '2026-08-23', due: '2026-08-24', progress: 0, notes: '野菜、卵、ヨーグルト、猫用おやつ' },
  { id: 3, category: '暮らし', title: 'クローゼット上段の収納を見直す', status: '進行中', priority: '中', start: '2026-08-22', due: '2026-08-29', progress: 40, notes: '季節外の服をケースへ移す。' },
  { id: 4, category: 'ペット', title: 'トイレ砂とフードの在庫チェック', status: '未着手', priority: '高', start: '2026-08-24', due: '2026-08-25', progress: 0, notes: '' },
  { id: 5, category: '自分時間', title: '読みかけの本を30ページ読む', status: '進行中', priority: '低', start: '2026-08-20', due: '2026-08-27', progress: 55, notes: '夜はスマホを置いて読む。' },
  { id: 6, category: '暮らし', title: 'キッチンの換気扇を掃除する', status: 'あとで', priority: '低', start: '2026-09-01', due: '2026-09-05', progress: 0, notes: '' },
  { id: 7, category: 'ペット', title: '爪切りとブラッシング', status: '完了', priority: '中', start: '2026-08-16', due: '2026-08-19', progress: 100, notes: '次回は2週間後を目安に。' }
];

let tasks = loadTasks();
let view = 'list';
let categoryFilter = 'all';
let statusFilter = 'all';
let sortMode = 'due';
let query = '';
let ganttMonth = new Date(2026, 7, 1);

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    return Array.isArray(saved) ? saved.map((task) => ({ ...task, start: task.start || task.due, notes: task.notes || '' })) : defaults;
  } catch { return defaults; }
}
function persist() { localStorage.setItem(STORE, JSON.stringify(tasks)); }
function colorOf(category) { return categories.find(([name]) => name === category)?.[1] || '#8996a8'; }
function statusClass(status) { return { '未着手': 'status-open', '進行中': 'status-doing', '習慣': 'status-habit', 'あとで': 'status-later', '完了': 'status-done' }[status] || 'status-open'; }
const optionMarkup = (values, selected) => values.map((value) => `<option${value === selected ? ' selected' : ''}>${value}</option>`).join('');

function filteredTasks() {
  let list = tasks.filter((task) => view === 'done' ? task.status === '完了' : true);
  if (categoryFilter !== 'all') list = list.filter((task) => task.category === categoryFilter);
  if (statusFilter !== 'all' && view !== 'done') list = list.filter((task) => task.status === statusFilter);
  if (query) list = list.filter((task) => `${task.title} ${task.category} ${task.notes}`.toLowerCase().includes(query));
  const priority = { 高: 0, 中: 1, 低: 2 };
  return list.sort((a, b) => sortMode === 'priority' ? priority[a.priority] - priority[b.priority] : sortMode === 'new' ? b.id - a.id : (a.due || '9999').localeCompare(b.due || '9999'));
}

function renderStats() {
  const today = dateKey(new Date());
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const done = tasks.filter((task) => task.status === '完了').length;
  const data = [
    ['今日が期限', tasks.filter((task) => task.due === today).length, '#ed665f'],
    ['進行中', tasks.filter((task) => task.status === '進行中').length, '#3567d6'],
    ['7日以内', tasks.filter((task) => task.status !== '完了' && task.due >= today && task.due <= dateKey(weekEnd)).length, '#35a571'],
    ['完了', done, '#8a62d5']
  ];
  $('stats').innerHTML = data.map(([label, value, color]) => `<div class="stat" style="border-color:${color}"><small>${label}</small><b>${value}</b></div>`).join('');
}

function listMarkup() {
  const data = filteredTasks();
  if (!data.length) return '<div class="empty-state"><strong>該当するタスクはありません</strong><p>絞り込みを解除するか、新しいタスクを追加してください。</p></div>';
  const rows = data.map((task) => `<tr class="${task.status === '完了' ? 'is-complete' : ''}">
    <td class="category"><i class="dot" style="background:${colorOf(task.category)}"></i>${esc(task.category)}</td>
    <td class="task-title"><button onclick="openEdit(${task.id})">${esc(task.title)}</button>${task.notes ? `<small class="note-preview">${esc(task.notes)}</small>` : ''}</td>
    <td><select class="inline-select status-select ${statusClass(task.status)}" aria-label="${esc(task.title)}の状態" onchange="quickUpdate(${task.id}, 'status', this.value)">${optionMarkup(['未着手', '進行中', '習慣', 'あとで', '完了'], task.status)}</select></td>
    <td><select class="inline-select priority-select ${task.priority === '高' ? 'priority-high' : ''}" aria-label="${esc(task.title)}の優先度" onchange="quickUpdate(${task.id}, 'priority', this.value)">${optionMarkup(['高', '中', '低'], task.priority)}</select></td><td>${esc(task.start)}</td><td>${esc(task.due)}</td>
    <td><div class="progress"><span class="progress-bar"><i style="width:${task.progress}%"></i></span>${task.progress}%</div></td>
    <td><div class="row-actions"><button class="small-button" onclick="openEdit(${task.id})">編集</button><button class="small-button" onclick="quickDone(${task.id})">${task.status === '完了' ? '未完了に戻す' : '完了'}</button></div></td></tr>`).join('');
  const cards = data.map((task) => `<article class="mobile-card ${task.status === '完了' ? 'is-complete' : ''}"><div class="mobile-card-head"><span class="category"><i class="dot" style="display:inline-block;background:${colorOf(task.category)};margin-right:6px"></i>${esc(task.category)}</span><select class="inline-select status-select ${statusClass(task.status)}" aria-label="${esc(task.title)}の状態" onchange="quickUpdate(${task.id}, 'status', this.value)">${optionMarkup(['未着手', '進行中', '習慣', 'あとで', '完了'], task.status)}</select></div><h3>${esc(task.title)}</h3>${task.notes ? `<p class="mobile-note">${esc(task.notes)}</p>` : ''}<div class="mobile-card-meta"><span>開始日　${esc(task.start)}</span><span>期限日　${esc(task.due)}</span><label>優先度　<select class="inline-select priority-select ${task.priority === '高' ? 'priority-high' : ''}" aria-label="${esc(task.title)}の優先度" onchange="quickUpdate(${task.id}, 'priority', this.value)">${optionMarkup(['高', '中', '低'], task.priority)}</select></label><span>進捗　${task.progress}%</span></div><div class="mobile-card-actions"><button class="small-button" onclick="openEdit(${task.id})">編集</button><button class="small-button" onclick="quickDone(${task.id})">${task.status === '完了' ? '未完了に戻す' : '完了にする'}</button></div></article>`).join('');
  return `<div class="table-wrap"><table class="task-table"><thead><tr>${['カテゴリ', 'やること・メモ', '状態', '優先度', '開始日', '期限日', '進捗', '操作'].map((label) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="mobile-list">${cards}</div></div>`;
}

function ganttMarkup() {
  const year = ganttMonth.getFullYear();
  const month = ganttMonth.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
  const visible = filteredTasks().filter((task) => task.start <= monthEnd && task.due >= monthStart);
  const weekday = ['日', '月', '火', '水', '木', '金', '土'];
  const dayHeaders = Array.from({ length: days }, (_, i) => { const date = new Date(year, month, i + 1); const weekend = date.getDay() === 0 || date.getDay() === 6; return `<div class="gantt-day ${weekend ? 'weekend' : ''}"><b>${i + 1}</b><small>${weekday[date.getDay()]}</small></div>`; }).join('');
  const rows = visible.map((task) => {
    const clippedStart = task.start < monthStart ? monthStart : task.start;
    const clippedDue = task.due > monthEnd ? monthEnd : task.due;
    const startDay = Number(clippedStart.slice(-2));
    const dueDay = Number(clippedDue.slice(-2));
    const span = Math.max(1, dueDay - startDay + 1);
    const cells = Array.from({ length: days }, (_, i) => { const date = new Date(year, month, i + 1); return `<div class="gantt-cell ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}"></div>`; }).join('');
    return `<div class="gantt-row" style="--days:${days}"><button class="gantt-task" onclick="openEdit(${task.id})"><i class="dot" style="background:${colorOf(task.category)}"></i><span><b>${esc(task.title)}</b><small>${esc(task.category)} ・ ${task.start} → ${task.due}</small></span><em class="badge ${statusClass(task.status)}">${task.status}</em></button>${cells}<button class="gantt-bar ${task.status === '完了' ? 'bar-done' : ''}" style="--start:${startDay + 1};--span:${span};--bar:${colorOf(task.category)}" onclick="openEdit(${task.id})" title="${esc(task.title)}"><span style="width:${task.progress}%"></span><b>${task.progress}%</b></button></div>`;
  }).join('');
  const body = visible.length ? rows : '<div class="empty-state"><strong>この月に該当するタスクはありません</strong></div>';
  return `<div class="gantt-toolbar"><button onclick="moveMonth(-1)" aria-label="前月">‹</button><b>${year}年${month + 1}月</b><button onclick="moveMonth(1)" aria-label="翌月">›</button></div><div class="gantt-scroll"><div class="gantt-board" style="--days:${days}"><div class="gantt-header"><div class="gantt-task-head">タスク / 期間</div>${dayHeaders}</div>${body}</div></div>`;
}

function render() {
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  document.querySelectorAll('.category-button').forEach((button) => button.classList.toggle('active', button.dataset.category === categoryFilter));
  $('viewTitle').textContent = view === 'list' ? '暮らしのやること' : view === 'calendar' ? '暮らしのガントチャート' : 'できたこと';
  $('statusFilter').disabled = view === 'done';
  $('clearFilter').classList.toggle('hidden', categoryFilter === 'all' && statusFilter === 'all' && !query);
  renderStats();
  $('panel').innerHTML = view === 'calendar' ? ganttMarkup() : listMarkup();
}

function openModal(task) {
  $('taskForm').reset(); $('taskId').value = task?.id || ''; $('taskTitle').value = task?.title || '';
  $('taskCategory').value = task?.category || '暮らし'; $('taskStatus').value = task?.status || '未着手'; $('taskPriority').value = task?.priority || '中';
  $('taskStart').value = task?.start || dateKey(new Date()); $('taskDue').value = task?.due || dateKey(new Date());
  $('taskProgress').value = task?.progress || 0; $('taskNotes').value = task?.notes || '';
  $('modalMode').textContent = task ? 'EDIT TASK' : 'NEW TASK'; $('modalTitle').textContent = task ? 'やることを編集' : 'やることを追加';
  $('deleteButton').classList.toggle('hidden', !task); $('taskModal').classList.remove('hidden'); setTimeout(() => $('taskTitle').focus(), 0);
}
function closeModal() { $('taskModal').classList.add('hidden'); }
function toast(message) { $('toast').textContent = message; $('toast').classList.remove('hidden'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 2200); }

window.openEdit = (id) => openModal(tasks.find((task) => task.id === id));
window.quickUpdate = (id, field, value) => {
  tasks = tasks.map((task) => {
    if (task.id !== id) return task;
    if (field === 'status') return { ...task, status: value, progress: value === '完了' ? 100 : (task.status === '完了' ? Math.min(task.progress, 95) : task.progress) };
    return { ...task, priority: value };
  });
  persist(); render(); toast(`${field === 'status' ? '状態' : '優先度'}を更新しました`);
};
window.quickDone = (id) => { tasks = tasks.map((task) => task.id === id ? { ...task, status: task.status === '完了' ? '未着手' : '完了', progress: task.status === '完了' ? Math.min(task.progress, 95) : 100 } : task); persist(); render(); toast('状態を更新しました。完了タスクも一覧に残ります。'); };
window.moveMonth = (amount) => { ganttMonth = new Date(ganttMonth.getFullYear(), ganttMonth.getMonth() + amount, 1); render(); };

$('categoryNav').innerHTML = `<button class="category-button active" data-category="all"><i class="dot" style="background:#8996a8"></i>すべて</button>` + categories.map(([name, color]) => `<button class="category-button" data-category="${name}"><i class="dot" style="background:${color}"></i>${name}</button>`).join('');
$('taskCategory').innerHTML = categories.map(([name]) => `<option>${name}</option>`).join('');
document.querySelectorAll('.nav-button').forEach((button) => button.onclick = () => { view = button.dataset.view; render(); });
$('categoryNav').onclick = (event) => { const button = event.target.closest('.category-button'); if (!button) return; categoryFilter = button.dataset.category; render(); };
$('search').oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
$('statusFilter').onchange = (event) => { statusFilter = event.target.value; render(); };
$('sort').onchange = (event) => { sortMode = event.target.value; render(); };
$('clearFilter').onclick = () => { categoryFilter = 'all'; statusFilter = 'all'; query = ''; $('search').value = ''; $('statusFilter').value = 'all'; render(); };
[$('addButton'), $('mobileAdd')].forEach((button) => button.onclick = () => openModal());
document.querySelectorAll('[data-close]').forEach((button) => button.onclick = closeModal);
$('taskModal').onclick = (event) => { if (event.target === $('taskModal')) closeModal(); };
$('taskForm').onsubmit = (event) => {
  event.preventDefault();
  const id = Number($('taskId').value); const start = $('taskStart').value; const due = $('taskDue').value;
  if (due < start) { toast('期限日は開始日以降にしてください'); return; }
  const data = { id: id || Date.now(), title: $('taskTitle').value.trim(), category: $('taskCategory').value, status: $('taskStatus').value, priority: $('taskPriority').value, start, due, progress: Math.max(0, Math.min(100, Number($('taskProgress').value) || 0)), notes: $('taskNotes').value.trim() };
  if (data.status === '完了') data.progress = 100;
  tasks = id ? tasks.map((task) => task.id === id ? data : task) : [data, ...tasks]; persist(); closeModal(); render(); toast(id ? '内容を更新しました' : '一覧とガントチャートに追加しました');
};
$('deleteButton').onclick = () => { const id = Number($('taskId').value); if (!id || !confirm('このタスクを削除しますか？')) return; tasks = tasks.filter((task) => task.id !== id); persist(); closeModal(); render(); toast('タスクを削除しました'); };
function updateClock() {
  const now = new Date();
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  $('todayLabel').textContent = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}(${weekday})${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
updateClock();
setInterval(updateClock, 1000);
render();
