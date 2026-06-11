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
    pendingLeave: false,
    lastGameEndTime: null,
    // v2 新增
    gender: 'M',
    matchPreference: 'any',   // 'any' | 'male' | 'female' | 'mixed'
    partners: [],              // 優先搭檔 player ID[]
    avoidTeam: [],             // 不同隊 player ID[]
    avoidAll: [],              // 完全迴避 player ID[]
    manualQueuePosition: null, // null = 自動排序
  };
}

export function createGame(courtId, team1, team2) {
  return {
    id: crypto.randomUUID(),
    courtId,
    team1,
    team2,
    startTime: new Date().toISOString(),
    endTime: null,
    result: null,
  };
}

export function createSession(date) {
  return {
    id: crypto.randomUUID(),
    date,           // 'YYYY-MM-DD'
    slots: [],      // [{ label, start, end, unitPrice }]
    discounts: {},  // { 2: price, 3: price, ... }
    playerSlots: {},// { [playerId]: number[] }  slot index 陣列
    payments: {},   // { [playerId]: { amount, paid } }
  };
}
