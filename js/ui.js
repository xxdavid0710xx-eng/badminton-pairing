// js/ui.js
import { getAllPlayers, addPlayer, deletePlayer, setPresent, markLeave, updatePlayer } from './players.js';
import { buildWaitingQueue, applyManualOrder } from './queue.js';
import { findBestMatch } from './matching.js';
import { loadGames, savePlayers, saveState } from './storage.js';
import { getState, setCourtCount, startGame, endGame, getOnCourtIds, getEmptyCourts } from './game.js';
import { getOrCreateTodaySession, getTodaySession, updateSession, recalcAllAmounts, calcPlayerAmount, getAllSessions } from './sessions.js';

// ── Helpers ──────────────────────────────────────────
function levelClass(lvl) {
  if (lvl >= 14) return 'high';
  if (lvl >= 7)  return 'mid';
  return 'low';
}

function winRateStr(p) {
  if (!p.gamesPlayed) return '—';
  return Math.round(p.wins / p.gamesPlayed * 100) + '%';
}

let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── Navigation ────────────────────────────────────────
let currentPage = 'match';

function navigate(pageKey) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(`page-${pageKey}`);
  const nav  = document.querySelector(`.nav-item[data-page="${pageKey}"]`);
  if (page) page.classList.add('active');
  if (nav)  nav.classList.add('active');
  currentPage = pageKey;
  if (pageKey === 'match')   refresh();
  if (pageKey === 'players') renderPlayerDB();
  if (pageKey === 'payment') renderPayment();
  if (pageKey === 'history') renderHistory();
}

function refresh() {
  renderStats();
  renderCourts();
  renderWaiting();
}

// ── Stats ─────────────────────────────────────────────
function renderStats() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const queue = buildWaitingQueue(players, onCourtIds);
  document.getElementById('stat-present').textContent = players.filter(p => p.isPresent).length;
  document.getElementById('stat-courts').textContent  = state.courtCount;
  document.getElementById('stat-waiting').textContent = queue.length;
}

// ── Court card (badminton court SVG) ──────────────────
function buildCourtSVG() {
  return `<svg class="court-lines" viewBox="0 0 240 380" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="224" height="364" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
    <line x1="46" y1="8" x2="46" y2="372" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
    <line x1="194" y1="8" x2="194" y2="372" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
    <line x1="8" y1="22" x2="232" y2="22" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>
    <line x1="8" y1="358" x2="232" y2="358" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>
    <line x1="8" y1="134" x2="232" y2="134" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
    <line x1="8" y1="246" x2="232" y2="246" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
    <line x1="120" y1="22" x2="120" y2="134" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
    <line x1="120" y1="246" x2="120" y2="358" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
  </svg>`;
}

function buildPlayerToken(p, team) {
  const cls = team === 1 ? 'token-avatar--blue' : 'token-avatar--green';
  return `<div class="player-token" draggable="true"
    data-player-id="${p.id}" data-token-team="${team}">
    <div class="token-avatar ${cls}">
      <div class="token-lvl-badge">${p.skillLevel}</div>
      <span class="token-name">${p.name}</span>
      <span class="token-wr">${winRateStr(p)}</span>
    </div>
  </div>`;
}

