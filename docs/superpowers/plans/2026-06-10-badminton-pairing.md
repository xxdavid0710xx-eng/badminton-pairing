# 羽球雙打臨打配對系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打造一個純前端羽球雙打臨打配對管理系統，支援球員登記、公平輪打、自動配對、勝負紀錄，管理員單機操作，資料存在 LocalStorage。

**Architecture:** 純 HTML + CSS + Vanilla JS，無框架無建置步驟，直接開啟 `index.html` 即可使用。JS 拆成多個 ES Module 各司其職，UI 層全部集中在 `ui.js` 做 DOM 操作，邏輯層（queue、matching）為純函式，方便測試。

**Tech Stack:** HTML5, CSS3 (custom properties + grid/flexbox), Vanilla JS ES Modules, localStorage API

---

## 檔案結構

```
C:\羽球\
├── index.html          # 所有 HTML 結構（單頁應用）
├── css/
│   └── style.css       # 深色主題、RWD、所有元件樣式
├── js/
│   ├── storage.js      # localStorage 讀寫封裝
│   ├── data.js         # 資料初始化、型別定義（JSDoc）
│   ├── players.js      # 球員 CRUD + 出席管理 + 下課
│   ├── queue.js        # 公平輪打排隊邏輯（純函式）
│   ├── matching.js     # 自動配對演算法 + 勝率修正（純函式）
│   ├── game.js         # 場地狀態、開始/結束場次
│   └── ui.js           # 所有 DOM 渲染 + 事件綁定
└── tests/
    └── test-runner.html  # 瀏覽器跑 queue / matching 單元測試
```

---

## Task 1: 專案骨架

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/storage.js`
- Create: `js/data.js`

- [ ] **Step 1: 建立 index.html 骨架**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>羽球臨打配對</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- TOP NAV -->
  <header class="topbar">
    <div class="topbar__logo">🏸 臨打配對</div>
    <div class="topbar__stats">
      <span class="stat-pill">出席 <strong id="stat-present">0</strong> 人</span>
      <span class="stat-pill">場地
        <button class="court-dec" id="court-dec">−</button>
        <strong id="stat-courts">2</strong>
        <button class="court-inc" id="court-inc">+</button>
        片
      </span>
      <span class="stat-pill">等待 <strong id="stat-waiting">0</strong> 人</span>
    </div>
    <div class="topbar__actions">
      <button class="btn btn--secondary" id="btn-manage">球員管理</button>
      <button class="btn btn--primary" id="btn-match">▶ 自動配對</button>
    </div>
  </header>

  <!-- MAIN DASHBOARD -->
  <main class="dashboard">
    <!-- 場地區 -->
    <section class="section">
      <h2 class="section__title">場地狀況</h2>
      <div class="courts-grid" id="courts-grid">
        <!-- 場地卡片由 ui.js 動態產生 -->
      </div>
    </section>

    <!-- 等待區 -->
    <section class="section">
      <h2 class="section__title">等待區</h2>
      <div class="waiting-list" id="waiting-list">
        <!-- 等待球員由 ui.js 動態產生 -->
      </div>
    </section>
  </main>

  <!-- 球員管理 Modal -->
  <div class="modal-overlay hidden" id="modal-overlay">
    <div class="modal" id="modal-players">
      <div class="modal__header">
        <h3>球員管理</h3>
        <button class="modal__close" id="modal-close">✕</button>
      </div>
      <div class="modal__body">
        <!-- 新增表單 -->
        <form class="add-player-form" id="add-player-form">
          <input type="text" class="input" id="input-name" placeholder="球員姓名" required>
          <input type="number" class="input input--sm" id="input-level" placeholder="等級 1-20" min="1" max="20" required>
          <button type="submit" class="btn btn--primary">新增</button>
        </form>
        <!-- 球員列表 -->
        <div class="player-list" id="player-list">
          <!-- 動態產生 -->
        </div>
      </div>
    </div>
  </div>

  <!-- 完場 Modal -->
  <div class="modal-overlay hidden" id="result-overlay">
    <div class="modal modal--sm" id="modal-result">
      <div class="modal__header">
        <h3>記錄結果</h3>
      </div>
      <div class="modal__body">
        <p class="result-prompt" id="result-prompt">哪隊獲勝？</p>
        <div class="result-buttons">
          <button class="btn btn--team-blue" id="result-team1">藍隊獲勝</button>
          <button class="btn btn--team-green" id="result-team2">綠隊獲勝</button>
          <button class="btn btn--secondary" id="result-draw">平手</button>
        </div>
      </div>
    </div>
  </div>

  <script type="module" src="js/ui.js"></script>
</body>
</html>
```

- [ ] **Step 2: 建立 storage.js**

```js
// js/storage.js
const KEYS = {
  PLAYERS: 'bm_players',
  GAMES:   'bm_games',
  STATE:   'bm_state',
};

export function loadPlayers() {
  return JSON.parse(localStorage.getItem(KEYS.PLAYERS) || '[]');
}
export function savePlayers(players) {
  localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
}

export function loadGames() {
  return JSON.parse(localStorage.getItem(KEYS.GAMES) || '[]');
}
export function saveGames(games) {
  localStorage.setItem(KEYS.GAMES, JSON.stringify(games));
}

export function loadState() {
  const defaults = { courtCount: 2, courts: {} };
  return { ...defaults, ...JSON.parse(localStorage.getItem(KEYS.STATE) || '{}') };
}
export function saveState(state) {
  localStorage.setItem(KEYS.STATE, JSON.stringify(state));
}
```

- [ ] **Step 3: 建立 data.js（型別工廠函式）**

