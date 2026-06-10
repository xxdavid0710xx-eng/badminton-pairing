// js/ui.js
import { getAllPlayers, addPlayer, deletePlayer, setPresent, markLeave, updatePlayer } from './players.js';
import { buildWaitingQueue } from './queue.js';
import { findBestMatch } from './matching.js';
import { loadGames } from './storage.js';
import { getState, setCourtCount, startGame, endGame, getOnCourtIds, getEmptyCourts } from './game.js';

// ── Helpers ──────────────────────────────────
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

function refresh() {
  renderStats();
  renderCourts();
  renderWaiting();
  renderPlayerList();
}

// ── Stats ─────────────────────────────────────
function renderStats() {
  const players = getAllPlayers();
  const state = getState();
  const onCourtIds = getOnCourtIds(state);
  const queue = buildWaitingQueue(players, onCourtIds);
  document.getElementById('stat-present').textContent = players.filter(p => p.isPresent).length;
  document.getElementById('stat-courts').textContent  = state.courtCount;
  document.getElementById('stat-waiting').textContent = queue.length;
}

// ── Courts ────────────────────────────────────
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
      const avg1 = ((t1[0].skillLevel + t1[1].skillLevel) / 2).toFixed(1);
      const avg2 = ((t2[0].skillLevel + t2[1].skillLevel) / 2).toFixed(1);
      const balanced = Math.abs(avg1 - avg2) <= 1;

      // Use the game's actual start time for the timer, so it survives re-renders
      const games = loadGames();
      const game = games.find(g => g.id === court.gameId);
      const startMs = game ? new Date(game.startTime).getTime() : Date.now();

      const pChip = p => `<span class="player-chip">
        <span class="player-chip__name">${p.name}</span>
        <span class="player-chip__lvl player-chip__lvl--${levelClass(p.skillLevel)}">${p.skillLevel}</span>
      </span>`;

      card.className = 'court-card court-card--active';
      card.dataset.courtId = i;
      card.innerHTML = `
        <div class="court-card__header">
          <span class="court-card__label">場地 ${i}</span>
          <span class="court-card__timer" data-start="${startMs}">00:00</span>
        </div>
        <div class="teams">
          <div class="team team--blue">${t1.map(pChip).join('')}</div>
          <div class="vs-divider">VS</div>
          <div class="team team--green">${t2.map(pChip).join('')}</div>
        </div>
        <div class="balance-row">
          <div class="balance-bar"><div class="balance-fill" style="width:${balanced ? 50 : 40}%"></div></div>
          <span class="balance-label">${avg1} vs ${avg2}${balanced ? ' ✓' : ''}</span>
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

  grid.querySelectorAll('.btn-done').forEach(btn => {
    btn.addEventListener('click', () => openResultModal(Number(btn.dataset.court)));
  });
}

// ── Waiting queue ─────────────────────────────
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

  const emptyCourts = getEmptyCourts(state);
  const nextCount = emptyCourts.length > 0 ? Math.min(emptyCourts.length * 4, queue.length) : 0;

  queue.forEach((p, idx) => {
    const isNext = idx < nextCount;
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

// ── Player list (in modal) ────────────────────
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

  list.querySelectorAll('.player-row__check').forEach(cb => {
    cb.addEventListener('change', () => {
      setPresent(cb.dataset.id, cb.checked);
      refresh();
    });
  });

  list.querySelectorAll('.btn-leave').forEach(btn => {
    btn.addEventListener('click', () => {
      markLeave(btn.dataset.id, onCourtIds);
      refresh();
      showToast('已標記下課');
    });
  });

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('確定要刪除這位球員？')) {
        deletePlayer(btn.dataset.id);
        refresh();
      }
    });
  });

  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = getAllPlayers().find(x => x.id === btn.dataset.id);
      if (!p) return;
      const newName = prompt('修改姓名', p.name);
      if (newName === null) return;
      const newLvl = prompt('修改等級 (1-20)', p.skillLevel);
      if (newLvl === null) return;
      const lvl = Math.max(1, Math.min(20, Number(newLvl)));
      if (!isNaN(lvl)) {
        updatePlayer(p.id, { name: newName.trim() || p.name, skillLevel: lvl });
        refresh();
      }
    });
  });
}

// ── Modals ────────────────────────────────────
function openPlayerModal() {
  document.getElementById('modal-overlay').classList.remove('hidden');
  renderPlayerList();
}
function closePlayerModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

let pendingCourtId = null;

function openResultModal(courtId) {
  pendingCourtId = courtId;
  const state = getState();
  const players = getAllPlayers();
  const court = state.courts[courtId];
  if (!court) return;
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

// ── Auto-match ────────────────────────────────
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

// ── Timer ─────────────────────────────────────
function startTimers() {
  setInterval(() => {
    document.querySelectorAll('.court-card__timer[data-start]').forEach(el => {
      const startMs = Number(el.dataset.start);
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    });
  }, 1000);
}

// ── Init ──────────────────────────────────────
function init() {
  document.getElementById('btn-manage').addEventListener('click', openPlayerModal);
  document.getElementById('modal-close').addEventListener('click', closePlayerModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePlayerModal();
  });

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

  document.getElementById('btn-match').addEventListener('click', handleAutoMatch);

  document.getElementById('result-team1').addEventListener('click', () => {
    if (pendingCourtId === null) return;
    endGame(pendingCourtId, 'team1');
    closeResultModal();
    refresh();
    showToast('已記錄結果');
  });
  document.getElementById('result-team2').addEventListener('click', () => {
    if (pendingCourtId === null) return;
    endGame(pendingCourtId, 'team2');
    closeResultModal();
    refresh();
    showToast('已記錄結果');
  });
  document.getElementById('result-draw').addEventListener('click', () => {
    if (pendingCourtId === null) return;
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