function renderCourts() {
  const state   = getState();
  const players = getAllPlayers();
  const grid    = document.getElementById('courts-grid');
  grid.innerHTML = '';

  for (let i = 1; i <= state.courtCount; i++) {
    const court = state.courts[i];
    const wrap  = document.createElement('div');
    wrap.className = 'bm-court-wrap';

    if (court) {
      const getP = id => players.find(p => p.id === id) || { name: '?', skillLevel: 0, gamesPlayed: 0, wins: 0 };
      const t1 = court.team1.map(getP);
      const t2 = court.team2.map(getP);
      const avg1 = ((t1[0].skillLevel + t1[1].skillLevel) / 2).toFixed(1);
      const avg2 = ((t2[0].skillLevel + t2[1].skillLevel) / 2).toFixed(1);

      const games   = loadGames();
      const game    = games.find(g => g.id === court.gameId);
      const startMs = game ? new Date(game.startTime).getTime() : Date.now();

      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px">
          <span style="font-size:13px;font-weight:700;color:var(--text-secondary)">場地 ${i}</span>
          <span class="court-card__timer" data-start="${startMs}">00:00</span>
        </div>
        <div class="bm-court" data-court-id="${i}">
          <div class="half-tint half-tint--blue"></div>
          <div class="half-tint half-tint--green"></div>
          ${buildCourtSVG()}
          <div class="court-net"></div>
          <div class="court-net-post court-net-post--left"></div>
          <div class="court-net-post court-net-post--right"></div>
          <div class="court-team court-team--top" data-court="${i}" data-team="1">
            ${t1.map(p => buildPlayerToken(p, 1)).join('')}
          </div>
          <div class="court-team court-team--bottom" data-court="${i}" data-team="2">
            ${t2.map(p => buildPlayerToken(p, 2)).join('')}
          </div>
        </div>
        <div class="court-info-bar">
          <div class="court-info-avg">
            <span class="blue">藍 ${avg1}</span> vs <span class="green">綠 ${avg2}</span>
          </div>
          <button class="btn-done" data-court="${i}">完場 →</button>
        </div>`;
    } else {
      wrap.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px">
          <span style="font-size:13px;font-weight:700;color:var(--text-secondary)">場地 ${i}</span>
          <span style="font-size:11px;color:var(--text-muted)">空場</span>
        </div>
        <div class="bm-court" data-court-id="${i}" style="opacity:0.45;background:#0d1f14;box-shadow:0 0 0 2px #1a3b25">
          ${buildCourtSVG()}
          <div class="court-net"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;opacity:0.4">
            <span style="font-size:24px">🏸</span>
            <span style="font-size:11px;color:#2d4a38">空場</span>
          </div>
        </div>
        <div class="court-info-bar" style="opacity:0.3">
          <div class="court-info-avg">—</div>
        </div>`;
    }

    grid.appendChild(wrap);
  }

  grid.querySelectorAll('.btn-done').forEach(btn =>
    btn.addEventListener('click', () => openResultModal(Number(btn.dataset.court)))
  );

  initCourtDragTargets();
}

// ── Waiting queue render ───────────────────────────────
function renderWaiting() {
  const players    = getAllPlayers();
  const state      = getState();
  const onCourtIds = getOnCourtIds(state);
  const queue      = buildWaitingQueue(players, onCourtIds);
  const list       = document.getElementById('waiting-list');
  list.innerHTML   = '';

  if (!queue.length) {
    list.innerHTML = '<div class="empty-state">沒有等待中的球員</div>';
    return;
  }

  const emptyCourts = getEmptyCourts(state);
  const nextCount   = emptyCourts.length > 0 ? Math.min(emptyCourts.length * 4, queue.length) : 0;

  queue.forEach((p, idx) => {
    const isNext = idx < nextCount;
    const card   = document.createElement('div');
    card.className = 'waiting-card' + (isNext ? ' waiting-card--next' : '');
    card.draggable = true;
    card.dataset.playerId = p.id;
    card.innerHTML = `
      <span class="waiting-card__drag">⠿</span>
      ${isNext ? '<div class="waiting-card__badge">下一場</div>' : ''}
      <div class="waiting-card__name">${p.name}</div>
      <div class="waiting-card__level">等級 ${p.skillLevel}</div>
      <div class="waiting-card__wr">${winRateStr(p)}</div>
      <div class="waiting-card__games">${p.gamesPlayed} 場</div>`;
    list.appendChild(card);
  });

  initWaitingDragDrop();
}

// ── Drag and Drop ─────────────────────────────────────
let dragPayload = null; // { type: 'waiting'|'court', playerId, courtId?, team? }

