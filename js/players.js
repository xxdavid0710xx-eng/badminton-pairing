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
  const players = loadPlayers();
  if (!players.some(p => p.id === id)) throw new Error(`Player ${id} not found`);
  savePlayers(players.filter(p => p.id !== id));
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
