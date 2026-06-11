// js/sessions.js
import { loadSessions, saveSessions } from './storage.js';
import { createSession } from './data.js';

export function getTodaySession() {
  const today = new Date().toISOString().slice(0, 10);
  return loadSessions().find(s => s.date === today) || null;
}

export function getOrCreateTodaySession() {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = loadSessions();
  let session = sessions.find(s => s.date === today);
  if (!session) {
    session = createSession(today);
    sessions.push(session);
    saveSessions(sessions);
  }
  return session;
}

export function updateSession(sessionId, changes) {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) throw new Error(`Session ${sessionId} not found`);
  sessions[idx] = { ...sessions[idx], ...changes };
  saveSessions(sessions);
  return sessions[idx];
}

export function getAllSessions() {
  return loadSessions().slice().reverse(); // 最新在前
}

/** 計算某球員在此 session 應付金額（含多段折扣） */
export function calcPlayerAmount(session, playerId) {
  const indices = session.playerSlots[playerId] || [];
  const count = indices.length;
  if (count === 0) return 0;
  if (session.discounts[count] !== undefined) return session.discounts[count];
  return indices.reduce((sum, i) => sum + (session.slots[i]?.unitPrice || 0), 0);
}

/** 重新計算並儲存所有球員的應付金額（時段或折扣變動後呼叫） */
export function recalcAllAmounts(sessionId) {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  const session = sessions[idx];
  const payments = { ...session.payments };
  for (const pid of Object.keys(session.playerSlots)) {
    const amount = calcPlayerAmount(session, pid);
    payments[pid] = { amount, paid: payments[pid]?.paid ?? false };
  }
  sessions[idx] = { ...session, payments };
  saveSessions(sessions);
  return sessions[idx];
}