function initWaitingDragDrop() {
  const list  = document.getElementById('waiting-list');
  const cards = list.querySelectorAll('.waiting-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      dragPayload = { type: 'waiting', playerId: card.dataset.playerId };
      e.dataTransfer.effectAllowed = 'move';
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => card.style.opacity = '1');

    card.addEventListener('dragover', e => {
      e.preventDefault();
      card.classList.add('waiting-card--drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('waiting-card--drag-over'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('waiting-card--drag-over');
      if (!dragPayload || dragPayload.type !== 'waiting') return;
      const fromId = dragPayload.playerId;
      const toId   = card.dataset.playerId;
      if (fromId === toId) return;

      const players = getAllPlayers();
      const state   = getState();
      const onCourt = getOnCourtIds(state);
      const queue   = buildWaitingQueue(players, onCourt);
      const ids     = queue.map(p => p.id);
      const fi = ids.indexOf(fromId), ti = ids.indexOf(toId);
      if (fi === -1 || ti === -1) return;
      ids.splice(fi, 1);
      ids.splice(ti, 0, fromId);

      const updated = applyManualOrder(players, ids);
      savePlayers(updated);
      refresh();
    });
  });

  // Drop on waiting area (from court token)
  list.addEventListener('dragover', e => e.preventDefault());
  list.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragPayload || dragPayload.type !== 'court') return;
    const { playerId, courtId } = dragPayload;
    endGame(courtId, 'draw');
    setPresent(playerId, true);
    refresh();
    showToast('球員已移回等待區（場次以平手結束）');
  });
}

function initCourtDragTargets() {
  document.querySelectorAll('.player-token').forEach(token => {
    token.addEventListener('dragstart', e => {
      dragPayload = {
        type: 'court',
        playerId: token.dataset.playerId,
        courtId: Number(token.closest('[data-court-id]').dataset.courtId),
        team: Number(token.dataset.tokenTeam),
      };
      e.dataTransfer.effectAllowed = 'move';
      token.style.opacity = '0.5';
    });
    token.addEventListener('dragend', () => token.style.opacity = '1');
  });

  document.querySelectorAll('.court-team').forEach(zone => {
    zone.addEventListener('dragover', e => e.preventDefault());
    zone.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragPayload || dragPayload.type !== 'waiting') return;
      const courtId = Number(zone.dataset.court);
      const team    = Number(zone.dataset.team);
      const state   = getState();
      const court   = state.courts[courtId];
      if (!court) return;
      const targetTeam = team === 1 ? court.team1 : court.team2;
      if (targetTeam.length >= 2) { showToast('該隊已有 2 人'); return; }
      const newTeam = [...targetTeam, dragPayload.playerId];
      const other   = team === 1 ? court.team2 : court.team1;
      const newT1   = team === 1 ? newTeam : other;
      const newT2   = team === 2 ? newTeam : other;
      const s = getState();
      s.courts[courtId] = { ...s.courts[courtId], team1: newT1, team2: newT2 };
      saveState(s);
      refresh();
    });
  });
}

