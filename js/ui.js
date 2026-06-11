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

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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
      <span class="token-name">${esc(p.name)}</span>
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
      const avg1 = t1.length >= 2 ? ((t1[0].skillLevel + t1[1].skillLevel) / 2).toFixed(1) : t1.length === 1 ? String(t1[0].skillLevel) : '—';
      const avg2 = t2.length >= 2 ? ((t2[0].skillLevel + t2[1].skillLevel) / 2).toFixed(1) : t2.length === 1 ? String(t2[0].skillLevel) : '—';

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
      ${isNext ? '<div class="waiting-card__badge">下一場</div>' : ''}
      <div class="waiting-card__name">${esc(p.name)}</div>
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
  });

  // Drop on waiting area (from court token — injury / substitution)
  list.addEventListener('dragover', e => e.preventDefault());
  list.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragPayload || dragPayload.type !== 'court') return;
    const { playerId, courtId } = dragPayload;
    // Remove only this player from their team; leave the rest of the game intact
    const s     = getState();
    const court = s.courts[courtId];
    if (!court) return;
    const newTeam1 = court.team1.filter(id => id !== playerId);
    const newTeam2 = court.team2.filter(id => id !== playerId);
    if (newTeam1.length === 0 && newTeam2.length === 0) {
      delete s.courts[courtId];
    } else {
      s.courts[courtId] = { ...court, team1: newTeam1, team2: newTeam2 };
    }
    saveState(s);
    refresh();
    showToast('球員已移回等待區，可拖入替補球員');
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
    playersEl.innerHTML   = `${esc(item.team1Names)} <span class="broadcast-vs">vs</span> ${esc(item.team2Names)}`;
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

// ── Player Database ───────────────────────────────────
function renderPlayerDB() {
  const search  = (document.getElementById('db-search')?.value || '').toLowerCase();
  const players = getAllPlayers().filter(p =>
    !search || p.name.toLowerCase().includes(search)
  );
  const state      = getState();
  const onCourtIds = getOnCourtIds(state);
  const list       = document.getElementById('db-player-list');
  if (!list) return;

  list.innerHTML = players.length === 0
    ? '<div class="empty-state">尚無球員</div>'
    : '';

  players.forEach(p => {
    const onCourt    = onCourtIds.includes(p.id);
    const avatarCls  = p.gender === 'F' ? 'db-avatar db-avatar--f' : 'db-avatar';
    const allPlayers = getAllPlayers();
    const partnerTags = (p.partners || []).map(id => {
      const x = allPlayers.find(q => q.id === id);
      return x ? `<span class="tag-partner">♥ ${esc(x.name)}</span>` : '';
    }).join('');
    const avoidTags = [
      ...(p.avoidTeam || []).map(id => {
        const x = allPlayers.find(q => q.id === id);
        return x ? `<span class="tag-avoid">≠ ${esc(x.name)}</span>` : '';
      }),
      ...(p.avoidAll || []).map(id => {
        const x = allPlayers.find(q => q.id === id);
        return x ? `<span class="tag-avoid">✕ ${esc(x.name)}</span>` : '';
      }),
    ].join('');

    const row = document.createElement('div');
    row.className = 'db-player-row' + (p.isPresent ? ' present' : '');
    row.innerHTML = `
      <div class="${avatarCls}">${esc(p.name[0])}</div>
      <div class="db-info">
        <div class="db-name-row">
          ${esc(p.name)}
          <span class="player-row__level">${p.skillLevel}</span>
          <span style="color:#f59e0b;font-size:11px;font-weight:600">${winRateStr(p)}</span>
          ${p.isPresent ? '<span class="db-present-dot" title="今日出席"></span>' : ''}
        </div>
        <div class="db-meta">
          <span>🎮 ${p.gamesPlayed} 場</span>
          <span>🏆 ${p.wins}勝 ${p.losses}負</span>
          <span>📅 ${p.lastGameEndTime ? new Date(p.lastGameEndTime).toLocaleDateString('zh-TW') : '無紀錄'}</span>
        </div>
        ${(partnerTags || avoidTags) ? `<div class="db-tags">${partnerTags}${avoidTags}</div>` : ''}
      </div>
      <div class="db-actions">
        <button class="btn-icon btn-db-toggle" data-id="${p.id}" title="${p.isPresent ? '標記離場' : '標記出席'}" ${onCourt ? 'disabled' : ''}>
          ${p.isPresent ? '🟢' : '⚪'}
        </button>
        <button class="btn-icon btn-db-constraint" data-id="${p.id}" title="配對設定">🔗</button>
        <button class="btn-icon btn-db-delete" data-id="${p.id}" title="刪除" ${onCourt ? 'disabled' : ''}>🗑️</button>
      </div>`;
    list.appendChild(row);
  });

  list.querySelectorAll('.btn-db-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = getAllPlayers().find(x => x.id === btn.dataset.id);
      if (!p) return;
      setPresent(p.id, !p.isPresent);
      renderPlayerDB();
      if (currentPage === 'match') refresh();
    });
  });
  list.querySelectorAll('.btn-db-constraint').forEach(btn => {
    btn.addEventListener('click', () => openConstraintModal(btn.dataset.id));
  });
  list.querySelectorAll('.btn-db-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('確定刪除？')) { deletePlayer(btn.dataset.id); renderPlayerDB(); }
    });
  });
}

