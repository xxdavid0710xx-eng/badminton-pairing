// js/game.js
import { loadState, saveState, loadGames, saveGames, loadPlayers, savePlayers } from './storage.js';
import { createGame } from './data.js';

export function getState() {
  return loadState();
}

export function setCourtCount(n) {
  const state = loadState();
  const count = Math.max(1, Math.min(8, n));
  saveState({ ...state, courtCount: count });
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
    const won  = (result === 'team1' && inTeam1) || (result === 'team2' && !inTeam1);
    const lost = (result === 'team1' && !inTeam1) || (result === 'team2' && inTeam1);
    return {
      ...p,
      gamesPlayed: p.gamesPlayed + 1,
      wins:   p.wins   + (won  ? 1 : 0),
      losses: p.losses + (lost ? 1 : 0),
      lastGameEndTime: endTime,
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
