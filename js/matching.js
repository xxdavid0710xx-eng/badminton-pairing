// js/matching.js

/**
 * 計算球員有效級分（加入勝率修正）
 */
export function effectiveLevel(player) {
  const { skillLevel, gamesPlayed, wins } = player;
  if (gamesPlayed < 5) return skillLevel;
  const winRate = wins / gamesPlayed;
  let bonus = 0;
  if (winRate > 0.75) bonus = 1.0;
  else if (winRate > 0.60) bonus = 0.5;
  else if (winRate < 0.40) bonus = -0.5;
  return skillLevel + Math.max(-2, Math.min(2, bonus));
}

/**
 * 判斷 4 人能否組成有效場次（依各球員性別偏好過濾）。
 * 回傳 'male' | 'female' | 'mixed' | 'any' 或 null（偏好無法滿足）。
 */
function validGameType(four) {
  const males   = four.filter(p => p.gender === 'M').length;
  const females = four.filter(p => p.gender === 'F').length;

  for (const p of four) {
    const pref = p.matchPreference || 'any';
    if (pref === 'male'   && males   < 4) return null;
    if (pref === 'female' && females < 4) return null;
    if (pref === 'mixed'  && (males < 2 || females < 2)) return null;
  }

  if (males === 4)   return 'male';
  if (females === 4) return 'female';
  if (males === 2 && females === 2) return 'mixed';
  return 'any';
}

/**
 * 計算隊伍組合的限制懲罰分數。
 * Infinity = 此組合直接排除（avoidAll 衝突）。
 */
function constraintPenalty(team1, team2) {
  const all = [...team1, ...team2];

  // avoidAll：任兩人完全迴避 → 排除整個組合
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if ((a.avoidAll || []).includes(b.id) || (b.avoidAll || []).includes(a.id)) {
        return Infinity;
      }
    }
  }

  let penalty = 0;
  for (const team of [team1, team2]) {
    const [p1, p2] = team;
    // avoidTeam：不該同隊 → 懲罰 +10
    if ((p1.avoidTeam || []).includes(p2.id) || (p2.avoidTeam || []).includes(p1.id)) {
      penalty += 10;
    }
    // partners：優先搭檔同隊 → 獎勵 -1
    if ((p1.partners || []).includes(p2.id) || (p2.partners || []).includes(p1.id)) {
      penalty -= 1;
    }
  }
  return penalty;
}

/**
 * 混雙：只生成每隊 1男1女的合法隊伍組合。
 */
function mixedTeamCombos(four) {
  const males   = four.filter(p => p.gender === 'M');
  const females = four.filter(p => p.gender === 'F');
  if (males.length < 2 || females.length < 2) return [];
  return [
    { team1: [males[0], females[0]], team2: [males[1], females[1]] },
    { team1: [males[0], females[1]], team2: [males[1], females[0]] },
  ];
}

/**
 * 從候選池（至少 4 人）中找出最均衡的 2v2 組合，
 * 套用性別偏好過濾與配對限制懲罰。
 *
 * @param {Object[]} candidates
 * @returns {{ team1: Object[], team2: Object[], diff: number, gameType: string } | null}
 */
export function findBestMatch(candidates) {
  if (candidates.length < 4) return null;

  const pool = candidates.slice(0, 8);
  const n = pool.length;
  let best = null;
  let bestScore = Infinity;

  for (let i = 0; i < n - 3; i++)
  for (let j = i + 1; j < n - 2; j++)
  for (let k = j + 1; k < n - 1; k++)
  for (let l = k + 1; l < n; l++) {
    const four = [pool[i], pool[j], pool[k], pool[l]];
    const gameType = validGameType(four);
    if (!gameType) continue; // 偏好不符，跳過此 4 人組合

    const combos = gameType === 'mixed'
      ? mixedTeamCombos(four)
      : [
          { team1: [four[0], four[1]], team2: [four[2], four[3]] },
          { team1: [four[0], four[2]], team2: [four[1], four[3]] },
          { team1: [four[0], four[3]], team2: [four[1], four[2]] },
        ];

    for (const { team1, team2 } of combos) {
      const penalty = constraintPenalty(team1, team2);
      if (penalty === Infinity) continue;
      const avg1 = (effectiveLevel(team1[0]) + effectiveLevel(team1[1])) / 2;
      const avg2 = (effectiveLevel(team2[0]) + effectiveLevel(team2[1])) / 2;
      const score = Math.abs(avg1 - avg2) + penalty;
      if (score < bestScore) {
        bestScore = score;
        best = { team1, team2, diff: Math.abs(avg1 - avg2), gameType };
      }
    }
  }
  return best;
}