let constraintPlayerId = null;
let constraintAvoidMode = 'avoidAll';

function openConstraintModal(playerId) {
  constraintPlayerId = playerId;
  const p      = getAllPlayers().find(x => x.id === playerId);
  if (!p) return;
  const others = getAllPlayers().filter(x => x.id !== playerId);

  document.getElementById('constraint-avatar').textContent = p.name[0];
  document.getElementById('constraint-avatar').className   = p.gender === 'F' ? 'db-avatar db-avatar--f' : 'db-avatar';
  document.getElementById('constraint-title').textContent  = `${p.name} 的配對設定`;
  document.getElementById('constraint-sub').textContent    = `等級 ${p.skillLevel} · ${winRateStr(p)} · ${p.gamesPlayed} 場`;

  const prefLabels  = { any: '不限', male: '♂♂ 男雙', female: '♀♀ 女雙', mixed: '♂♀ 混雙' };
  const prefClasses = { any: '', male: '', female: 'active-green', mixed: 'active-purple' };

  document.getElementById('constraint-body').innerHTML = `
    <div style="margin-bottom:14px">
      <div class="section__title">性別</div>
      <div class="pref-btn-group">
        <button class="pref-btn ${p.gender === 'M' ? 'active' : ''}" data-gender="M">♂ 男</button>
        <button class="pref-btn ${p.gender === 'F' ? 'active' : ''}" data-gender="F">♀ 女</button>
      </div>
    </div>
    <div style="margin-bottom:14px">
      <div class="section__title">打法偏好</div>
      <div class="pref-btn-group">
        ${Object.entries(prefLabels).map(([k, label]) =>
          `<button class="pref-btn ${p.matchPreference === k ? ('active ' + (prefClasses[k] || '')) : ''}" data-pref="${k}">${label}</button>`
        ).join('')}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:5px">人數不足時自動跳過，不強制配對</div>
    </div>
    <div style="margin-bottom:14px">
      <div class="section__title" style="margin-bottom:4px">優先搭檔（希望同隊）</div>
      <div class="player-pick-grid">
        ${others.map(o => `
          <button class="player-pick-btn ${(p.partners||[]).includes(o.id) ? 'selected-partner' : ''}" data-partner="${o.id}">
            <div style="width:20px;height:20px;border-radius:50%;background:#1e293b;border:1.5px solid #475569;display:flex;align-items:center;justify-content:center;font-size:9px">${esc(o.name[0])}</div>
            ${esc(o.name)}
          </button>`).join('')}
      </div>
    </div>
    <div>
      <div class="section__title" style="margin-bottom:6px">迴避設定</div>
      <div class="avoid-type-toggle">
        <button class="avoid-type-btn ${constraintAvoidMode === 'avoidTeam' ? 'active' : ''}" data-avoid-type="avoidTeam">不同隊（可對打）</button>
        <button class="avoid-type-btn ${constraintAvoidMode === 'avoidAll' ? 'active' : ''}" data-avoid-type="avoidAll">完全迴避（不同場）</button>
      </div>
      <div class="player-pick-grid" style="margin-top:8px">
        ${others.map(o => {
          const cls = (p.avoidAll||[]).includes(o.id) ? 'selected-avoid-all'
                    : (p.avoidTeam||[]).includes(o.id) ? 'selected-avoid-team' : '';
          return `<button class="player-pick-btn ${cls}" data-avoid="${o.id}">
            <div style="width:20px;height:20px;border-radius:50%;background:#1e293b;border:1.5px solid #475569;display:flex;align-items:center;justify-content:center;font-size:9px">${esc(o.name[0])}</div>
            ${esc(o.name)}
          </button>`;
        }).join('')}
      </div>
    </div>`;

  document.querySelectorAll('#constraint-body [data-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#constraint-body [data-gender]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('#constraint-body [data-pref]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#constraint-body [data-pref]').forEach(b =>
        b.classList.remove('active','active-green','active-purple'));
      btn.classList.add('active');
      if (prefClasses[btn.dataset.pref]) btn.classList.add(prefClasses[btn.dataset.pref]);
    });
  });
  document.querySelectorAll('.avoid-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      constraintAvoidMode = btn.dataset.avoidType;
      document.querySelectorAll('.avoid-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('#constraint-body [data-partner]').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected-partner'));
  });
  document.querySelectorAll('#constraint-body [data-avoid]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.remove('selected-avoid-team','selected-avoid-all');
      if (constraintAvoidMode === 'avoidTeam') btn.classList.toggle('selected-avoid-team');
      else btn.classList.toggle('selected-avoid-all');
    });
  });

  document.getElementById('constraint-overlay').classList.remove('hidden');
}

