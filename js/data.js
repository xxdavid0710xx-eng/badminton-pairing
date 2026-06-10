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