```js
// js/data.js
export function createPlayer(name, skillLevel) {
  return {
    id: crypto.randomUUID(),
    name,
    skillLevel: Number(skillLevel),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    isPresent: false,
    lastGameEndTime: null,  // 用於公平排隊次排序
  };
}

export function createGame(courtId, team1, team2) {
  return {
    id: crypto.randomUUID(),
    courtId,
    team1,  // [playerId, playerId]
    team2,  // [playerId, playerId]
    startTime: new Date().toISOString(),
    endTime: null,
    result: null,  // null | 'team1' | 'team2' | 'draw'
  };
}
```

- [ ] **Step 4: 建立空的 css/style.css（後續 Task 2 填入）**

```css
/* css/style.css — 見 Task 2 */
```

- [ ] **Step 5: 確認 index.html 能在瀏覽器開啟無 JS 錯誤**

用瀏覽器直接開啟 `index.html`，開 DevTools Console，確認無紅色錯誤（此時畫面是空白骨架，正常）。

- [ ] **Step 6: Commit**

```bash
git init
git add index.html css/style.css js/storage.js js/data.js
git commit -m "feat: project scaffold with HTML structure and storage layer"
```

---

## Task 2: 深色主題 CSS 樣式系統

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: 寫入完整 CSS**

```css
/* css/style.css */
:root {
  --bg-base:    #0f172a;
  --bg-card:    #1e293b;
  --bg-deep:    #111827;
  --border:     #334155;
  --border-light: #475569;
  --text-primary:   #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted:     #64748b;
  --accent:     #38bdf8;
  --team-blue:  #3b82f6;
  --team-blue-bg: #1e3a5f;
  --team-green: #10b981;
  --team-green-bg: #064e3b;
  --warning:    #f59e0b;
  --warning-bg: #1c1a0f;
  --danger:     #ef4444;
  --radius-sm:  6px;
  --radius-md:  10px;
  --radius-lg:  14px;
  --shadow:     0 4px 24px rgba(0,0,0,0.4);
  --transition: 0.18s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  font-size: 15px;
  line-height: 1.5;
  min-height: 100vh;
}

/* ── TOPBAR ─────────────────────────────────── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.topbar__logo {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.5px;
  flex: 1;
  min-width: 120px;
}
.topbar__stats {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.topbar__actions {
  display: flex;
  gap: 8px;
}
.stat-pill {
  background: var(--bg-deep);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 13px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}
.stat-pill strong { color: var(--text-primary); }
.court-dec, .court-inc {
  background: var(--border);
  border: none;
  color: var(--text-primary);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
}
.court-dec:hover, .court-inc:hover { background: var(--border-light); }

/* ── BUTTONS ─────────────────────────────────── */
.btn {
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition), transform var(--transition);
  white-space: nowrap;
}
.btn:active { transform: scale(0.97); }
.btn--primary  { background: var(--accent); color: #0f172a; }
.btn--secondary { background: var(--border); color: var(--text-primary); }
.btn--danger   { background: #7f1d1d; color: #fca5a5; }
.btn--team-blue  { background: var(--team-blue-bg); color: #93c5fd; border: 1px solid var(--team-blue); flex: 1; padding: 10px; }
.btn--team-green { background: var(--team-green-bg); color: #6ee7b7; border: 1px solid var(--team-green); flex: 1; padding: 10px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── DASHBOARD ───────────────────────────────── */
.dashboard { padding: 16px; display: flex; flex-direction: column; gap: 20px; max-width: 1400px; margin: 0 auto; }
.section__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* ── COURT CARDS ─────────────────────────────── */
.courts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.court-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.court-card--active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent)22, var(--shadow);
}
.court-card--empty {
  border-style: dashed;
  opacity: 0.6;
}
.court-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.court-card__label { font-size: 14px; font-weight: 700; color: var(--text-secondary); }
.court-card__timer { font-size: 12px; color: var(--text-muted); background: var(--bg-deep); border-radius: 4px; padding: 2px 8px; font-variant-numeric: tabular-nums; }
.court-card__empty { color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px 0; }

.teams { display: flex; flex-direction: column; gap: 6px; }
.team {
  background: var(--bg-deep);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.team--blue  { border-left: 3px solid var(--team-blue); }
.team--green { border-left: 3px solid var(--team-green); }
.vs-divider  { text-align: center; font-size: 11px; color: var(--text-muted); font-weight: 800; letter-spacing: 0.1em; }

.player-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-card);
  border-radius: 20px;
  padding: 3px 8px 3px 6px;
  font-size: 13px;
}
.player-chip__name { color: var(--text-primary); }
.player-chip__lvl {
  font-size: 11px;
  font-weight: 700;
  border-radius: 10px;
  padding: 1px 6px;
  background: var(--border);
  color: var(--text-secondary);
}
.player-chip__lvl--high { background: #1d4ed8; color: #93c5fd; }
.player-chip__lvl--mid  { background: #065f46; color: #6ee7b7; }
.player-chip__lvl--low  { background: #374151; color: #9ca3af; }

.balance-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.balance-bar { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.balance-fill { height: 100%; background: linear-gradient(90deg, var(--team-blue), var(--team-green)); border-radius: 2px; transition: width 0.4s ease; }
.balance-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

.btn-done {
  margin-top: 10px;
  width: 100%;
  background: var(--team-green-bg);
  color: #34d399;
  border: 1px solid var(--team-green);
  border-radius: var(--radius-sm);
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
}
.btn-done:hover { background: #065f46cc; }

/* ── WAITING LIST ────────────────────────────── */
.waiting-list { display: flex; gap: 8px; flex-wrap: wrap; }
.waiting-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 78px;
  transition: border-color var(--transition);
}
.waiting-card--next {
  border-color: var(--warning);
  background: var(--warning-bg);
}
.waiting-card__badge {
  font-size: 9px;
  background: var(--warning);
  color: #000;
  font-weight: 800;
  border-radius: 3px;
  padding: 1px 5px;
  margin-bottom: 2px;
  letter-spacing: 0.03em;
}
.waiting-card__name  { font-size: 14px; font-weight: 700; }
.waiting-card__level { font-size: 12px; color: var(--text-secondary); }
.waiting-card__games { font-size: 11px; color: var(--text-muted); }

/* ── MODAL ───────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 16px;
}
.modal-overlay.hidden { display: none; }
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
  animation: slide-up 0.2s ease;
}
.modal--sm { max-width: 360px; }
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal__header h3 { font-size: 16px; font-weight: 700; }
.modal__close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition);
}
.modal__close:hover { background: var(--border); }
.modal__body { padding: 16px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }

/* ── ADD PLAYER FORM ─────────────────────────── */
.add-player-form {
  display: flex;
  gap: 8px;
  align-items: center;
  background: var(--bg-deep);
  border-radius: var(--radius-sm);
  padding: 10px;
}
.input {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 14px;
  flex: 1;
  outline: none;
  transition: border-color var(--transition);
}
.input:focus { border-color: var(--accent); }
.input--sm { max-width: 90px; flex: none; }

/* ── PLAYER LIST (in modal) ──────────────────── */
.player-list { display: flex; flex-direction: column; gap: 6px; }
.player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-deep);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  transition: border-color var(--transition);
}
.player-row--present { border-left: 3px solid var(--accent); }
.player-row__check { cursor: pointer; accent-color: var(--accent); width: 16px; height: 16px; }
.player-row__name  { flex: 1; font-weight: 600; }
.player-row__level {
  font-size: 12px;
  font-weight: 700;
  background: var(--border);
  color: var(--text-secondary);
  border-radius: 10px;
  padding: 2px 8px;
}
.player-row__stats { font-size: 11px; color: var(--text-muted); min-width: 60px; text-align: right; }
.btn-leave {
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition);
}
.btn-leave:hover { background: #2d220066; }
.btn-edit, .btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}
.btn-edit:hover   { background: var(--border); }
.btn-delete:hover { background: #7f1d1d44; }

/* ── RESULT MODAL ────────────────────────────── */
.result-prompt { font-size: 15px; color: var(--text-secondary); text-align: center; }
.result-buttons { display: flex; gap: 8px; margin-top: 6px; }

/* ── EMPTY STATE ─────────────────────────────── */
.empty-state {
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
  padding: 32px;
  width: 100%;
}

/* ── TOAST NOTIFICATION ──────────────────────── */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow);
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0;
  z-index: 999;
  white-space: nowrap;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }

/* ── RESPONSIVE ──────────────────────────────── */
@media (max-width: 600px) {
  .topbar { gap: 8px; }
  .topbar__logo { font-size: 17px; }
  .topbar__stats { gap: 5px; }
  .stat-pill { font-size: 12px; padding: 4px 10px; }
  .btn { padding: 7px 12px; font-size: 12px; }
  .courts-grid { grid-template-columns: 1fr; }
  .modal { max-height: 95vh; }
  .add-player-form { flex-wrap: wrap; }
  .input--sm { max-width: 100%; }
}
```

