// js/queue.js

/**
 * 從出席球員中，排除正在場上的人，
 * 依手動順序優先、其次「場數少優先、等待久優先」排序，回傳等待佇列。
 *
 * @param {Object[]} players
 * @param {string[]} onCourtIds - 目前在場上的球員 ID
 * @returns {Object[]}
 */
export function buildWaitingQueue(players, onCourtIds) {
  return players
    .filter(p => p.isPresent && !p.pendingLeave && !onCourtIds.includes(p.id))
    .sort((a, b) => {
      // 手動排序優先（manualQueuePosition 不為 null 時使用）
      const aPos = a.manualQueuePosition;
      const bPos = b.manualQueuePosition;
      if (aPos !== null && bPos !== null) return aPos - bPos;
      if (aPos !== null) return -1;
      if (bPos !== null) return 1;
      // 自動排序：場數少優先，同場數則等待時間長優先
      if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed;
      const tA = a.lastGameEndTime ? new Date(a.lastGameEndTime).getTime() : 0;
      const tB = b.lastGameEndTime ? new Date(b.lastGameEndTime).getTime() : 0;
      return tA - tB;
    });
}

/**
 * 根據拖拉後的新順序，更新所有球員的 manualQueuePosition。
 * 不在 orderedIds 中的球員設為 null（恢復自動排序）。
 *
 * @param {Object[]} players - 所有球員陣列
 * @param {string[]} orderedIds - 拖拉後等待區球員的新 ID 順序
 * @returns {Object[]} 更新後的球員陣列（不修改原陣列）
 */
export function applyManualOrder(players, orderedIds) {
  return players.map(p => {
    const pos = orderedIds.indexOf(p.id);
    return pos === -1
      ? { ...p, manualQueuePosition: null }
      : { ...p, manualQueuePosition: pos };
  });
}
