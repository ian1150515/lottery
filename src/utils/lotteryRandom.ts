/**
 * Lottery Random Utility
 * 
 * 採用數學上嚴格證實完全均勻（Uniform Permutation）的 Fisher-Yates (Knuth) 洗牌演算法，
 * 搭配瀏覽器安全亂數產生器（Web Crypto API: crypto.getRandomValues），
 * 消除 JavaScript 常見的 `sort(() => 0.5 - Math.random())` 偏差與偽隨機數群聚缺陷，
 * 保證每位候選同仁在每次抽獎中皆具有完全相等且客觀獨立的得獎機率。
 */

/**
 * 取得 [0, max - 1] 範圍內均勻分佈且無模數偏差（modulo bias）的安全隨機整數
 */
export function getSecureRandomInt(max: number): number {
  if (max <= 0) return 0;
  if (max === 1) return 0;

  // 優先使用 Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const uint32 = new Uint32Array(1);
    const maxUint32 = 0xffffffff;
    // 限制在可被 max 整除的上限以徹底排除 modulo bias
    const limit = maxUint32 - (maxUint32 % max);
    
    let rand = 0;
    do {
      window.crypto.getRandomValues(uint32);
      rand = uint32[0];
    } while (rand >= limit);
    
    return rand % max;
  }

  // Fallback (若處於不支援 crypto 的環境)
  return Math.floor(Math.random() * max);
}

/**
 * Fisher-Yates (Knuth) 洗牌演算法 (Durstenfeld 現代版)
 * 時間複雜度 O(n)，數學證明能產生所有 n! 種排列且機率完全均等 (1/n!)
 */
export function fisherYatesShuffle<T>(items: T[]): T[] {
  const result: T[] = [...items];
  const len = result.length;
  
  for (let i = len - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  
  return result;
}

/**
 * 自候選池中公平抽出指定數量的中獎同仁
 * @param candidates 候選清單
 * @param count 欲抽出名額
 * @returns 均勻隨機選出的中獎者清單
 */
export function drawRandomWinners<T>(candidates: T[], count: number): T[] {
  if (!candidates || candidates.length === 0 || count <= 0) {
    return [] as T[];
  }
  const actualCount = Math.min(count, candidates.length);
  const shuffled: T[] = fisherYatesShuffle(candidates);
  return shuffled.slice(0, actualCount);
}

/**
 * 自候選池中公平抽出一位中獎者 (單一抽出 / 缺席補抽)
 */
export function drawSingleWinner<T>(candidates: T[]): T | null {
  if (!candidates || candidates.length === 0) {
    return null;
  }
  const luckyIndex = getSecureRandomInt(candidates.length);
  return candidates[luckyIndex];
}
