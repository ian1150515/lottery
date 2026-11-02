import confetti from 'canvas-confetti';
import { CelebrationEffectType } from '../types';

export interface CelebrationEffectDescriptor {
  id: CelebrationEffectType;
  name: string;
  description: string;
  icon: string;
  fire: () => void;
}

/**
 * 1. 雙側加農砲彩帶噴發 (Streamers & Double Cannons)
 */
export function fireStreamersAndCannons() {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;
  const colors = ['#f59e0b', '#fbbf24', '#ef4444', '#dc2626', '#ffffff', '#fb7185', '#eab308'];

  // 中央起始爆發
  confetti({
    particleCount: 90,
    spread: 110,
    origin: { y: 0.6 },
    colors: colors,
    disableForReducedMotion: true,
  });

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 45 * (timeLeft / duration);

    // 左側加農砲
    confetti({
      particleCount,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.75 },
      colors: colors,
      disableForReducedMotion: true,
    });
    // 右側加農砲
    confetti({
      particleCount,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.75 },
      colors: colors,
      disableForReducedMotion: true,
    });
  }, 220);
}

/**
 * 2. 璀璨星辰流金雨 (Golden Star Shower)
 */
export function fireGoldenStars() {
  const duration = 2.8 * 1000;
  const animationEnd = Date.now() + duration;
  const goldColors = ['#FFE066', '#FFD43B', '#FFA94D', '#FFF3BF', '#F59E0B', '#E67700'];

  // 中心星芒大爆發
  confetti({
    particleCount: 100,
    spread: 130,
    startVelocity: 48,
    colors: goldColors,
    origin: { y: 0.45 },
    shapes: ['star', 'circle'],
    scalar: 1.3,
  });

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }
    confetti({
      particleCount: 25,
      angle: 90,
      spread: 90,
      startVelocity: 30,
      origin: { x: Math.random(), y: 0.1 },
      colors: goldColors,
      shapes: ['star'],
      scalar: 1.1,
    });
  }, 300);
}

/**
 * 3. 喜慶禮炮煙火連發 (Fireworks Burst)
 */
export function fireFireworksBurst() {
  const duration = 3.2 * 1000;
  const animationEnd = Date.now() + duration;
  const colors = ['#f43f5e', '#fbbf24', '#38bdf8', '#34d399', '#a855f7', '#fb923c', '#ffffff'];

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    // 隨機在左、中、右多處綻放煙火球
    confetti({
      particleCount: 40,
      startVelocity: 35,
      spread: 360,
      ticks: 70,
      origin: {
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.35,
      },
      colors: colors,
      scalar: 1.1,
      shapes: ['circle', 'square'],
    });
  }, 280);
}

/**
 * 4. 滿堂吉慶落花雨 (Festive Red & Gold Rain)
 */
export function fireFestiveRedRain() {
  const duration = 3.5 * 1000;
  const animationEnd = Date.now() + duration;
  const festiveColors = ['#dc2626', '#b91c1c', '#f59e0b', '#fbbf24', '#ffffff', '#ffd700'];

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    confetti({
      particleCount: 30,
      angle: 90,
      spread: 120,
      startVelocity: 15,
      origin: { x: Math.random(), y: -0.05 },
      colors: festiveColors,
      shapes: ['circle', 'square'],
      gravity: 0.8,
      scalar: 1.2,
      ticks: 200,
    });
  }, 180);
}

/**
 * 5. 祥瑞旋風環形噴發 (Whirlwind Spiral Confetti)
 */
export function fireWhirlwindSpiral() {
  const colors = ['#f59e0b', '#ef4444', '#facc15', '#fb7185', '#ffffff'];
  let currentAngle = 0;
  const totalRounds = 16;
  let count = 0;

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    if (count >= totalRounds) {
      clearInterval(interval);
      return;
    }

    confetti({
      particleCount: 35,
      angle: currentAngle,
      spread: 45,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.55 },
      colors: colors,
      scalar: 1.15,
    });

    currentAngle = (currentAngle + 45) % 360;
    count++;
  }, 100);
}

// 兼容舊導出名稱
export const fireGrandConfetti = fireStreamersAndCannons;

export const CELEBRATION_EFFECTS: CelebrationEffectDescriptor[] = [
  {
    id: 'random',
    name: '隨機精彩輪替 (推薦)',
    description: '每次抽中隨機更換不同喜慶特效，充滿現場驚喜感',
    icon: '🎲',
    fire: () => {
      const candidates = [
        fireStreamersAndCannons,
        fireGoldenStars,
        fireFireworksBurst,
        fireFestiveRedRain,
        fireWhirlwindSpiral,
      ];
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      selected();
    },
  },
  {
    id: 'streamers',
    name: '雙側加農砲彩帶',
    description: '兩側高空加農砲朝中央傾瀉漫天絢爛長帶與金箔',
    icon: '🎊',
    fire: fireStreamersAndCannons,
  },
  {
    id: 'golden_stars',
    name: '璀璨星辰流金雨',
    description: '特獎專屬金色流星與滿地璀璨金幣光芒',
    icon: '⭐',
    fire: fireGoldenStars,
  },
  {
    id: 'fireworks',
    name: '喜慶禮炮煙火彈',
    description: '畫面多點綻放五彩璀璨立體煙火彈',
    icon: '🎆',
    fire: fireFireworksBurst,
  },
  {
    id: 'festive_rain',
    name: '滿堂吉慶落花雨',
    description: '醇厚中國紅與帝國金箔如瀑布般天女散花飄落',
    icon: '🏮',
    fire: fireFestiveRedRain,
  },
  {
    id: 'whirlwind',
    name: '祥瑞旋風環形噴發',
    description: '舞台中央 360 度旋轉環形爆發，視覺震撼力十足',
    icon: '🌀',
    fire: fireWhirlwindSpiral,
  },
];

let lastRandomIndex = -1;

/**
 * 依設定觸發對應的中獎特效
 */
export function triggerCelebrationEffect(mode: CelebrationEffectType | string = 'random'): { name: string; icon: string } {
  if (mode === 'random') {
    const list = CELEBRATION_EFFECTS.filter(e => e.id !== 'random');
    let idx = Math.floor(Math.random() * list.length);
    if (idx === lastRandomIndex) {
      idx = (idx + 1) % list.length;
    }
    lastRandomIndex = idx;
    const effect = list[idx];
    effect.fire();
    return { name: effect.name, icon: effect.icon };
  }

  const found = CELEBRATION_EFFECTS.find(e => e.id === mode);
  if (found) {
    found.fire();
    return { name: found.name, icon: found.icon };
  }

  fireStreamersAndCannons();
  return { name: '雙側加農砲彩帶', icon: '🎊' };
}
