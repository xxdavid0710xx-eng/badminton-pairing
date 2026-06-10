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