function closeConstraintModal() {
  document.getElementById('constraint-overlay').classList.add('hidden');
  constraintPlayerId = null;
}

function saveConstraints() {
  if (!constraintPlayerId) return;
  const body     = document.getElementById('constraint-body');
  const gender   = body.querySelector('[data-gender].active')?.dataset.gender || 'M';
  const pref     = body.querySelector('[data-pref].active')?.dataset.pref || 'any';
  const partners  = [...body.querySelectorAll('[data-partner].selected-partner')].map(b => b.dataset.partner);
  const avoidTeam = [...body.querySelectorAll('[data-avoid].selected-avoid-team')].map(b => b.dataset.avoid);
  const avoidAll  = [...body.querySelectorAll('[data-avoid].selected-avoid-all')].map(b => b.dataset.avoid);
  updatePlayer(constraintPlayerId, { gender, matchPreference: pref, partners, avoidTeam, avoidAll });
  closeConstraintModal();
  renderPlayerDB();
  showToast('配對設定已儲存');
}

// ── Payment Page ──────────────────────────────────────
function renderPayment() {
  const session = getOrCreateTodaySession();
  const players = getAllPlayers().filter(p => p.isPresent);

  const slotChips = document.getElementById('slot-chips');
  slotChips.innerHTML = session.slots.map((s, i) => `
    <div class="slot-chip">
      <span class="slot-chip-time">${esc(s.start)}–${esc(s.end)}</span>
      <span class="slot-chip-price">$${s.unitPrice}/人</span>
      <button class="slot-chip-del" data-slot-idx="${i}">✕</button>
    </div>`).join('') || '<span style="color:var(--text-muted);font-size:12px">尚未設定時段</span>';

  slotChips.querySelectorAll('.slot-chip-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.slotIdx);
      const newSlots = session.slots.filter((_, i) => i !== idx);
      const newPlayerSlots = {};
      for (const [pid, indices] of Object.entries(session.playerSlots)) {
        newPlayerSlots[pid] = indices.filter(i => i !== idx).map(i => i > idx ? i - 1 : i);
      }
      updateSession(session.id, { slots: newSlots, playerSlots: newPlayerSlots });
      recalcAllAmounts(session.id);
      renderPayment();
    });
  });

  document.getElementById('discount-2').value = session.discounts[2] ?? '';
  document.getElementById('discount-3').value = session.discounts[3] ?? '';

  const paid   = players.reduce((sum, p) => sum + (session.payments[p.id]?.paid ? (session.payments[p.id]?.amount || 0) : 0), 0);
  const unpaid = players.reduce((sum, p) => sum + (!session.payments[p.id]?.paid ? (session.payments[p.id]?.amount || 0) : 0), 0);
  document.getElementById('pay-summary').innerHTML = `
    <div class="pay-summary-card"><div class="val">${players.length}</div><div class="lbl">出席人數</div></div>
    <div class="pay-summary-card green"><div class="val">$${paid}</div><div class="lbl">已收款</div></div>
    <div class="pay-summary-card red"><div class="val">$${unpaid}</div><div class="lbl">未收款</div></div>
    <div class="pay-summary-card"><div class="val">$${paid + unpaid}</div><div class="lbl">合計</div></div>`;

  const tbody = document.getElementById('pay-table-body');
  tbody.innerHTML = '';

  players.forEach(p => {
    const selectedSlots = session.playerSlots[p.id] || [];
    const payment       = session.payments[p.id];
    const amount        = payment?.amount ?? 0;
    const isPaid        = payment?.paid ?? false;
    const row = document.createElement('div');
    row.className = 'pay-table-row';
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <div class="db-avatar" style="width:28px;height:28px;font-size:11px">${esc(p.name[0])}</div>
        <span>${esc(p.name)}</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${session.slots.map((s, i) =>
          `<span class="slot-tag ${selectedSlots.includes(i) ? 'selected' : ''}" data-pid="${p.id}" data-slot="${i}">${esc(s.start.slice(0,5))}</span>`
        ).join('')}
      </div>
      <div class="amount-val">$${amount}</div>
      <div style="font-size:12px;color:var(--text-secondary)">${p.gamesPlayed} 場</div>
      <div>
        <span class="status-badge ${isPaid ? 'status-badge--paid' : 'status-badge--unpaid'}" data-pid="${p.id}">
          ${isPaid ? '✓ 已付' : '✕ 未付'}
        </span>
      </div>`;
    tbody.appendChild(row);
  });

  tbody.querySelectorAll('.slot-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const pid  = tag.dataset.pid;
      const sidx = Number(tag.dataset.slot);
      const cur  = (session.playerSlots[pid] || []).slice();
      const i    = cur.indexOf(sidx);
      if (i === -1) cur.push(sidx); else cur.splice(i, 1);
      updateSession(session.id, { playerSlots: { ...session.playerSlots, [pid]: cur } });
      recalcAllAmounts(session.id);
      renderPayment();
    });
  });

  tbody.querySelectorAll('.status-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const pid = badge.dataset.pid;
      const cur = session.payments[pid] || { amount: 0, paid: false };
      updateSession(session.id, { payments: { ...session.payments, [pid]: { ...cur, paid: !cur.paid } } });
      renderPayment();
    });
  });
}

// ── History Page ──────────────────────────────────────
function renderHistory() {
  const sessions = getAllSessions();
  const players  = getAllPlayers();
  const games    = loadGames();
  const list     = document.getElementById('history-list');
  if (!list) return;

  list.innerHTML = sessions.length === 0
    ? '<div class="empty-state">尚無歷史紀錄</div>'
    : '';

  sessions.forEach(session => {
    const sessionGames = games.filter(g =>
      new Date(g.startTime).toISOString().slice(0, 10) === session.date
    );
    const attendees = Object.keys(session.playerSlots || {}).length ||
      players.filter(p => p.lastGameEndTime &&
        new Date(p.lastGameEndTime).toISOString().slice(0,10) === session.date
      ).length;
    const slotLabel = session.slots.length
      ? `${session.slots[0].start}–${session.slots[session.slots.length-1].end}（${session.slots.length} 時段）`
      : '未設定時段';

    const getP = id => players.find(p => p.id === id) || { name: '?' };

    const gameRows = sessionGames.map(g => {
      if (!g.result || !g.team1 || !g.team2) return '';
      const winner = g.result === 'team1' ? 1 : g.result === 'team2' ? 2 : 0;
      return `<div class="game-record">
        <span class="game-court-label">場地 ${g.courtId}</span>
        <div class="game-teams">
          <div style="display:flex;gap:4px">
            ${g.team1.map(id => `<span class="game-player ${winner===1?'game-player--won':'game-player--lost'}">${esc(getP(id).name)}</span>`).join('')}
          </div>
          <span style="color:var(--text-muted);font-size:10px;font-weight:700">VS</span>
          <div style="display:flex;gap:4px">
            ${g.team2.map(id => `<span class="game-player ${winner===2?'game-player--won':'game-player--lost'}">${esc(getP(id).name)}</span>`).join('')}
          </div>
        </div>
        <span style="font-size:10px;color:var(--text-muted)">${new Date(g.startTime).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>`;
    }).join('');

    const payRows = Object.entries(session.payments || {}).map(([pid, pay]) => {
      const p = players.find(x => x.id === pid);
      if (!p) return '';
      return `<div class="pay-chip">
        <span style="color:var(--text-secondary)">${esc(p.name)}</span>
        <span style="color:#34d399;font-weight:700">$${pay.amount}</span>
        <span style="font-size:10px;color:${pay.paid?'#22c55e':'#f87171'}">${pay.paid?'✓ 已付':'未付'}</span>
      </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'history-session';
    card.innerHTML = `
      <div class="session-header">
        <span style="font-size:13px;font-weight:700">${esc(session.date)}</span>
        <div class="session-meta">
          <span>🏸 ${sessionGames.length} 場</span>
          <span>👥 ${attendees} 人</span>
          <span>⏱ ${esc(slotLabel)}</span>
        </div>
        <span style="color:var(--text-muted);font-size:12px">▶</span>
      </div>
      <div class="session-body" style="display:none">
        ${gameRows || '<div style="padding:10px 14px;font-size:12px;color:var(--text-muted)">此日無完整場次紀錄</div>'}
        ${payRows ? `<div class="session-payments">${payRows}</div>` : ''}
      </div>`;

    card.querySelector('.session-header').addEventListener('click', () => {
      const body  = card.querySelector('.session-body');
      const arrow = card.querySelector('.session-header span:last-child');
      const open  = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      arrow.textContent  = open ? '▶' : '▼';
    });

    list.appendChild(card);
  });
}

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

  // Player DB
  document.getElementById('db-search')?.addEventListener('input', renderPlayerDB);
  document.getElementById('btn-add-regular')?.addEventListener('click', () => {
    const name = prompt('新增常客姓名：');
    if (!name?.trim()) return;
    const lvl = Number(prompt('等級 (1-20)：', '10'));
    if (!lvl || lvl < 1 || lvl > 20) return;
    addPlayer(name.trim(), lvl, { isPresent: false });
    renderPlayerDB();
    showToast(`已新增：${name.trim()}`);
  });

  // Constraint modal
  document.getElementById('constraint-close')?.addEventListener('click', closeConstraintModal);
  document.getElementById('constraint-cancel')?.addEventListener('click', closeConstraintModal);
  document.getElementById('constraint-save')?.addEventListener('click', saveConstraints);
  document.getElementById('constraint-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConstraintModal();
  });

  // Payment page
  document.getElementById('btn-add-slot')?.addEventListener('click', () => {
    const session = getOrCreateTodaySession();
    const start = document.getElementById('slot-start').value;
    const end   = document.getElementById('slot-end').value;
    const price = Number(document.getElementById('slot-price').value);
    if (!start || !end || !price) return;
    updateSession(session.id, { slots: [...session.slots, { label: `${start}–${end}`, start, end, unitPrice: price }] });
    renderPayment();
  });
  document.getElementById('btn-save-discounts')?.addEventListener('click', () => {
    const session = getOrCreateTodaySession();
    const d2 = Number(document.getElementById('discount-2').value);
    const d3 = Number(document.getElementById('discount-3').value);
    const discounts = {};
    if (d2) discounts[2] = d2;
    if (d3) discounts[3] = d3;
    updateSession(session.id, { discounts });
    recalcAllAmounts(session.id);
    renderPayment();
    showToast('折扣已儲存');
  });

  refresh();
  startTimers();
}

init();
