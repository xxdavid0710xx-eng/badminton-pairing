// js/matching.js

/**
 * 計算球員有效級分（加入勝率修正）
 * @param {Object} player
 * @returns {number}
 */
export function effectiveLevel(player) {
  const { skillLevel, gamesPlayed, wins } = player;
  if (gamesPlayed < 5) return skillLevel;
  const winRate = wins / gamesPlayed;
  let bonus = 0;
  if (winRate > 0.75) bonus = 1.0;
  else if (winRate > 0.60) bonus = 0.5;
  else if (winRate < 0.40) bonus = -0.5;
  bonus = Math.max(-2, Math.min(2, bonus));
  return skillLevel + bonus;
}

/**
 * 從候選池（至少 4 人）中找出最均衡的 2v2 組合。
 * 回傳 { team1: [p, p], team2: [p, p], diff: number } 或 null（人數不足）。
 *
 * @param {Object[]} candidates - 至少 4 人
 * @returns {{ team1: Object[], team2: Object[], diff: number } | null}
 */
export function findBestMatch(candidates) {
  if (candidates.length < 4) return null;

  const pool = candidates.slice(0, 8);
  const n = pool.length;
  let best = null;
  let bestDiff = Infinity;

  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 1; j < n - 2; j++) {
      for (let k = j + 1; k < n - 1; k++) {
        for (let l = k + 1; l < n; l++) {
          const four = [pool[i], pool[j], pool[k], pool[l]];
          const combos = [
            [[four[0], four[1]], [four[2], four[3]]],
            [[four[0], four[2]], [four[1], four[3]]],
            [[four[0], four[3]], [four[1], four[2]]],
          ];
          for (const [t1, t2] of combos) {
            const avg1 = (effectiveLevel(t1[0]) + effectiveLevel(t1[1])) / 2;
            const avg2 = (effectiveLevel(t2[0]) + effectiveLevel(t2[1])) / 2;
            const diff = Math.abs(avg1 - avg2);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = { team1: t1, team2: t2, diff };
            }
          }
        }
      }
    }
  }
  return best;
}