- [ ] **Step 2: 在瀏覽器開啟 index.html，確認樣式正常載入，深色背景呈現，無 CSS 錯誤**

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: dark theme CSS design system with responsive layout"
```

---

## Task 3: 球員管理（CRUD）

**Files:**
- Create: `js/players.js`
- Create: `tests/test-runner.html`（部分）

- [ ] **Step 1: 建立 players.js**

```js
// js/players.js
import { loadPlayers, savePlayers } from './storage.js';
import { createPlayer } from './data.js';

export function getAllPlayers() {
  return loadPlayers();
}

export function addPlayer(name, skillLevel) {
  const players = loadPlayers();
  const player = createPlayer(name.trim(), skillLevel);
  players.push(player);
  savePlayers(players);
  return player;
}

export function updatePlayer(id, changes) {
  const players = loadPlayers();
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Player ${id} not found`);
  players[idx] = { ...players[idx], ...changes };
  savePlayers(players);
  return players[idx];
}

export function deletePlayer(id) {
  const players = loadPlayers().filter(p => p.id !== id);
  savePlayers(players);
}

export function setPresent(id, isPresent) {
  return updatePlayer(id, { isPresent });
}

// 「下課」：若球員不在場上，立即設為 not present；
// 若在場上，僅標記 pendingLeave（完場後由 game.js 處理）
export function markLeave(id, onCourtIds) {
  if (onCourtIds.includes(id)) {
    return updatePlayer(id, { pendingLeave: true });
  }
  return updatePlayer(id, { isPresent: false, pendingLeave: false });
}
```

- [ ] **Step 2: 在 data.js 的 createPlayer 補上 pendingLeave 欄位**

```js
// js/data.js — 修改 createPlayer，加入 pendingLeave
export function createPlayer(name, skillLevel) {
  return {
    id: crypto.randomUUID(),
    name,
    skillLevel: Number(skillLevel),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    isPresent: false,
    pendingLeave: false,
    lastGameEndTime: null,
  };
}
```

- [ ] **Step 3: 建立測試跑台 tests/test-runner.html（骨架，後面 Task 加入測試）**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>Unit Tests</title>
  <style>
    body { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .pass { color: #34d399; }
    .fail { color: #f87171; }
    pre  { background: #1e293b; padding: 8px; border-radius: 4px; margin: 4px 0; }
  </style>
</head>
<body>
<h2>🏸 Unit Tests</h2>
<div id="results"></div>
<script type="module">
  const results = document.getElementById('results');
  let passed = 0, failed = 0;

  function test(name, fn) {
    try {
      fn();
      results.innerHTML += `<p class="pass">✓ ${name}</p>`;
      passed++;
    } catch (e) {
      results.innerHTML += `<p class="fail">✗ ${name}</p><pre>${e.message}</pre>`;
      failed++;
    }
  }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  function assertEqual(a, b) { if (a !== b) throw new Error(`expected ${b}, got ${a}`); }

  // ── queue tests（Task 4 後填入）
  // ── matching tests（Task 5 後填入）

  results.innerHTML += `<p style="margin-top:16px;font-weight:bold">${passed} passed, ${failed} failed</p>`;
</script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add js/players.js js/data.js tests/test-runner.html
git commit -m "feat: player CRUD with attendance and leave management"
```

---

## Task 4: 公平輪打隊列

**Files:**
- Create: `js/queue.js`
- Modify: `tests/test-runner.html`

- [ ] **Step 1: 建立 queue.js**

```js
// js/queue.js

/**
 * 從出席球員中，排除正在場上的人，
 * 依「場數少優先、等待久優先」排序，回傳等待佇列。
 *
 * @param {Player[]} players
 * @param {string[]} onCourtIds - 目前在場上的球員 ID
 * @returns {Player[]}
 */
export function buildWaitingQueue(players, onCourtIds) {
  return players
    .filter(p => p.isPresent && !p.pendingLeave && !onCourtIds.includes(p.id))
    .sort((a, b) => {
      if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
      // 等待越久（lastGameEndTime 越早）排越前；從未打過的排最前
      const tA = a.lastGameEndTime ? new Date(a.lastGameEndTime).getTime() : 0;
      const tB = b.lastGameEndTime ? new Date(b.lastGameEndTime).getTime() : 0;
      return tA - tB;
    });
}
```

- [ ] **Step 2: 在 tests/test-runner.html 加入 queue 測試**

在 `// ── queue tests` 之後加入：

```js
import { buildWaitingQueue } from '../js/queue.js';

const now = Date.now();
const mkP = (id, games, lastEnd, isPresent = true) => ({
  id, name: id, skillLevel: 5, gamesPlayed: games,
  isPresent, pendingLeave: false,
  lastGameEndTime: lastEnd ? new Date(lastEnd).toISOString() : null,
  wins: 0, losses: 0,
});

test('queue: 場數少的排前面', () => {
  const players = [mkP('B', 3, now - 1000), mkP('A', 1, now - 2000)];
  const q = buildWaitingQueue(players, []);
  assertEqual(q[0].id, 'A');
});

test('queue: 場數相同時等待久的排前面', () => {
  const players = [mkP('B', 2, now - 1000), mkP('A', 2, now - 5000)];
  const q = buildWaitingQueue(players, []);
  assertEqual(q[0].id, 'A');
});

test('queue: 從未打過的場數為 0，lastGameEndTime=null 排最前', () => {
  const players = [mkP('B', 1, now - 1000), mkP('A', 0, null)];
  const q = buildWaitingQueue(players, []);
  assertEqual(q[0].id, 'A');
});

test('queue: 在場上的人不出現在等待區', () => {
  const players = [mkP('A', 0, null), mkP('B', 0, null)];
  const q = buildWaitingQueue(players, ['A']);
  assertEqual(q.length, 1);
  assertEqual(q[0].id, 'B');
});

test('queue: isPresent=false 的人不出現', () => {
  const players = [mkP('A', 0, null, false), mkP('B', 0, null, true)];
  const q = buildWaitingQueue(players, []);
  assertEqual(q.length, 1);
});

test('queue: pendingLeave 的人不出現', () => {
  const players = [
    { ...mkP('A', 0, null), pendingLeave: true },
    mkP('B', 0, null),
  ];
  const q = buildWaitingQueue(players, []);
  assertEqual(q.length, 1);
  assertEqual(q[0].id, 'B');
});
```

- [ ] **Step 3: 開啟 tests/test-runner.html，確認 6 個 queue 測試全部 pass**

- [ ] **Step 4: Commit**

```bash
git add js/queue.js tests/test-runner.html
git commit -m "feat: fair waiting queue with games-played and wait-time sorting"
```

---

## Task 5: 自動配對演算法

**Files:**
- Create: `js/matching.js`
- Modify: `tests/test-runner.html`

- [ ] **Step 1: 建立 matching.js**

```js
// js/matching.js

/**
 * 計算球員有效級分（加入勝率修正）
 */
export function effectiveLevel(player) {
  const { skillLevel, gamesPlayed, wins } = player;
  if (gamesPlayed < 5) return skillLevel;
  const winRate = wins / gamesPlayed;
  let bonus = 0;
  if (winRate > 0.75) bonus = 1.0;
  else if (winRate > 0.60) bonus = 0.5;
  else if (winRate < 0.40) bonus = -0.5;
  // 上限 ±2
  bonus = Math.max(-2, Math.min(2, bonus));
  return skillLevel + bonus;
}

/**
 * 從候選池（至少 4 人）中找出最均衡的 2v2 組合。
 * 回傳 { team1: [p, p], team2: [p, p] } 或 null（人數不足）。
 *
 * @param {Player[]} candidates - 至少 4 人
 */
export function findBestMatch(candidates) {
  if (candidates.length < 4) return null;

  // 只用前 8 人
  const pool = candidates.slice(0, 8);
  const n = pool.length;
  let best = null;
  let bestDiff = Infinity;

  // 列舉所有 C(n,2) × C(n-2,2)/2 的 2v2 組合
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          // 4 人: pool[i,j,k,l]，嘗試 3 種分組
          const four = [pool[i], pool[j], pool[k], pool[l]];
          const combos = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];
          for (const [t1, t2] of combos) {
            const avg1 = (effectiveLevel(t1[0]) + effectiveLevel(t1[1])) / 2;
            const avg2 = (effectiveLevel(t2[0]) + effectiveLevel(t2[1])) / 2;
            const diff = Math.abs(avg1 - avg2);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = { team1: t1, team2: t2, diff };
            }
          }
        }
      }
    }
  }
  return best;
}
```

- [ ] **Step 2: 在 tests/test-runner.html 加入 matching 測試**

在 `// ── matching tests` 之後加入：

```js
import { effectiveLevel, findBestMatch } from '../js/matching.js';

const mkPlayer = (id, skill, games = 0, wins = 0) => ({
  id, name: id, skillLevel: skill, gamesPlayed: games, wins,
  losses: games - wins, isPresent: true, pendingLeave: false, lastGameEndTime: null,
});

test('effectiveLevel: 場數不足 5 場無修正', () => {
  const p = mkPlayer('A', 10, 4, 4);
  assertEqual(effectiveLevel(p), 10);
});

test('effectiveLevel: 勝率 > 75% 加 1', () => {
  const p = mkPlayer('A', 10, 10, 9);  // 90% win
  assertEqual(effectiveLevel(p), 11);
});

test('effectiveLevel: 勝率 60-75% 加 0.5', () => {
  const p = mkPlayer('A', 10, 10, 7);  // 70% win
  assertEqual(effectiveLevel(p), 10.5);
});

test('effectiveLevel: 勝率 < 40% 減 0.5', () => {
  const p = mkPlayer('A', 10, 10, 3);  // 30% win
  assertEqual(effectiveLevel(p), 9.5);
});

test('findBestMatch: 回傳最均衡組合', () => {
  // levels: 20, 15, 10, 5 → 最好 [20,5] vs [15,10]，兩隊平均 12.5
  const players = [
    mkPlayer('A', 20), mkPlayer('B', 15),
    mkPlayer('C', 10), mkPlayer('D', 5),
  ];
  const match = findBestMatch(players);
  assert(match !== null, 'match should not be null');
  const avg1 = (match.team1[0].skillLevel + match.team1[1].skillLevel) / 2;
  const avg2 = (match.team2[0].skillLevel + match.team2[1].skillLevel) / 2;
  assertEqual(avg1, avg2);  // 應該完全平衡
});

test('findBestMatch: 人數不足回傳 null', () => {
  const players = [mkPlayer('A', 10), mkPlayer('B', 8), mkPlayer('C', 6)];
  assert(findBestMatch(players) === null, 'should return null');
});
```

- [ ] **Step 3: 開啟 tests/test-runner.html，確認全部 12 個測試 pass**

- [ ] **Step 4: Commit**

```bash
git add js/matching.js tests/test-runner.html
git commit -m "feat: auto-matching algorithm with win-rate correction"
```

---

## Task 6: 場地與場次管理

**Files:**
- Create: `js/game.js`

- [ ] **Step 1: 建立 game.js**

```js
// js/game.js
import { loadState, saveState, loadGames, saveGames, loadPlayers, savePlayers } from './storage.js';
import { createGame } from './data.js';

export function getState() {
  return loadState();
}

export function setCourtCount(n) {
  const state = loadState();
  const count = Math.max(1, Math.min(8, n));
  // 移除多餘場地（如果有進行中的場次，不強制中斷）
  const courts = { ...state.courts };
  for (let i = count + 1; i <= 8; i++) {
    if (courts[i] && !courts[i]) delete courts[i];
  }
  saveState({ ...state, courtCount: count, courts });
  return count;
}

/** 將指定場地放入配對結果，建立 Game 紀錄 */
export function startGame(courtId, team1PlayerIds, team2PlayerIds) {
  const state = loadState();
  const game = createGame(courtId, team1PlayerIds, team2PlayerIds);
  const games = loadGames();
  games.push(game);
  saveGames(games);
  saveState({
    ...state,
    courts: {
      ...state.courts,
      [courtId]: { team1: team1PlayerIds, team2: team2PlayerIds, gameId: game.id },
    },
  });
  return game;
}

/** 結束場次：記錄勝負，更新球員 stats，清場，處理 pendingLeave */
export function endGame(courtId, result) {
  const state = loadState();
  const court = state.courts[courtId];
  if (!court) throw new Error(`Court ${courtId} has no active game`);

  const games = loadGames();
  const gameIdx = games.findIndex(g => g.id === court.gameId);
  if (gameIdx !== -1) {
    games[gameIdx] = {
      ...games[gameIdx],
      endTime: new Date().toISOString(),
      result,
    };
    saveGames(games);
  }

  const endTime = new Date().toISOString();
  const players = loadPlayers();
  const allIds = [...court.team1, ...court.team2];

  const updated = players.map(p => {
    if (!allIds.includes(p.id)) return p;
    const inTeam1 = court.team1.includes(p.id);
    const won = (result === 'team1' && inTeam1) || (result === 'team2' && !inTeam1);
    const lost = (result === 'team1' && !inTeam1) || (result === 'team2' && inTeam1);
    return {
      ...p,
      gamesPlayed: p.gamesPlayed + 1,
      wins:   p.wins   + (won  ? 1 : 0),
      losses: p.losses + (lost ? 1 : 0),
      lastGameEndTime: endTime,
      // 若標記下課，完場後移出出席
      isPresent:    p.pendingLeave ? false : p.isPresent,
      pendingLeave: false,
    };
  });
  savePlayers(updated);

  const courts = { ...state.courts };
  delete courts[courtId];
  saveState({ ...state, courts });
}

/** 取得目前所有場上球員 ID */
export function getOnCourtIds(state) {
  return Object.values(state.courts)
    .flatMap(c => c ? [...c.team1, ...c.team2] : []);
}

/** 取得空場地編號列表 */
export function getEmptyCourts(state) {
  const ids = [];
  for (let i = 1; i <= state.courtCount; i++) {
    if (!state.courts[i]) ids.push(i);
  }
  return ids;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/game.js
git commit -m "feat: court and game state management with endGame flow"
```

---

## Task 7: UI 渲染層（主要介面）

**Files:**
- Create: `js/ui.js`

- [ ] **Step 1: 建立 ui.js — 工具函式與初始化**

```js
// js/ui.js
import { getAllPlayers, addPlayer, deletePlayer, setPresent, markLeave, updatePlayer } from './players.js';
import { buildWaitingQueue } from './queue.js';
import { findBestMatch } from './matching.js';
import { getState, setCourtCount, startGame, endGame, getOnCourtIds, getEmptyCourts } from './game.js';

// ── 工具 ─────────────────────────────────────
function levelClass(lvl) {
  if (lvl >= 14) return 'high';
  if (lvl >= 7)  return 'mid';
  return 'low';
}

function winRate(p) {
  if (p.gamesPlayed === 0) return '—';
  return Math.round(p.wins / p.gamesPlayed * 100) + '%';
}

let toastTimer = null;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── 狀態更新（每次操作後呼叫）────────────────
function refresh() {
  renderStats();
  renderCourts();
  renderWaiting();
  renderPlayerList();
}
```

- [ ] **Step 2: 加入 renderStats、renderCourts、renderWaiting**

在 ui.js 繼續加入：

```js
function renderStats() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const queue = buildWaitingQueue(players, onCourtIds);
  document.getElementById('stat-present').textContent = players.filter(p => p.isPresent).length;
  document.getElementById('stat-courts').textContent  = state.courtCount;
  document.getElementById('stat-waiting').textContent = queue.length;
}

function renderCourts() {
  const state = getState();
  const players = getAllPlayers();
  const grid = document.getElementById('courts-grid');
  grid.innerHTML = '';

  for (let i = 1; i <= state.courtCount; i++) {
    const court = state.courts[i];
    const card = document.createElement('div');

    if (court) {
      const getP = id => players.find(p => p.id === id) || { name: '?', skillLevel: 0 };
      const t1 = court.team1.map(getP);
      const t2 = court.team2.map(getP);
      const avg1 = (t1.reduce((s, p) => s + p.skillLevel, 0) / 2).toFixed(1);
      const avg2 = (t2.reduce((s, p) => s + p.skillLevel, 0) / 2).toFixed(1);
      const balanced = Math.abs(avg1 - avg2) <= 1;
      const pChip = p => `<span class="player-chip">
        <span class="player-chip__name">${p.name}</span>
        <span class="player-chip__lvl player-chip__lvl--${levelClass(p.skillLevel)}">${p.skillLevel}</span>
      </span>`;

      card.className = 'court-card court-card--active';
      card.dataset.courtId = i;
      card.innerHTML = `
        <div class="court-card__header">
          <span class="court-card__label">場地 ${i}</span>
          <span class="court-card__timer" data-timer="${Date.now()}">00:00</span>
        </div>
        <div class="teams">
          <div class="team team--blue">${t1.map(pChip).join('')}</div>
          <div class="vs-divider">VS</div>
          <div class="team team--green">${t2.map(pChip).join('')}</div>
        </div>
        <div class="balance-row">
          <div class="balance-bar"><div class="balance-fill" style="width:${balanced ? 50 : 40}%"></div></div>
          <span class="balance-label">${avg1} vs ${avg2} ${balanced ? '✓' : ''}</span>
        </div>
        <button class="btn-done" data-court="${i}">完場 →</button>
      `;
    } else {
      card.className = 'court-card court-card--empty';
      card.innerHTML = `
        <div class="court-card__header"><span class="court-card__label">場地 ${i}</span></div>
        <div class="court-card__empty">空場<br><small>按「自動配對」填入球員</small></div>
      `;
    }
    grid.appendChild(card);
  }

  // 綁定完場按鈕
  grid.querySelectorAll('.btn-done').forEach(btn => {
    btn.addEventListener('click', () => openResultModal(Number(btn.dataset.court)));
  });
}

function renderWaiting() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const queue = buildWaitingQueue(players, onCourtIds);
  const list = document.getElementById('waiting-list');
  list.innerHTML = '';

  if (queue.length === 0) {
    list.innerHTML = '<div class="empty-state">沒有等待中的球員</div>';
    return;
  }

  // 前 (空場 × 4) 人高亮為「下一場」
  const emptyCourts = getEmptyCourts(state);
  const nextCount = Math.min(emptyCourts.length * 4, queue.length);

  queue.forEach((p, idx) => {
    const isNext = idx < nextCount && emptyCourts.length > 0;
    const card = document.createElement('div');
    card.className = 'waiting-card' + (isNext ? ' waiting-card--next' : '');
    card.innerHTML = `
      ${isNext ? '<div class="waiting-card__badge">下一場</div>' : ''}
      <div class="waiting-card__name">${p.name}</div>
      <div class="waiting-card__level">等級 ${p.skillLevel}</div>
      <div class="waiting-card__games">${p.gamesPlayed} 場</div>
    `;
    list.appendChild(card);
  });
}
```

- [ ] **Step 3: 加入 renderPlayerList 和 Modal 邏輯**

在 ui.js 繼續加入：

```js
function renderPlayerList() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const list = document.getElementById('player-list');
  if (!list) return;
  list.innerHTML = '';

  if (players.length === 0) {
    list.innerHTML = '<div class="empty-state">尚未新增球員</div>';
    return;
  }

  players.forEach(p => {
    const onCourt = onCourtIds.includes(p.id);
    const row = document.createElement('div');
    row.className = 'player-row' + (p.isPresent ? ' player-row--present' : '');
    row.innerHTML = `
      <input type="checkbox" class="player-row__check" data-id="${p.id}" ${p.isPresent ? 'checked' : ''} ${onCourt ? 'disabled' : ''}>
      <span class="player-row__name">${p.name}</span>
      <span class="player-row__level">${p.skillLevel}</span>
      <span class="player-row__stats">${p.gamesPlayed}場 ${winRate(p)}</span>
      ${p.isPresent && !p.pendingLeave
        ? `<button class="btn-leave" data-id="${p.id}">下課</button>`
        : p.pendingLeave ? '<span style="font-size:11px;color:#f59e0b">下課中</span>' : ''}
      <button class="btn-edit" data-id="${p.id}" title="編輯">✏️</button>
      <button class="btn-delete" data-id="${p.id}" title="刪除" ${onCourt ? 'disabled' : ''}>🗑️</button>
    `;
    list.appendChild(row);
  });

  // 出席 checkbox
  list.querySelectorAll('.player-row__check').forEach(cb => {
    cb.addEventListener('change', () => {
      setPresent(cb.dataset.id, cb.checked);
      refresh();
    });
  });

  // 下課
  list.querySelectorAll('.btn-leave').forEach(btn => {
    btn.addEventListener('click', () => {
      markLeave(btn.dataset.id, onCourtIds);
      refresh();
      showToast('已標記下課');
    });
  });

  // 刪除
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('確定要刪除這位球員？')) {
        deletePlayer(btn.dataset.id);
        refresh();
      }
    });
  });

  // 編輯（inline 修改 skillLevel）
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = getAllPlayers().find(x => x.id === btn.dataset.id);
      const newName = prompt('修改姓名', p.name);
      if (newName === null) return;
      const newLvl = prompt('修改等級 (1-20)', p.skillLevel);
      if (newLvl === null) return;
      const lvl = Math.max(1, Math.min(20, Number(newLvl)));
      updatePlayer(p.id, { name: newName.trim() || p.name, skillLevel: lvl });
      refresh();
    });
  });
}

// ── Modal 控制 ────────────────────────────────
function openPlayerModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
  renderPlayerList();
}
function closePlayerModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── 完場 Modal ────────────────────────────────
let pendingCourtId = null;

function openResultModal(courtId) {
  pendingCourtId = courtId;
  const state = getState();
  const players = getAllPlayers();
  const court = state.courts[courtId];
  const getP = id => players.find(p => p.id === id) || { name: '?' };
  const t1names = court.team1.map(id => getP(id).name).join(' & ');
  const t2names = court.team2.map(id => getP(id).name).join(' & ');
  document.getElementById('result-prompt').textContent = `場地 ${courtId}：哪隊獲勝？`;
  document.getElementById('result-team1').textContent = `藍隊：${t1names}`;
  document.getElementById('result-team2').textContent = `綠隊：${t2names}`;
  document.getElementById('result-overlay').classList.remove('hidden');
}
function closeResultModal() {
  document.getElementById('result-overlay').classList.add('hidden');
  pendingCourtId = null;
}
```

- [ ] **Step 4: 加入自動配對邏輯和事件綁定、啟動**

在 ui.js 繼續加入：

```js
function handleAutoMatch() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const emptyCourts = getEmptyCourts(state);

  if (emptyCourts.length === 0) {
    showToast('目前沒有空場地');
    return;
  }

  const queue = buildWaitingQueue(players, onCourtIds);

  if (queue.length < 4) {
    showToast(`等待人數不足（需要至少 4 人，目前 ${queue.length} 人）`);
    return;
  }

  let matched = 0;
  const usedIds = new Set();

  for (const courtId of emptyCourts) {
    const available = queue.filter(p => !usedIds.has(p.id));
    if (available.length < 4) break;
    const match = findBestMatch(available);
    if (!match) break;
    const t1ids = match.team1.map(p => p.id);
    const t2ids = match.team2.map(p => p.id);
    startGame(courtId, t1ids, t2ids);
    t1ids.forEach(id => usedIds.add(id));
    t2ids.forEach(id => usedIds.add(id));
    matched++;
  }

  if (matched > 0) {
    showToast(`已配對 ${matched} 場`);
    refresh();
  } else {
    showToast('無法配對（人數不足）');
  }
}

// ── 計時器更新（每秒）────────────────────────
function startTimers() {
  setInterval(() => {
    document.querySelectorAll('.court-card__timer').forEach(el => {
      const startMs = Number(el.dataset.timer);
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    });
  }, 1000);
}

// ── 全域事件綁定與初始化 ──────────────────────
function init() {
  // 球員管理 Modal
  document.getElementById('btn-manage').addEventListener('click', openPlayerModal);
  document.getElementById('modal-close').addEventListener('click', closePlayerModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePlayerModal();
  });

  // 新增球員表單
  document.getElementById('add-player-form').addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('input-name').value.trim();
    const level = Number(document.getElementById('input-level').value);
    if (!name || level < 1 || level > 20) return;
    addPlayer(name, level);
    document.getElementById('input-name').value  = '';
    document.getElementById('input-level').value = '';
    refresh();
    showToast(`已新增球員：${name}`);
  });

  // 場地數調整
  document.getElementById('court-dec').addEventListener('click', () => {
    const state = getState();
    setCourtCount(state.courtCount - 1);
    refresh();
  });
  document.getElementById('court-inc').addEventListener('click', () => {
    const state = getState();
    setCourtCount(state.courtCount + 1);
    refresh();
  });

  // 自動配對
  document.getElementById('btn-match').addEventListener('click', handleAutoMatch);

  // 完場結果
  document.getElementById('result-team1').addEventListener('click', () => {
    endGame(pendingCourtId, 'team1');
    closeResultModal();
    refresh();
    showToast('已記錄結果');
  });
  document.getElementById('result-team2').addEventListener('click', () => {
    endGame(pendingCourtId, 'team2');
    closeResultModal();
    refresh();
    showToast('已記錄結果');
  });
  document.getElementById('result-draw').addEventListener('click', () => {
    endGame(pendingCourtId, 'draw');
    closeResultModal();
    refresh();
    showToast('已記錄平手');
  });
  document.getElementById('result-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeResultModal();
  });

  refresh();
  startTimers();
}

init();
```

- [ ] **Step 5: 在瀏覽器開啟 index.html，確認：**
  - 頁面正常顯示深色主題
  - 點「球員管理」Modal 開啟
  - 新增幾位球員，勾選出席，場地卡片顯示
  - 按「自動配對」後場地卡片出現球員
  - DevTools Console 無錯誤

- [ ] **Step 6: Commit**

```bash
git add js/ui.js js/game.js js/players.js js/queue.js js/matching.js
git commit -m "feat: complete dashboard UI with auto-match, courts, waiting queue"
```

---

## Task 8: 完場流程端對端測試

**Files:**
- Modify: `tests/test-runner.html`（加入 game flow 測試）
- No code changes to src

- [ ] **Step 1: 手動端對端測試清單**

在瀏覽器中執行以下情境：

**情境 A — 正常配對完場：**
1. 新增 6 名球員（等級分別：18, 15, 12, 10, 8, 5）
2. 全部勾選出席
3. 場地設為 1
4. 按「自動配對」→ 場地 1 出現 2v2，等待區剩 2 人
5. 等待區確認：2 人顯示「下一場」橘色標示
6. 按「完場 →」→ 選「藍隊獲勝」
7. 場地 1 清空，6 人回到等待區
8. 確認先前藍隊 2 人 wins+1，綠隊 2 人 losses+1，場數都 +1

**情境 B — 公平輪打：**
1. 繼續上面的狀態，再按「自動配對」2 次（每次完場）
2. 打開球員管理，確認每個人的場數盡量均等（差距不超過 1）

**情境 C — 下課按鈕：**
1. 某球員在等待區，按「下課」→ 立即從等待區移除
2. 某球員在場上時，按「下課」→ 等待區不動，完場後該球員消失

**情境 D — 邊界：等待人數不足：**
1. 只有 3 人出席，按「自動配對」→ Toast 提示「需要至少 4 人，目前 3 人」

- [ ] **Step 2: 確認所有情境正常，無 Console 錯誤**

- [ ] **Step 3: Commit**

```bash
git add tests/test-runner.html
git commit -m "test: add e2e test checklist and verify all scenarios pass"
```

---

## Task 9: UI 精修與細節

**Files:**
- Modify: `css/style.css`
- Modify: `index.html`（加入 favicon emoji）

- [ ] **Step 1: 在 index.html `<head>` 加入 emoji favicon**

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏸</text></svg>">
```

- [ ] **Step 2: 在 style.css 補上 hover 效果與動畫**

在 style.css 末尾加入：

```css
/* ── ANIMATION HELPERS ───────────────────────── */
.waiting-card { animation: pop-in 0.2s ease; }
@keyframes pop-in {
  from { transform: scale(0.85); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.court-card--active { animation: card-appear 0.25s ease; }
@keyframes card-appear {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

/* ── SCROLLBAR ───────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-base); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

/* ── PLAYER COUNT BADGE ──────────────────────── */
.topbar__logo::after {
  content: '';
}

/* ── FOCUS STYLES ────────────────────────────── */
button:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 3: 在瀏覽器確認動畫順暢，favicon 顯示，深色主題一致**

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: ui polish — animations, favicon, focus styles, scrollbar"
```

---

## 自我審查結果

**Spec coverage：**
- ✅ 球員 CRUD + 實力等級 1–20 (Task 1, 3)
- ✅ 今日出席勾選 (Task 3, 7)
- ✅ 「下課」按鈕（完場後移出）(Task 3, 6, 7)
- ✅ 場地數設定 1–8 (Task 1, 6)
- ✅ 公平輪打隊列（場數+等待時間） (Task 4)
- ✅ 自動配對演算法（最均衡 2v2） (Task 5)
- ✅ 勝率修正有效級分 (Task 5)
- ✅ 完場流程 + 記錄勝負 (Task 6, 7)
- ✅ 全覽儀表板佈局 (Task 2, 7)
- ✅ 等待區「下一場」橘色標示 (Task 7)
- ✅ 計時器 (Task 7)
- ✅ RWD 響應式 (Task 2)
- ✅ LocalStorage 持久化 (Task 1)
- ✅ 深色主題精美 UI (Task 2, 9)
- ✅ 等待人數不足提示 (Task 7)

**No TBD or placeholders:** 確認無。
**Type consistency:** `createGame/createPlayer` → `data.js`；`startGame/endGame` → `game.js`；`findBestMatch` → `matching.js`；全程一致。
