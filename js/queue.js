// js/queue.js

/**
 * 從出席球員中，排除正在場上的人，
 * 依「場數少優先、等待久優先」排序，回傳等待佇列。
 *
 * @param {Object[]} players
 * @param {string[]} onCourtIds - 目前在場上的球員 ID
 * @returns {Object[]}
 */
export function buildWaitingQueue(players, onCourtIds) {
  return players
    .filter(p => p.isPresent && !p.pendingLeave && !onCourtIds.includes(p.id))
    .sort((a, b) => {
      if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
      const tA = a.lastGameEndTime ? new Date(a.lastGameEndTime).getTime() : 0;
      const tB = b.lastGameEndTime ? new Date(b.lastGameEndTime).getTime() : 0;
      return tA - tB;
    });
}