// ── Broadcast ─────────────────────────────────────────
let broadcastTimer = null;
function showBroadcast(announcements) {
  const banner    = document.getElementById('broadcast-banner');
  const courtEl   = document.getElementById('broadcast-court');
  const playersEl = document.getElementById('broadcast-players');
  const statusEl  = document.getElementById('broadcast-status');

  let idx = 0;
  function show(item) {
    courtEl.textContent   = `場地 ${item.courtId} — 上場`;
    playersEl.innerHTML   = `${item.team1Names} <span class="broadcast-vs">vs</span> ${item.team2Names}`;
    statusEl.textContent  = '▶ 朗讀中…';
    banner.classList.remove('hidden');
  }

  function speak(item) {
    if (!window.speechSynthesis) return;
    const nums = ['一','二','三','四','五','六','七','八'];
    const text = `場地${nums[item.courtId - 1] || item.courtId}，上場：${item.team1Names.replace(/&/g,'、')}，對${item.team2Names.replace(/&/g,'、')}`;
    const utt  = new SpeechSynthesisUtterance(text);
    utt.lang   = 'zh-TW';
    utt.onend  = () => {
      statusEl.textContent = '';
      idx++;
      if (idx < announcements.length) {
        show(announcements[idx]);
        speak(announcements[idx]);
      } else {
        clearTimeout(broadcastTimer);
        broadcastTimer = setTimeout(() => banner.classList.add('hidden'), 3000);
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  if (announcements.length > 0) {
    show(announcements[0]);
    speak(announcements[0]);
  }
}

// ── Auto-match ────────────────────────────────────────
function handleAutoMatch() {
  const players     = getAllPlayers();
  const state       = getState();
  const onCourtIds  = getOnCourtIds(state);
  const emptyCourts = getEmptyCourts(state);

  if (!emptyCourts.length) { showToast('目前沒有空場地'); return; }

  const queue = buildWaitingQueue(players, onCourtIds);
  if (queue.length < 4) { showToast(`等待人數不足（需 4 人，目前 ${queue.length} 人）`); return; }

  const announcements = [];
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
    announcements.push({
      courtId,
      team1Names: match.team1.map(p => p.name).join(' & '),
      team2Names: match.team2.map(p => p.name).join(' & '),
    });
  }

  if (announcements.length > 0) {
    refresh();
    showBroadcast(announcements);
  } else {
    showToast('無法配對（限制條件過多或人數不足）');
  }
}

// ── Result modal ──────────────────────────────────────
let pendingCourtId = null;
function openResultModal(courtId) {
  pendingCourtId = courtId;
  const state   = getState();
  const players = getAllPlayers();
  const court   = state.courts[courtId];
  if (!court) return;
  const getP = id => players.find(p => p.id === id) || { name: '?' };
  const t1names = court.team1.map(id => getP(id).name).join(' & ');
  const t2names = court.team2.map(id => getP(id).name).join(' & ');
  document.getElementById('result-prompt').textContent = `場地 ${courtId}：哪隊獲勝？`;
  document.getElementById('result-team1').textContent  = `藍隊：${t1names}`;
  document.getElementById('result-team2').textContent  = `綠隊：${t2names}`;
  document.getElementById('result-overlay').classList.remove('hidden');
}
function closeResultModal() {
  document.getElementById('result-overlay').classList.add('hidden');
  pendingCourtId = null;
}

// ── Timer ─────────────────────────────────────────────
function startTimers() {
  setInterval(() => {
    document.querySelectorAll('.court-card__timer[data-start]').forEach(el => {
      const elapsed = Math.floor((Date.now() - Number(el.dataset.start)) / 1000);
      el.textContent = `${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
    });
  }, 1000);
}

// ── Stub pages (implemented in Tasks 8-10) ────────────
function renderPlayerDB() {}
function renderPayment()  {}
function renderHistory()  {}

// ── Init ──────────────────────────────────────────────
function init() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.page))
  );

  // Slider label
  const slider  = document.getElementById('input-level');
  const display = document.getElementById('level-display');
  slider.addEventListener('input', () => display.textContent = slider.value);

  // Add player form
  document.getElementById('add-player-form').addEventListener('submit', e => {
    e.preventDefault();
    const name    = document.getElementById('input-name').value.trim();
    const level   = Number(slider.value);
    const present = document.getElementById('input-present').checked;
    if (!name) return;
    addPlayer(name, level, { isPresent: present });
    document.getElementById('input-name').value = '';
    slider.value = '10';
    display.textContent = '10';
    refresh();
    showToast(`已新增球員：${name}`);
  });

  // Court count
  document.getElementById('court-dec').addEventListener('click', () => {
    setCourtCount(getState().courtCount - 1); refresh();
  });
  document.getElementById('court-inc').addEventListener('click', () => {
    setCourtCount(getState().courtCount + 1); refresh();
  });

  // Auto-match
  document.getElementById('btn-match').addEventListener('click', handleAutoMatch);

  // Result modal buttons
  ['team1','team2','draw'].forEach(result => {
    document.getElementById(`result-${result}`).addEventListener('click', () => {
      if (pendingCourtId === null) return;
      endGame(pendingCourtId, result);
      closeResultModal();
      refresh();
      showToast('已記錄結果');
    });
  });
  document.getElementById('result-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeResultModal();
  });

  refresh();
  startTimers();
}

init();
